-- =============================================================================
-- LABDEX — Fase 2: base de conocimiento
-- =============================================================================
-- Ejecutar DESPUÉS de supabase/schema.sql (Fase 1), en el SQL Editor de
-- Supabase. Este archivo es idempotente: puede volver a ejecutarse sin
-- duplicar objetos.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0. Utilidades comunes
-- -----------------------------------------------------------------------------

-- Estado editorial de un registro de contenido. `is_active` (booleano) ya
-- cubre "publicado / oculto"; este enum queda preparado para cuando se
-- necesite distinguir borrador/archivado sin romper lo ya construido.
do $$
begin
  if not exists (select 1 from pg_type where typname = 'content_status') then
    create type public.content_status as enum ('draft', 'published', 'archived');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'microorganism_kind') then
    create type public.microorganism_kind as enum ('bacteria', 'hongo', 'virus', 'parasito');
  end if;
end $$;

-- Reutiliza public.handle_updated_at() y public.is_admin(uuid), creados en
-- schema.sql de la Fase 1.

-- -----------------------------------------------------------------------------
-- 1. categories
-- -----------------------------------------------------------------------------
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  icon text,                      -- nombre de icono lucide-react, ej. "microscope"
  type text,                      -- agrupador libre, ej. "microbiologia"
  display_order integer not null default 0,
  is_active boolean not null default true,
  status public.content_status not null default 'published',
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_categories_updated_at on public.categories;
create trigger set_categories_updated_at
  before update on public.categories
  for each row execute function public.handle_updated_at();

