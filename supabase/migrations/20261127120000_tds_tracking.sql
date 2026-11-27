alter table public.tds_entries
  add column if not exists invoice_id uuid references public.invoices(id) on delete set null,
  add column if not exists tds_section text,
  add column if not exists deduction_date date not null default current_date,
  add column if not exists certificate_reference text;

create index if not exists tds_entries_business_fy_date_idx
  on public.tds_entries (business_id, financial_year, deduction_date desc);
create index if not exists tds_entries_invoice_id_idx
  on public.tds_entries (invoice_id) where invoice_id is not null;

create or replace function public.record_invoice_payment(
  p_invoice_id uuid,
  p_business_id uuid,
  p_cash_amount numeric,
  p_tds_amount numeric,
  p_tds_section text default null
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_invoice public.invoices%rowtype;
  v_new_cash numeric;
  v_new_tds numeric;
  v_status text;
  v_fy text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not private.has_business_role(p_business_id,array['owner','admin','accountant','employee']::text[]) then
    raise exception 'Insufficient workspace permissions';
  end if;
  if p_cash_amount < 0 or p_tds_amount < 0 or (p_cash_amount = 0 and p_tds_amount = 0) then
    raise exception 'Enter a valid payment amount';
  end if;

  select * into v_invoice
  from public.invoices
  where id = p_invoice_id and business_id = p_business_id
  for update;
  if not found then raise exception 'Invoice not found'; end if;

  v_new_cash := coalesce(v_invoice.advance_amount,0) + p_cash_amount;
  v_new_tds := coalesce(v_invoice.tds_amount,0) + p_tds_amount;
  if v_new_cash + v_new_tds >= v_invoice.total - 1 then
    v_status := 'Paid';
  elsif v_new_cash + v_new_tds > 0 then
    v_status := 'Partially Paid';
  else
    v_status := v_invoice.status;
  end if;

  update public.invoices
  set advance_amount = v_new_cash,
      tds_amount = v_new_tds,
      tds_deducted = (v_new_tds > 0),
      is_advance_received = (v_new_cash > 0),
      status = v_status,
      paid_at = case when v_status = 'Paid' then now() else paid_at end,
      updated_at = now()
  where id = p_invoice_id and business_id = p_business_id;

  if p_cash_amount > 0 then
    insert into public.payments(business_id,invoice_id,amount,payment_date,tds_amount,created_by,notes)
    values(p_business_id,p_invoice_id,p_cash_amount,current_date,p_tds_amount,auth.uid(),nullif(p_tds_section,''));
  end if;

  if p_tds_amount > 0 then
    v_fy := case
      when extract(month from current_date) >= 4
        then extract(year from current_date)::int::text || '-' || (extract(year from current_date)::int + 1)::text
      else (extract(year from current_date)::int - 1)::text || '-' || extract(year from current_date)::int::text
    end;
    insert into public.tds_entries(
      business_id,client_id,invoice_id,amount,financial_year,has_certificate,notes,
      created_by,tds_section,deduction_date
    )
    values(
      p_business_id,v_invoice.client_id,p_invoice_id,p_tds_amount,v_fy,false,
      'Auto-recorded from Invoice #' || v_invoice.invoice_number || coalesce(' (' || p_tds_section || ')',''),
      auth.uid(),nullif(p_tds_section,''),current_date
    );
  end if;
end;
$$;

revoke execute on function public.record_invoice_payment(uuid,uuid,numeric,numeric,text) from public, anon;
grant execute on function public.record_invoice_payment(uuid,uuid,numeric,numeric,text) to authenticated;
