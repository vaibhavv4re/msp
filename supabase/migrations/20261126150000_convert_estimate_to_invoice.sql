create or replace function public.convert_estimate_to_invoice(
  p_estimate_id uuid,
  p_client_id uuid default null,
  p_invoice_number text default null,
  p_invoice_date date default current_date,
  p_bank_account_id uuid default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_estimate public.estimates%rowtype;
  v_invoice_id uuid;
  v_client_id uuid;
  v_item record;
  v_sort integer := 0;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;

  select * into v_estimate
  from public.estimates
  where id = p_estimate_id
  for update;

  if not found then raise exception 'Estimate not found'; end if;
  if not private.has_business_role(v_estimate.business_id, array['owner','admin','accountant','employee']::text[]) then
    raise exception 'Insufficient workspace permissions';
  end if;
  if v_estimate.status = 'converted' or v_estimate.converted_invoice_id is not null then
    raise exception 'This estimate has already been converted';
  end if;
  if v_estimate.status <> 'confirmed' then
    raise exception 'Only confirmed estimates can be converted';
  end if;

  v_client_id := coalesce(p_client_id, v_estimate.client_id);
  if v_client_id is null then raise exception 'Select a client before converting this estimate'; end if;
  if not exists(select 1 from public.clients c where c.id=v_client_id and c.business_id=v_estimate.business_id) then
    raise exception 'Client does not belong to this workspace';
  end if;
  if p_bank_account_id is not null and not exists(select 1 from public.bank_accounts b where b.id=p_bank_account_id and b.business_id=v_estimate.business_id) then
    raise exception 'Bank account does not belong to this workspace';
  end if;
  if nullif(trim(p_invoice_number),'') is null then raise exception 'Invoice number is required'; end if;

  v_invoice_id := gen_random_uuid();
  insert into public.invoices(
    id,business_id,client_id,bank_account_id,source_estimate_id,invoice_number,invoice_date,
    status,subtotal,cgst,sgst,igst,total,notes,terms_and_conditions,created_by
  )
  values(
    v_invoice_id,v_estimate.business_id,v_client_id,p_bank_account_id,v_estimate.id,
    trim(p_invoice_number),coalesce(p_invoice_date,current_date),'Unpaid',
    coalesce(v_estimate.subtotal,0),0,0,0,coalesce(v_estimate.total,0),
    v_estimate.notes,v_estimate.terms_and_conditions,auth.uid()
  );

  for v_item in
    select * from public.estimate_items
    where estimate_id=v_estimate.id and business_id=v_estimate.business_id
    order by sort_order,created_at
  loop
    insert into public.invoice_items(
      business_id,invoice_id,service_id,item_type,description,sac_code,quantity,rate,amount,sort_order
    )
    values(
      v_estimate.business_id,v_invoice_id,v_item.service_id,v_item.item_type,
      v_item.description,v_item.sac_code,v_item.quantity,v_item.rate,v_item.amount,v_sort
    );
    v_sort := v_sort + 1;
  end loop;

  update public.estimates
  set status='converted', converted_invoice_id=v_invoice_id, updated_at=now()
  where id=v_estimate.id and business_id=v_estimate.business_id;

  return v_invoice_id;
end;
$$;

revoke all on function public.convert_estimate_to_invoice(uuid,uuid,text,date,uuid) from public, anon;
grant execute on function public.convert_estimate_to_invoice(uuid,uuid,text,date,uuid) to authenticated;
