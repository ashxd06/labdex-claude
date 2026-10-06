-- Categorías jerárquicas, referencias de conocimiento y edición segura.
alter table public.categories
  add column if not exists parent_id uuid references public.categories(id) on delete set null;

alter table public.microorganisms
  add column if not exists antimicrobial_resistance text,
  add column if not exists source_references text;

alter table public.culture_media add column if not exists source_references text;
alter table public.laboratory_tests add column if not exists source_references text;
alter table public.procedures add column if not exists source_references text;
alter table public.clinical_analyses add column if not exists source_references text;

insert into public.categories (name, slug, description, icon, type, display_order, is_active, status)
values (
  'Microbiología', 'microbiologia',
  'Clasificación de microorganismos y áreas de microbiología clínica.',
  'microscope', 'microbiologia', 0, true, 'published'
)
on conflict (slug) do nothing;

update public.categories child
set parent_id = parent.id
from public.categories parent
where child.slug = 'bacterias-gram-positivas'
  and parent.slug = 'microbiologia'
  and child.parent_id is null;

create table if not exists public.content_drafts (
  id uuid primary key default gen_random_uuid(),
  resource_key text not null check (resource_key in (
    'categories', 'microorganisms', 'culture_media', 'laboratory_tests',
    'procedures', 'clinical_analyses', 'documents'
  )),
  record_id uuid not null,
  payload jsonb not null default '{}'::jsonb,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (resource_key, record_id)
);

alter table public.content_drafts enable row level security;
revoke all on public.content_drafts from anon, authenticated;
grant select, insert, update, delete on public.content_drafts to authenticated;

drop policy if exists "content_drafts_admin_all" on public.content_drafts;
create policy "content_drafts_admin_all"
  on public.content_drafts for all
  to authenticated
  using (public.is_admin((select auth.uid())))
  with check (public.is_admin((select auth.uid())));
