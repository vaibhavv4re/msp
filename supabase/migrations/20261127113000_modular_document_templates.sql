-- Modular document foundation for estimates/proposals and invoices.
-- Legacy columns remain intact; content_blocks is additive and backwards compatible.

create table if not exists public.document_templates (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  description text,
  document_type text not null check (document_type in ('estimate','invoice','both')),
  is_default boolean not null default false,
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, business_id)
);

create index if not exists document_templates_business_type_idx
  on public.document_templates(business_id, document_type, is_active);

create table if not exists public.document_template_blocks (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null,
  business_id uuid not null,
  block_key text not null,
  block_type text not null,
  title text not null,
  default_content jsonb not null default '{}'::jsonb,
  is_enabled boolean not null default true,
  is_required boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint document_template_blocks_template_fk
    foreign key (template_id, business_id)
    references public.document_templates(id, business_id) on delete cascade,
  unique (template_id, block_key)
);

create index if not exists document_template_blocks_order_idx
  on public.document_template_blocks(template_id, sort_order);

alter table public.estimates
  add column if not exists template_id uuid,
  add column if not exists content_blocks jsonb not null default '[]'::jsonb,
  add column if not exists document_version integer not null default 1;

alter table public.invoices
  add column if not exists template_id uuid,
  add column if not exists content_blocks jsonb not null default '[]'::jsonb,
  add column if not exists document_version integer not null default 1;

alter table public.estimates
  add constraint estimates_template_business_fk
  foreign key (template_id, business_id)
  references public.document_templates(id, business_id) on delete restrict;

alter table public.invoices
  add constraint invoices_template_business_fk
  foreign key (template_id, business_id)
  references public.document_templates(id, business_id) on delete restrict;

alter table public.document_templates enable row level security;
alter table public.document_template_blocks enable row level security;

create policy "Workspace members can read document templates"
on public.document_templates for select to authenticated
using (exists (
  select 1 from public.business_members bm
  where bm.business_id = document_templates.business_id
    and bm.user_id = auth.uid()
));

create policy "Workspace editors can manage document templates"
on public.document_templates for all to authenticated
using (exists (
  select 1 from public.business_members bm
  where bm.business_id = document_templates.business_id
    and bm.user_id = auth.uid()
    and bm.role in ('owner','admin','accountant','employee')
))
with check (exists (
  select 1 from public.business_members bm
  where bm.business_id = document_templates.business_id
    and bm.user_id = auth.uid()
    and bm.role in ('owner','admin','accountant','employee')
));

create policy "Workspace members can read document template blocks"
on public.document_template_blocks for select to authenticated
using (exists (
  select 1 from public.business_members bm
  where bm.business_id = document_template_blocks.business_id
    and bm.user_id = auth.uid()
));

create policy "Workspace editors can manage document template blocks"
on public.document_template_blocks for all to authenticated
using (exists (
  select 1 from public.business_members bm
  where bm.business_id = document_template_blocks.business_id
    and bm.user_id = auth.uid()
    and bm.role in ('owner','admin','accountant','employee')
))
with check (exists (
  select 1 from public.business_members bm
  where bm.business_id = document_template_blocks.business_id
    and bm.user_id = auth.uid()
    and bm.role in ('owner','admin','accountant','employee')
));
