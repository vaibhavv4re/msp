-- Persist template selection and JSON content snapshots through the existing item-saving RPCs.
-- The full function bodies intentionally preserve existing workspace checks and item replacement behavior.

create or replace function public.save_estimate_with_items(p_estimate jsonb, p_items jsonb)
returns uuid language plpgsql set search_path to '' as $function$
declare
  v_user_id uuid := auth.uid();
  v_business_id uuid := (p_estimate->>'business_id')::uuid;
  v_estimate_id uuid := nullif(p_estimate->>'id','')::uuid;
  v_role text;
  v_item jsonb;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  select bm.role into v_role from public.business_members bm where bm.business_id=v_business_id and bm.user_id=v_user_id;
  if v_role is null or v_role not in ('owner','admin','accountant','employee') then raise exception 'You do not have permission to manage estimates'; end if;
  if v_estimate_id is null then
    insert into public.estimates(business_id,client_id,estimate_number,estimate_date,valid_until,status,recipient_name,recipient_contact,subtotal,total,notes,terms_and_conditions,advance_intent,requires_advance,advance_percentage,advance_deadline_days,template_id,content_blocks,document_version,created_by)
    values(v_business_id,nullif(p_estimate->>'client_id','')::uuid,coalesce(nullif(p_estimate->>'estimate_number',''),'EST-'||to_char(now(),'YYMMDDHH24MISS')),nullif(p_estimate->>'estimate_date','')::date,nullif(p_estimate->>'valid_until','')::date,p_estimate->>'status',p_estimate->>'recipient_name',nullif(p_estimate->>'recipient_contact',''),coalesce((p_estimate->>'subtotal')::numeric,0),coalesce((p_estimate->>'total')::numeric,0),nullif(p_estimate->>'notes',''),nullif(p_estimate->>'terms_and_conditions',''),coalesce((p_estimate->>'advance_intent')::numeric,0),coalesce((p_estimate->>'requires_advance')::boolean,false),nullif(p_estimate->>'advance_percentage','')::numeric,nullif(p_estimate->>'advance_deadline_days','')::integer,nullif(p_estimate->>'template_id','')::uuid,coalesce(p_estimate->'content_blocks','[]'::jsonb),coalesce(nullif(p_estimate->>'document_version','')::integer,1),v_user_id)
    returning id into v_estimate_id;
  else
    update public.estimates set client_id=nullif(p_estimate->>'client_id','')::uuid,estimate_date=nullif(p_estimate->>'estimate_date','')::date,valid_until=nullif(p_estimate->>'valid_until','')::date,status=p_estimate->>'status',recipient_name=p_estimate->>'recipient_name',recipient_contact=nullif(p_estimate->>'recipient_contact',''),subtotal=coalesce((p_estimate->>'subtotal')::numeric,0),total=coalesce((p_estimate->>'total')::numeric,0),notes=nullif(p_estimate->>'notes',''),terms_and_conditions=nullif(p_estimate->>'terms_and_conditions',''),advance_intent=coalesce((p_estimate->>'advance_intent')::numeric,0),requires_advance=coalesce((p_estimate->>'requires_advance')::boolean,false),advance_percentage=nullif(p_estimate->>'advance_percentage','')::numeric,advance_deadline_days=nullif(p_estimate->>'advance_deadline_days','')::integer,template_id=nullif(p_estimate->>'template_id','')::uuid,content_blocks=coalesce(p_estimate->'content_blocks','[]'::jsonb),document_version=coalesce(nullif(p_estimate->>'document_version','')::integer,1),updated_at=now()
    where id=v_estimate_id and business_id=v_business_id;
    if not found then raise exception 'Estimate not found in this workspace'; end if;
  end if;
  delete from public.estimate_items where estimate_id=v_estimate_id and business_id=v_business_id;
  for v_item in select value from jsonb_array_elements(coalesce(p_items,'[]'::jsonb)) loop
    insert into public.estimate_items(id,business_id,estimate_id,item_type,description,quantity,rate,amount,service_id,sac_code,sort_order)
    values(coalesce(nullif(v_item->>'id','')::uuid,gen_random_uuid()),v_business_id,v_estimate_id,coalesce(v_item->>'item_type','custom'),nullif(v_item->>'description',''),coalesce((v_item->>'quantity')::numeric,0),coalesce((v_item->>'rate')::numeric,0),coalesce((v_item->>'amount')::numeric,0),nullif(v_item->>'service_id','')::uuid,nullif(v_item->>'sac_code',''),coalesce((v_item->>'sort_order')::integer,0));
  end loop;
  return v_estimate_id;
end;
$function$;

