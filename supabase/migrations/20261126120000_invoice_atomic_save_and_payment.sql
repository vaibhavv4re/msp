create or replace function public.save_invoice_with_items(p_invoice jsonb, p_items jsonb)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare v_id uuid; v_business_id uuid; v_client_id uuid; v_item jsonb; v_idx integer := 0;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 v_business_id := nullif(p_invoice->>'business_id','')::uuid;
 v_client_id := nullif(p_invoice->>'client_id','')::uuid;
 if v_business_id is null then raise exception 'Business is required'; end if;
 if not private.has_business_role(v_business_id,array['owner','admin','accountant','employee']::text[]) then raise exception 'Insufficient workspace permissions'; end if;
 if v_client_id is not null and not exists(select 1 from public.clients c where c.id=v_client_id and c.business_id=v_business_id) then raise exception 'Client does not belong to this workspace'; end if;
 if nullif(p_invoice->>'bank_account_id','') is not null and not exists(select 1 from public.bank_accounts b where b.id=(p_invoice->>'bank_account_id')::uuid and b.business_id=v_business_id) then raise exception 'Bank account does not belong to this workspace'; end if;
 v_id:=coalesce(nullif(p_invoice->>'id','')::uuid,gen_random_uuid());
 if exists(select 1 from public.invoices i where i.id=v_id and i.business_id<>v_business_id) then raise exception 'Invoice belongs to another workspace'; end if;
 insert into public.invoices(id,business_id,client_id,bank_account_id,source_estimate_id,invoice_number,invoice_date,order_number,payment_terms,due_date,subject,status,subtotal,cgst,sgst,igst,total,notes,terms_and_conditions,usage_type,usage_other,usage_duration,usage_geography,usage_exclusivity,advance_amount,is_advance_received,tds_deducted,tds_amount,created_by)
 values(v_id,v_business_id,v_client_id,nullif(p_invoice->>'bank_account_id','')::uuid,nullif(p_invoice->>'source_estimate_id','')::uuid,p_invoice->>'invoice_number',nullif(p_invoice->>'invoice_date','')::date,nullif(p_invoice->>'order_number',''),nullif(p_invoice->>'payment_terms',''),nullif(p_invoice->>'due_date','')::date,nullif(p_invoice->>'subject',''),coalesce(nullif(p_invoice->>'status',''),'Unpaid'),coalesce((p_invoice->>'subtotal')::numeric,0),coalesce((p_invoice->>'cgst')::numeric,0),coalesce((p_invoice->>'sgst')::numeric,0),coalesce((p_invoice->>'igst')::numeric,0),coalesce((p_invoice->>'total')::numeric,0),nullif(p_invoice->>'notes',''),nullif(p_invoice->>'terms_and_conditions',''),nullif(p_invoice->>'usage_type',''),nullif(p_invoice->>'usage_other',''),nullif(p_invoice->>'usage_duration',''),nullif(p_invoice->>'usage_geography',''),nullif(p_invoice->>'usage_exclusivity',''),coalesce((p_invoice->>'advance_amount')::numeric,0),coalesce((p_invoice->>'is_advance_received')::boolean,false),coalesce((p_invoice->>'tds_deducted')::boolean,false),coalesce((p_invoice->>'tds_amount')::numeric,0),auth.uid())
 on conflict(id) do update set client_id=excluded.client_id,bank_account_id=excluded.bank_account_id,invoice_number=excluded.invoice_number,invoice_date=excluded.invoice_date,order_number=excluded.order_number,payment_terms=excluded.payment_terms,due_date=excluded.due_date,subject=excluded.subject,status=excluded.status,subtotal=excluded.subtotal,cgst=excluded.cgst,sgst=excluded.sgst,igst=excluded.igst,total=excluded.total,notes=excluded.notes,terms_and_conditions=excluded.terms_and_conditions,usage_type=excluded.usage_type,usage_other=excluded.usage_other,usage_duration=excluded.usage_duration,usage_geography=excluded.usage_geography,usage_exclusivity=excluded.usage_exclusivity,advance_amount=excluded.advance_amount,is_advance_received=excluded.is_advance_received,tds_deducted=excluded.tds_deducted,tds_amount=excluded.tds_amount,updated_at=now()
 where public.invoices.business_id=v_business_id;
 delete from public.invoice_items where invoice_id=v_id and business_id=v_business_id;
 for v_item in select value from jsonb_array_elements(coalesce(p_items,'[]'::jsonb)) loop
  if nullif(v_item->>'service_id','') is not null and not exists(select 1 from public.services s where s.id=(v_item->>'service_id')::uuid and s.business_id=v_business_id) then raise exception 'Service does not belong to this workspace'; end if;
  insert into public.invoice_items(id,business_id,invoice_id,service_id,item_type,description,sac_code,quantity,rate,amount,sort_order)
  values(coalesce(nullif(v_item->>'id','')::uuid,gen_random_uuid()),v_business_id,v_id,nullif(v_item->>'service_id','')::uuid,nullif(v_item->>'item_type',''),nullif(v_item->>'description',''),nullif(v_item->>'sac_code',''),coalesce((v_item->>'quantity')::numeric,0),coalesce((v_item->>'rate')::numeric,0),coalesce((v_item->>'amount')::numeric,0),v_idx);
  v_idx:=v_idx+1;
 end loop;
 return v_id;
