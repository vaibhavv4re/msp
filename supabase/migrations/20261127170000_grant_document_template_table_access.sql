-- RLS policies govern row visibility and writes; authenticated also needs table privileges.
grant select, insert, update, delete on table public.document_templates to authenticated;
grant select, insert, update, delete on table public.document_template_blocks to authenticated;