create or replace function public.save_invoice_with_items(p_invoice jsonb, p_items jsonb)
returns uuid language plpgsql set search_path to '' as $function$
declare v_id uuid; v_business_id uuid; v_client_id uuid; v_item jsonb; v_idx integer := 0;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 v_business_id:=nullif(p_invoice->>'business_id','')::uuid; v_client_id:=nullif(p_invoice->>'client_id','')::uuid;
 if v_business_id is null then raise exception 'Business is required'; end if;
 if not private.has_business_role(v_business_id,array['owner','admin','accountant','employee']::text[]) then raise exception 'Insufficient workspace permissions'; end if;
 if v_client_id is not null and not exists(select 1 from public.clients c where c.id=v_client_id and c.business_id=v_business_id) then raise exception 'Client does not belong to this workspace'; end if;
 if nullif(p_invoice->>'bank_account_id','') is not null and not exists(select 1 from public.bank_accounts b where b.id=(p_invoice->>'bank_account_id')::uuid and b.business_id=v_business_id) then raise exception 'Bank account does not belong to this workspace'; end if;
 if exists(select 1 from jsonb_array_elements(coalesce(p_invoice->'tax_details','[]'::jsonb)) d where nullif(d->>'tax_rate_id','') is not null and not exists(select 1 from public.tax_rates t where t.id=(d->>'tax_rate_id')::uuid and t.business_id=v_business_id)) then raise exception 'Tax rate does not belong to this workspace'; end if;
 v_id:=coalesce(nullif(p_invoice->>'id','')::uuid,gen_random_uuid());
 if exists(select 1 from public.invoices i where i.id=v_id and i.business_id<>v_business_id) then raise exception 'Invoice belongs to another workspace'; end if;
 insert into public.invoices(id,business_id,client_id,bank_account_id,source_estimate_id,invoice_number,invoice_date,order_number,payment_terms,due_date,subject,status,subtotal,cgst,sgst,igst,total,notes,terms_and_conditions,usage_type,usage_other,usage_duration,usage_geography,usage_exclusivity,advance_amount,is_advance_received,tds_deducted,tds_amount,tax_details,template_id,content_blocks,document_version,created_by)
 values(v_id,v_business_id,v_client_id,nullif(p_invoice->>'bank_account_id','')::uuid,nullif(p_invoice->>'source_estimate_id','')::uuid,p_invoice->>'invoice_number',nullif(p_invoice->>'invoice_date','')::date,nullif(p_invoice->>'order_number',''),nullif(p_invoice->>'payment_terms',''),nullif(p_invoice->>'due_date','')::date,nullif(p_invoice->>'subject',''),coalesce(nullif(p_invoice->>'status',''),'Unpaid'),coalesce((p_invoice->>'subtotal')::numeric,0),coalesce((p_invoice->>'cgst')::numeric,0),coalesce((p_invoice->>'sgst')::numeric,0),coalesce((p_invoice->>'igst')::numeric,0),coalesce((p_invoice->>'total')::numeric,0),nullif(p_invoice->>'notes',''),nullif(p_invoice->>'terms_and_conditions',''),nullif(p_invoice->>'usage_type',''),nullif(p_invoice->>'usage_other',''),nullif(p_invoice->>'usage_duration',''),nullif(p_invoice->>'usage_geography',''),nullif(p_invoice->>'usage_exclusivity',''),coalesce((p_invoice->>'advance_amount')::numeric,0),coalesce((p_invoice->>'is_advance_received')::boolean,false),coalesce((p_invoice->>'tds_deducted')::boolean,false),coalesce((p_invoice->>'tds_amount')::numeric,0),coalesce(p_invoice->'tax_details','[]'::jsonb),nullif(p_invoice->>'template_id','')::uuid,coalesce(p_invoice->'content_blocks','[]'::jsonb),coalesce(nullif(p_invoice->>'document_version','')::integer,1),auth.uid())
 on conflict(id) do update set client_id=excluded.client_id,bank_account_id=excluded.bank_account_id,invoice_number=excluded.invoice_number,invoice_date=excluded.invoice_date,order_number=excluded.order_number,payment_terms=excluded.payment_terms,due_date=excluded.due_date,subject=excluded.subject,status=excluded.status,subtotal=excluded.subtotal,cgst=excluded.cgst,sgst=excluded.sgst,igst=excluded.igst,total=excluded.total,notes=excluded.notes,terms_and_conditions=excluded.terms_and_conditions,usage_type=excluded.usage_type,usage_other=excluded.usage_other,usage_duration=excluded.usage_duration,usage_geography=excluded.usage_geography,usage_exclusivity=excluded.usage_exclusivity,advance_amount=excluded.advance_amount,is_advance_received=excluded.is_advance_received,tds_deducted=excluded.tds_deducted,tds_amount=excluded.tds_amount,tax_details=excluded.tax_details,template_id=excluded.template_id,content_blocks=excluded.content_blocks,document_version=excluded.document_version,updated_at=now()
 where public.invoices.business_id=v_business_id;
 delete from public.invoice_items where invoice_id=v_id and business_id=v_business_id;
 for v_item in select value from jsonb_array_elements(coalesce(p_items,'[]'::jsonb)) loop
  if nullif(v_item->>'service_id','') is not null and not exists(select 1 from public.services s where s.id=(v_item->>'service_id')::uuid and s.business_id=v_business_id) then raise exception 'Service does not belong to this workspace'; end if;
  insert into public.invoice_items(id,business_id,invoice_id,service_id,item_type,description,sac_code,quantity,rate,amount,sort_order)
  values(coalesce(nullif(v_item->>'id','')::uuid,gen_random_uuid()),v_business_id,v_id,nullif(v_item->>'service_id','')::uuid,nullif(v_item->>'item_type',''),nullif(v_item->>'description',''),nullif(v_item->>'sac_code',''),coalesce((v_item->>'quantity')::numeric,0),coalesce((v_item->>'rate')::numeric,0),coalesce((v_item->>'amount')::numeric,0),v_idx);
  v_idx:=v_idx+1;
 end loop;
 return v_id;
end;
$function$;
