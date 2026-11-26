-- Expense ledger persistence and receipt OCR status updates.
create or replace function public.save_expense_with_attachment(
  p_expense jsonb,
  p_attachment jsonb default null
) returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_business_id uuid := (p_expense->>'business_id')::uuid;
  v_expense_id uuid := coalesce(nullif(p_expense->>'id','')::uuid, gen_random_uuid());
  v_attachment_id uuid := nullif(p_attachment->>'id','')::uuid;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if v_business_id is null or not private.has_business_role(v_business_id, array['owner','admin','accountant','employee']::text[]) then
    raise exception 'Not authorized for this workspace';
  end if;
  if coalesce(trim(p_expense->>'category'),'') = '' then raise exception 'Expense category is required'; end if;
  if coalesce((p_expense->>'amount')::numeric,0) < 0 then raise exception 'Expense amount cannot be negative'; end if;

  insert into public.expenses (
    id,business_id,created_by,amount,expense_date,category,description,vendor_name,
    gst_charged,gst_amount,vendor_gstin,itc_review,status,display_id,display_number,
    ocr_status,ocr_suggestions,notes,source,updated_at
  ) values (
    v_expense_id,v_business_id,v_user,coalesce((p_expense->>'amount')::numeric,0),
    nullif(p_expense->>'expense_date','')::date,p_expense->>'category',p_expense->>'description',
    p_expense->>'vendor_name',coalesce((p_expense->>'gst_charged')::boolean,false),
    coalesce((p_expense->>'gst_amount')::numeric,0),p_expense->>'vendor_gstin',
    coalesce(p_expense->>'itc_review','unsure'),'confirmed',p_expense->>'display_id',
    nullif(p_expense->>'display_number','')::integer,coalesce(p_expense->>'ocr_status','idle'),
    p_expense->'ocr_suggestions',p_expense->>'notes',coalesce(p_expense->>'source','manual'),now()
  )
  on conflict (id) do update set
    amount=excluded.amount, expense_date=excluded.expense_date, category=excluded.category,
    description=excluded.description, vendor_name=excluded.vendor_name,
    gst_charged=excluded.gst_charged, gst_amount=excluded.gst_amount,
    vendor_gstin=excluded.vendor_gstin, itc_review=excluded.itc_review,
    display_id=excluded.display_id, display_number=excluded.display_number,
    ocr_status=excluded.ocr_status, ocr_suggestions=excluded.ocr_suggestions,
    notes=excluded.notes, updated_at=now()
  where public.expenses.business_id = v_business_id;

  if not found then raise exception 'Expense not found in this workspace'; end if;

  if v_attachment_id is not null then
    insert into public.attachments (
      id,business_id,expense_id,created_by,attachment_type,public_id,url,file_name,mime_type,created_at
    ) values (
      v_attachment_id,v_business_id,v_expense_id,v_user,'expense_bill',
      p_attachment->>'public_id',p_attachment->>'url',p_attachment->>'file_name',
      p_attachment->>'mime_type',now()
    )
    on conflict (id) do update set
      expense_id=excluded.expense_id,public_id=excluded.public_id,url=excluded.url,
      file_name=excluded.file_name,mime_type=excluded.mime_type
    where public.attachments.business_id=v_business_id;
  end if;
  return v_expense_id;
end;
$$;

create or replace function public.update_expense_ocr(
  p_expense_id uuid,
  p_business_id uuid,
  p_status text,
  p_suggestions jsonb
) returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if auth.uid() is null or not private.has_business_role(p_business_id,array['owner','admin','accountant','employee']::text[]) then
    raise exception 'Not authorized for this workspace';
  end if;
  if p_status not in ('processing','done','failed') then raise exception 'Invalid OCR status'; end if;
  update public.expenses
  set ocr_status=p_status,ocr_suggestions=p_suggestions,updated_at=now()
  where id=p_expense_id and business_id=p_business_id;
  if not found then raise exception 'Expense not found in this workspace'; end if;
end;
$$;
revoke all on function public.save_expense_with_attachment(jsonb,jsonb) from public, anon;
revoke all on function public.update_expense_ocr(uuid,uuid,text,jsonb) from public, anon;
grant execute on function public.save_expense_with_attachment(jsonb,jsonb) to authenticated;
grant execute on function public.update_expense_ocr(uuid,uuid,text,jsonb) to authenticated;
