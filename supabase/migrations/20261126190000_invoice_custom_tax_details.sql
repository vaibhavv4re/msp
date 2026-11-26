alter table public.invoices add column if not exists tax_details jsonb not null default '[]'::jsonb;
