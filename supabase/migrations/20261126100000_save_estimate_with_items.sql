create or replace function public.save_estimate_with_items(p_estimate jsonb, p_items jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
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
    insert into public.estimates (business_id,client_id,estimate_number,estimate_date,valid_until,status,recipient_name,recipient_contact,subtotal,total,notes,terms_and_conditions,advance_intent,requires_advance,advance_percentage,advance_deadline_days,created_by)
    values (v_business_id,nullif(p_estimate->>'client_id','')::uuid,coalesce(nullif(p_estimate->>'estimate_number',''),'EST-'||to_char(now(),'YYMMDDHH24MISS')),nullif(p_estimate->>'estimate_date','')::date,nullif(p_estimate->>'valid_until','')::date,p_estimate->>'status',p_estimate->>'recipient_name',nullif(p_estimate->>'recipient_contact',''),coalesce((p_estimate->>'subtotal')::numeric,0),coalesce((p_estimate->>'total')::numeric,0),nullif(p_estimate->>'notes',''),nullif(p_estimate->>'terms_and_conditions',''),coalesce((p_estimate->>'advance_intent')::numeric,0),coalesce((p_estimate->>'requires_advance')::boolean,false),nullif(p_estimate->>'advance_percentage','')::numeric,nullif(p_estimate->>'advance_deadline_days','')::integer,v_user_id) returning id into v_estimate_id;
  else
    update public.estimates set client_id=nullif(p_estimate->>'client_id','')::uuid,estimate_date=nullif(p_estimate->>'estimate_date','')::date,valid_until=nullif(p_estimate->>'valid_until','')::date,status=p_estimate->>'status',recipient_name=p_estimate->>'recipient_name',recipient_contact=nullif(p_estimate->>'recipient_contact',''),subtotal=coalesce((p_estimate->>'subtotal')::numeric,0),total=coalesce((p_estimate->>'total')::numeric,0),notes=nullif(p_estimate->>'notes',''),terms_and_conditions=nullif(p_estimate->>'terms_and_conditions',''),advance_intent=coalesce((p_estimate->>'advance_intent')::numeric,0),requires_advance=coalesce((p_estimate->>'requires_advance')::boolean,false),advance_percentage=nullif(p_estimate->>'advance_percentage','')::numeric,advance_deadline_days=nullif(p_estimate->>'advance_deadline_days','')::integer,updated_at=now()
    where id=v_estimate_id and business_id=v_business_id;
    if not found then raise exception 'Estimate not found in this workspace'; end if;
  end if;
  delete from public.estimate_items where estimate_id=v_estimate_id and business_id=v_business_id;
  for v_item in select value from jsonb_array_elements(coalesce(p_items,'[]'::jsonb)) loop
    insert into public.estimate_items (id,business_id,estimate_id,item_type,description,quantity,rate,amount,service_id,sac_code,sort_order)
    values (coalesce(nullif(v_item->>'id','')::uuid,gen_random_uuid()),v_business_id,v_estimate_id,coalesce(v_item->>'item_type','custom'),nullif(v_item->>'description',''),coalesce((v_item->>'quantity')::numeric,0),coalesce((v_item->>'rate')::numeric,0),coalesce((v_item->>'amount')::numeric,0),nullif(v_item->>'service_id','')::uuid,nullif(v_item->>'sac_code',''),coalesce((v_item->>'sort_order')::integer,0));
  end loop;
  return v_estimate_id;
end;
$$;
revoke all on function public.save_estimate_with_items(jsonb,jsonb) from public,anon;
grant execute on function public.save_estimate_with_items(jsonb,jsonb) to authenticated;