-- -----------------------------------------------------------------------------
-- 2. microorganisms
-- -----------------------------------------------------------------------------
create table if not exists public.microorganisms (
  id uuid primary key default gen_random_uuid(),
  scientific_name text not null,
  common_name text,
  slug text not null unique,
  kind public.microorganism_kind not null,
  category_id uuid references public.categories (id) on delete set null,

  description text,
  classification text,
  morphology text,
  gram_stain text,
  shape text,
  arrangement text,
  oxygen_requirement text,
  motility text,
  spore_formation text,
  culture text,
  pathogenicity text,
  clinical_importance text,
  transmission text,
  diagnosis text,
  prevention text,

  microscopy_image_path text,     -- ruta dentro del bucket microorganism-images
  culture_image_path text,

  is_sample_data boolean not null default false,
  is_active boolean not null default true,
  status public.content_status not null default 'published',

  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists microorganisms_kind_idx on public.microorganisms (kind);
create index if not exists microorganisms_category_idx on public.microorganisms (category_id);

drop trigger if exists set_microorganisms_updated_at on public.microorganisms;
create trigger set_microorganisms_updated_at
  before update on public.microorganisms
  for each row execute function public.handle_updated_at();

-- -----------------------------------------------------------------------------
-- 3. culture_media
-- -----------------------------------------------------------------------------
create table if not exists public.culture_media (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  type text,
  purpose text,
  principle text,
  composition text,
  preparation text,
  incubation text,
  interpretation text,
  quality_control text,
  is_sample_data boolean not null default false,
  is_active boolean not null default true,
  status public.content_status not null default 'published',
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_culture_media_updated_at on public.culture_media;
create trigger set_culture_media_updated_at
  before update on public.culture_media
  for each row execute function public.handle_updated_at();

-- -----------------------------------------------------------------------------
-- 4. laboratory_tests
-- -----------------------------------------------------------------------------
create table if not exists public.laboratory_tests (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  category_id uuid references public.categories (id) on delete set null,
  description text,
  principle text,
  sample_type text,
  reagents text,
  materials text,
  procedure text,
  interpretation text,
  is_sample_data boolean not null default false,
  is_active boolean not null default true,
  status public.content_status not null default 'published',
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_laboratory_tests_updated_at on public.laboratory_tests;
create trigger set_laboratory_tests_updated_at
  before update on public.laboratory_tests
  for each row execute function public.handle_updated_at();

-- -----------------------------------------------------------------------------
-- 5. procedures
-- -----------------------------------------------------------------------------
create table if not exists public.procedures (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  category_id uuid references public.categories (id) on delete set null,
  description text,
  objective text,
  sample text,
  materials text,
  reagents text,
  procedure text,
  precautions text,
  interpretation text,
  is_sample_data boolean not null default false,
  is_active boolean not null default true,
  status public.content_status not null default 'published',
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_procedures_updated_at on public.procedures;
create trigger set_procedures_updated_at
  before update on public.procedures
  for each row execute function public.handle_updated_at();

-- -----------------------------------------------------------------------------
-- 6. clinical_analyses
-- -----------------------------------------------------------------------------
create table if not exists public.clinical_analyses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  category_id uuid references public.categories (id) on delete set null,
  description text,
  sample_type text,
  method text,
  principle text,
  unit text,
  reference_range text,
  calculation text,
  interpretation text,
  is_sample_data boolean not null default false,
  is_active boolean not null default true,
  status public.content_status not null default 'published',
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_clinical_analyses_updated_at on public.clinical_analyses;
create trigger set_clinical_analyses_updated_at
  before update on public.clinical_analyses
  for each row execute function public.handle_updated_at();

-- -----------------------------------------------------------------------------
-- 7. documents
-- -----------------------------------------------------------------------------
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  description text,
  category text,
  file_path text,                 -- ruta dentro del bucket "documents"
  file_type text,
  source text,
  is_active boolean not null default true,
  status public.content_status not null default 'published',
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_documents_updated_at on public.documents;
create trigger set_documents_updated_at
  before update on public.documents
  for each row execute function public.handle_updated_at();

-- -----------------------------------------------------------------------------
-- 8. Tablas de relación
-- -----------------------------------------------------------------------------
create table if not exists public.microorganism_media (
  microorganism_id uuid not null references public.microorganisms (id) on delete cascade,
  media_id uuid not null references public.culture_media (id) on delete cascade,
  notes text,
  primary key (microorganism_id, media_id)
);

create table if not exists public.microorganism_tests (
  microorganism_id uuid not null references public.microorganisms (id) on delete cascade,
  test_id uuid not null references public.laboratory_tests (id) on delete cascade,
  result_expected text,
  notes text,
  primary key (microorganism_id, test_id)
);

create table if not exists public.microorganism_procedures (
  microorganism_id uuid not null references public.microorganisms (id) on delete cascade,
  procedure_id uuid not null references public.procedures (id) on delete cascade,
  notes text,
  primary key (microorganism_id, procedure_id)
);

-- =============================================================================
-- 9. Row Level Security
-- =============================================================================
-- Regla general para TODO el contenido de la base de conocimiento:
--   - Cualquiera (anon o authenticated) puede LEER filas activas/publicadas.
--   - Solo un admin (public.is_admin) puede INSERT / UPDATE / DELETE.
-- Esto se aplica de forma idéntica en cada tabla para que ningún módulo se
-- quede desprotegido por descuido.

alter table public.categories enable row level security;
alter table public.microorganisms enable row level security;
alter table public.culture_media enable row level security;
alter table public.laboratory_tests enable row level security;
alter table public.procedures enable row level security;
alter table public.clinical_analyses enable row level security;
alter table public.documents enable row level security;
alter table public.microorganism_media enable row level security;
alter table public.microorganism_tests enable row level security;
alter table public.microorganism_procedures enable row level security;

-- --- categories ---------------------------------------------------------------
drop policy if exists "categories_public_read" on public.categories;
create policy "categories_public_read"
  on public.categories for select
  to anon, authenticated
  using (is_active = true or public.is_admin((select auth.uid())));

drop policy if exists "categories_admin_write" on public.categories;
create policy "categories_admin_write"
  on public.categories for all
  to authenticated
  using (public.is_admin((select auth.uid())))
  with check (public.is_admin((select auth.uid())));

-- --- microorganisms -------------------------------------------------------------
drop policy if exists "microorganisms_public_read" on public.microorganisms;
create policy "microorganisms_public_read"
  on public.microorganisms for select
  to anon, authenticated
  using (is_active = true or public.is_admin((select auth.uid())));

drop policy if exists "microorganisms_admin_write" on public.microorganisms;
create policy "microorganisms_admin_write"
  on public.microorganisms for all
  to authenticated
  using (public.is_admin((select auth.uid())))
  with check (public.is_admin((select auth.uid())));

-- --- culture_media -------------------------------------------------------------
drop policy if exists "culture_media_public_read" on public.culture_media;
create policy "culture_media_public_read"
  on public.culture_media for select
  to anon, authenticated
  using (is_active = true or public.is_admin((select auth.uid())));

drop policy if exists "culture_media_admin_write" on public.culture_media;
create policy "culture_media_admin_write"
  on public.culture_media for all
  to authenticated
  using (public.is_admin((select auth.uid())))
  with check (public.is_admin((select auth.uid())));

-- --- laboratory_tests -------------------------------------------------------------
drop policy if exists "laboratory_tests_public_read" on public.laboratory_tests;
create policy "laboratory_tests_public_read"
  on public.laboratory_tests for select
  to anon, authenticated
  using (is_active = true or public.is_admin((select auth.uid())));

drop policy if exists "laboratory_tests_admin_write" on public.laboratory_tests;
create policy "laboratory_tests_admin_write"
  on public.laboratory_tests for all
  to authenticated
  using (public.is_admin((select auth.uid())))
  with check (public.is_admin((select auth.uid())));

-- --- procedures -------------------------------------------------------------
drop policy if exists "procedures_public_read" on public.procedures;
create policy "procedures_public_read"
  on public.procedures for select
  to anon, authenticated
  using (is_active = true or public.is_admin((select auth.uid())));

drop policy if exists "procedures_admin_write" on public.procedures;
create policy "procedures_admin_write"
  on public.procedures for all
  to authenticated
  using (public.is_admin((select auth.uid())))
  with check (public.is_admin((select auth.uid())));

-- --- clinical_analyses -------------------------------------------------------------
drop policy if exists "clinical_analyses_public_read" on public.clinical_analyses;
create policy "clinical_analyses_public_read"
  on public.clinical_analyses for select
  to anon, authenticated
  using (is_active = true or public.is_admin((select auth.uid())));

drop policy if exists "clinical_analyses_admin_write" on public.clinical_analyses;
create policy "clinical_analyses_admin_write"
  on public.clinical_analyses for all
  to authenticated
  using (public.is_admin((select auth.uid())))
  with check (public.is_admin((select auth.uid())));

-- --- documents -------------------------------------------------------------
drop policy if exists "documents_public_read" on public.documents;
create policy "documents_public_read"
  on public.documents for select
  to anon, authenticated
  using (is_active = true or public.is_admin((select auth.uid())));

drop policy if exists "documents_admin_write" on public.documents;
create policy "documents_admin_write"
  on public.documents for all
  to authenticated
  using (public.is_admin((select auth.uid())))
  with check (public.is_admin((select auth.uid())));

-- --- tablas de relación: mismas reglas (lectura pública, escritura admin) ------
drop policy if exists "microorganism_media_public_read" on public.microorganism_media;
create policy "microorganism_media_public_read"
  on public.microorganism_media for select
  to anon, authenticated
  using (true);

drop policy if exists "microorganism_media_admin_write" on public.microorganism_media;
create policy "microorganism_media_admin_write"
  on public.microorganism_media for all
  to authenticated
  using (public.is_admin((select auth.uid())))
  with check (public.is_admin((select auth.uid())));

drop policy if exists "microorganism_tests_public_read" on public.microorganism_tests;
create policy "microorganism_tests_public_read"
  on public.microorganism_tests for select
  to anon, authenticated
  using (true);

drop policy if exists "microorganism_tests_admin_write" on public.microorganism_tests;
create policy "microorganism_tests_admin_write"
  on public.microorganism_tests for all
  to authenticated
  using (public.is_admin((select auth.uid())))
  with check (public.is_admin((select auth.uid())));

drop policy if exists "microorganism_procedures_public_read" on public.microorganism_procedures;
create policy "microorganism_procedures_public_read"
  on public.microorganism_procedures for select
  to anon, authenticated
  using (true);

drop policy if exists "microorganism_procedures_admin_write" on public.microorganism_procedures;
create policy "microorganism_procedures_admin_write"
  on public.microorganism_procedures for all
  to authenticated
  using (public.is_admin((select auth.uid())))
  with check (public.is_admin((select auth.uid())));

-- =============================================================================
-- 10. Supabase Storage
-- =============================================================================
-- Bucket público de solo-lectura para imágenes de microorganismos (microscopía
-- y cultivo). Se sirven directamente por URL pública, pero solo un admin
-- puede subir/reemplazar/borrar.
insert into storage.buckets (id, name, public)
values ('microorganism-images', 'microorganism-images', true)
on conflict (id) do nothing;

-- Bucket de documentos/insertos. Se marca público en Fase 2 para simplificar
-- la descarga; si en el futuro se necesitan documentos privados, se puede
-- crear un segundo bucket "documents-private" con policies restringidas.
insert into storage.buckets (id, name, public)
values ('documents', 'documents', true)
on conflict (id) do nothing;

drop policy if exists "microorganism_images_public_read" on storage.objects;
create policy "microorganism_images_public_read"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'microorganism-images');

drop policy if exists "microorganism_images_admin_write" on storage.objects;
create policy "microorganism_images_admin_write"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'microorganism-images' and public.is_admin((select auth.uid())));

drop policy if exists "microorganism_images_admin_update" on storage.objects;
create policy "microorganism_images_admin_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'microorganism-images' and public.is_admin((select auth.uid())));

drop policy if exists "microorganism_images_admin_delete" on storage.objects;
create policy "microorganism_images_admin_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'microorganism-images' and public.is_admin((select auth.uid())));

drop policy if exists "documents_bucket_public_read" on storage.objects;
create policy "documents_bucket_public_read"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'documents');

drop policy if exists "documents_bucket_admin_write" on storage.objects;
create policy "documents_bucket_admin_write"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'documents' and public.is_admin((select auth.uid())));

drop policy if exists "documents_bucket_admin_update" on storage.objects;
create policy "documents_bucket_admin_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'documents' and public.is_admin((select auth.uid())));

drop policy if exists "documents_bucket_admin_delete" on storage.objects;
create policy "documents_bucket_admin_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'documents' and public.is_admin((select auth.uid())));