end; $$;
revoke execute on function public.save_invoice_with_items(jsonb,jsonb) from public,anon;
grant execute on function public.save_invoice_with_items(jsonb,jsonb) to authenticated;

create or replace function public.record_invoice_payment(p_invoice_id uuid,p_business_id uuid,p_cash_amount numeric,p_tds_amount numeric,p_tds_section text default null)
returns void language plpgsql security invoker set search_path = '' as $$
declare v_invoice public.invoices%rowtype; v_new_cash numeric; v_new_tds numeric; v_status text; v_fy text;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 if not private.has_business_role(p_business_id,array['owner','admin','accountant','employee']::text[]) then raise exception 'Insufficient workspace permissions'; end if;
 if p_cash_amount<0 or p_tds_amount<0 or (p_cash_amount=0 and p_tds_amount=0) then raise exception 'Enter a valid payment amount'; end if;
 select * into v_invoice from public.invoices where id=p_invoice_id and business_id=p_business_id for update;
 if not found then raise exception 'Invoice not found'; end if;
 v_new_cash:=coalesce(v_invoice.advance_amount,0)+p_cash_amount; v_new_tds:=coalesce(v_invoice.tds_amount,0)+p_tds_amount;
 if v_new_cash+v_new_tds>=v_invoice.total-1 then v_status:='Paid'; elsif v_new_cash+v_new_tds>0 then v_status:='Partially Paid'; else v_status:=v_invoice.status; end if;
 update public.invoices set advance_amount=v_new_cash,tds_amount=v_new_tds,tds_deducted=(v_new_tds>0),is_advance_received=(v_new_cash>0),status=v_status,paid_at=case when v_status='Paid' then now() else paid_at end,updated_at=now() where id=p_invoice_id and business_id=p_business_id;
 if p_cash_amount>0 then insert into public.payments(business_id,invoice_id,amount,payment_date,tds_amount,created_by,notes) values(p_business_id,p_invoice_id,p_cash_amount,current_date,p_tds_amount,auth.uid(),nullif(p_tds_section,'')); end if;
 if p_tds_amount>0 then
  v_fy:=case when extract(month from current_date)>=4 then extract(year from current_date)::int::text||'-'||(extract(year from current_date)::int+1)::text else (extract(year from current_date)::int-1)::text||'-'||extract(year from current_date)::int::text end;
  insert into public.tds_entries(business_id,client_id,amount,financial_year,has_certificate,notes,created_by) values(p_business_id,v_invoice.client_id,p_tds_amount,v_fy,false,'Auto-recorded from Invoice #'||v_invoice.invoice_number||coalesce(' ('||p_tds_section||')',''),auth.uid());
 end if;
end; $$;
revoke execute on function public.record_invoice_payment(uuid,uuid,numeric,numeric,text) from public,anon;
grant execute on function public.record_invoice_payment(uuid,uuid,numeric,numeric,text) to authenticated;
