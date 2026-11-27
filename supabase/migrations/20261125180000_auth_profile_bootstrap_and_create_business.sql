-- Provision a profile for every new Supabase Auth user and provide an atomic
-- business + owner-membership bootstrap RPC.
--
-- This migration intentionally does not alter existing business RLS policies.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(
      nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
      nullif(btrim(new.raw_user_meta_data ->> 'name'), '')
    ),
    nullif(btrim(new.raw_user_meta_data ->> 'avatar_url'), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill profiles for Auth users that predate this trigger.
insert into public.profiles (id, full_name, avatar_url)
select
  u.id,
  coalesce(
    nullif(btrim(u.raw_user_meta_data ->> 'full_name'), ''),
    nullif(btrim(u.raw_user_meta_data ->> 'name'), '')
  ),
  nullif(btrim(u.raw_user_meta_data ->> 'avatar_url'), '')
from auth.users u
on conflict (id) do nothing;

create or replace function public.create_business(
  p_name text,
  p_legal_name text default null,
  p_business_type text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_business_id uuid;
  v_name text := nullif(btrim(p_name), '');
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if v_name is null then
    raise exception 'Business name is required' using errcode = '22023';
  end if;

  if char_length(v_name) > 160 then
    raise exception 'Business name must be 160 characters or fewer' using errcode = '22023';
  end if;

  insert into public.businesses (name, legal_name, business_type, created_by)
  values (
    v_name,
    nullif(btrim(p_legal_name), ''),
    nullif(btrim(p_business_type), ''),
    v_user_id
  )
  returning id into v_business_id;

  insert into public.business_members (business_id, user_id, role, invited_by)
  values (v_business_id, v_user_id, 'owner', v_user_id);

  return v_business_id;
end;
$$;

revoke all on function public.create_business(text, text, text) from public, anon;
grant execute on function public.create_business(text, text, text) to authenticated;

comment on function public.create_business(text, text, text)
  is 'Atomically creates a business and assigns the authenticated caller as its owner.';
