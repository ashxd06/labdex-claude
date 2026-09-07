-- =============================================================================
-- LABDEX — Fase 4: Laboratorio Clínico + Informes de Resultados
-- =============================================================================
-- Ejecutar DESPUÉS de schema.sql y schema_fase2.sql, en el SQL Editor de
-- Supabase. Idempotente.
--
-- MODELO DE PERMISOS DE ESTA FASE:
--   - Los datos de laboratorio (pacientes, muestras, solicitudes, resultados,
--     informes) son sensibles y NUNCA son de lectura pública: solo usuarios
--     autenticados (cualquier cuenta con sesión iniciada, actuando como
--     personal de laboratorio) pueden leerlos y escribirlos.
--   - La configuración del laboratorio (`lab_settings`) y el catálogo de
--     valores de referencia (`reference_ranges`) sí distinguen: cualquier
--     autenticado puede leer, pero solo un admin puede modificarlos.
--   - Nada de esto es de lectura pública (anon). El buscador público de
--     LABDEX (Fase 3) solo consulta `categories`, `microorganisms`,
--     `culture_media`, `laboratory_tests`, `procedures`, `clinical_analyses`
--     y `documents` — ninguna tabla de esta fase.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0. Tipos
-- -----------------------------------------------------------------------------
do $$ begin
  if not exists (select 1 from pg_type where typname = 'patient_sex') then
    create type public.patient_sex as enum ('M', 'F', 'otro');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'sample_status') then
    create type public.sample_status as enum ('pendiente', 'recibida', 'en_proceso', 'procesada', 'rechazada');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'sample_condition') then
    create type public.sample_condition as enum
      ('adecuada', 'hemolizada', 'lipemica', 'icterica', 'insuficiente', 'contaminada', 'otra');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'order_priority') then
    create type public.order_priority as enum ('normal', 'urgente');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'order_status') then
    create type public.order_status as enum ('pendiente', 'en_proceso', 'completada', 'cancelada');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'result_type') then
    create type public.result_type as enum ('cuantitativo', 'cualitativo', 'semicuantitativo', 'descriptivo');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'result_status') then
    create type public.result_status as enum ('pendiente', 'ingresado', 'validado', 'informado');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'report_status') then
    create type public.report_status as enum ('borrador', 'emitido', 'anulado');
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- 1. patients
-- -----------------------------------------------------------------------------
create table if not exists public.patients (
  id uuid primary key default gen_random_uuid(),
  internal_code text not null unique,
  first_name text not null,
  last_name text not null,
  document_id text,
  birth_date date,
  sex public.patient_sex,
  phone text,
  email text,
  address text,
  notes text,
  is_demo boolean not null default false,
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists patients_name_idx on public.patients (last_name, first_name);
create index if not exists patients_document_idx on public.patients (document_id);

-- Evita duplicar un paciente cuando ya existe un documento de identidad
-- claro (el índice ignora filas con documento vacío, ya que el campo es
-- opcional).
create unique index if not exists patients_document_unique_idx
  on public.patients (document_id)
  where document_id is not null and document_id <> '';

drop trigger if exists set_patients_updated_at on public.patients;
create trigger set_patients_updated_at
  before update on public.patients
  for each row execute function public.handle_updated_at();

-- Código interno correlativo (PAC-000001) generado igual que los informes,
-- ver función next_sequence_code() más abajo.
create sequence if not exists public.patients_code_seq;

-- -----------------------------------------------------------------------------
-- 2. samples
-- -----------------------------------------------------------------------------
create table if not exists public.samples (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients (id) on delete cascade,
  sample_code text not null unique,
  sample_type text not null,
  collected_date date,
  collected_time time,
  received_date date,
  received_time time,
  condition public.sample_condition not null default 'adecuada',
  notes text,
  status public.sample_status not null default 'pendiente',
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists samples_patient_idx on public.samples (patient_id);

drop trigger if exists set_samples_updated_at on public.samples;
create trigger set_samples_updated_at
  before update on public.samples
  for each row execute function public.handle_updated_at();

create sequence if not exists public.samples_code_seq;

-- -----------------------------------------------------------------------------
-- 3. lab_orders (solicitudes)
-- -----------------------------------------------------------------------------
create table if not exists public.lab_orders (
  id uuid primary key default gen_random_uuid(),
  order_code text not null unique,
  patient_id uuid not null references public.patients (id) on delete cascade,
  sample_id uuid references public.samples (id) on delete set null,
  doctor_name text,
  clinical_notes text,
  priority public.order_priority not null default 'normal',
  status public.order_status not null default 'pendiente',
  requested_at timestamptz not null default now(),
  completed_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists lab_orders_patient_idx on public.lab_orders (patient_id);

drop trigger if exists set_lab_orders_updated_at on public.lab_orders;
create trigger set_lab_orders_updated_at
  before update on public.lab_orders
  for each row execute function public.handle_updated_at();

create sequence if not exists public.lab_orders_code_seq;

-- -----------------------------------------------------------------------------
-- 4. lab_order_items (análisis solicitados dentro de una solicitud)
-- -----------------------------------------------------------------------------
create table if not exists public.lab_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.lab_orders (id) on delete cascade,
  analysis_id uuid not null references public.clinical_analyses (id) on delete restrict,
  result_type public.result_type not null default 'cuantitativo',
  created_at timestamptz not null default now(),
  unique (order_id, analysis_id)
);

create index if not exists lab_order_items_order_idx on public.lab_order_items (order_id);

-- -----------------------------------------------------------------------------
-- 5. lab_results
-- -----------------------------------------------------------------------------
create table if not exists public.lab_results (
  id uuid primary key default gen_random_uuid(),
  order_item_id uuid not null unique references public.lab_order_items (id) on delete cascade,
  result_value text,               -- valor tal como se muestra (número, "Positivo", "++", texto libre)
  unit text,
  reference_range_text text,       -- copia legible del rango usado, para dejar constancia en el informe
  flag text,                       -- "bajo" | "normal" | "alto" | null (solo si hay rango numérico estructurado)
  observation text,
  status public.result_status not null default 'pendiente',
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_lab_results_updated_at on public.lab_results;
create trigger set_lab_results_updated_at
  before update on public.lab_results
  for each row execute function public.handle_updated_at();

-- -----------------------------------------------------------------------------
-- 6. reference_ranges
-- -----------------------------------------------------------------------------
-- Estructura preparada para valores de referencia por sexo/edad; en esta
-- fase no se construye un algoritmo clínico automático sobre ella (ver
-- README), pero queda lista para usarse en fases futuras sin cambiar el
-- esquema.
create table if not exists public.reference_ranges (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.clinical_analyses (id) on delete cascade,
  sex public.patient_sex,           -- null = aplica a cualquier sexo
  age_min integer,                  -- en años; null = sin mínimo
  age_max integer,                  -- en años; null = sin máximo
  range_min numeric,
  range_max numeric,
  unit text,
  reference_text text,              -- texto libre cuando el rango no es numérico
  created_at timestamptz not null default now()
);

create index if not exists reference_ranges_analysis_idx on public.reference_ranges (analysis_id);

-- -----------------------------------------------------------------------------
-- 7. lab_reports (informes)
-- -----------------------------------------------------------------------------
create table if not exists public.lab_reports (
  id uuid primary key default gen_random_uuid(),
  report_number text not null unique,   -- LAB-000001
  order_id uuid not null references public.lab_orders (id) on delete restrict,
  patient_id uuid not null references public.patients (id) on delete restrict,
  status public.report_status not null default 'borrador',
  responsible_name text,
  responsible_title text,
  responsible_license text,
  issued_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists lab_reports_patient_idx on public.lab_reports (patient_id);
create index if not exists lab_reports_order_idx on public.lab_reports (order_id);

drop trigger if exists set_lab_reports_updated_at on public.lab_reports;
create trigger set_lab_reports_updated_at
  before update on public.lab_reports
  for each row execute function public.handle_updated_at();

create sequence if not exists public.lab_reports_code_seq;

-- -----------------------------------------------------------------------------
-- 8. lab_settings (fila única con la identidad del laboratorio)
-- -----------------------------------------------------------------------------
create table if not exists public.lab_settings (
  id boolean primary key default true,   -- fuerza una sola fila (id siempre = true)
  lab_name text not null default 'LABDEX',
  logo_path text,
  address text,
  phone text,
  email text,
  website text,
  responsible_name text,
  responsible_title text,
  responsible_license text,
  signature_path text,
  seal_path text,
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint lab_settings_single_row check (id)
);

insert into public.lab_settings (id) values (true) on conflict (id) do nothing;

drop trigger if exists set_lab_settings_updated_at on public.lab_settings;
create trigger set_lab_settings_updated_at
  before update on public.lab_settings
  for each row execute function public.handle_updated_at();

-- -----------------------------------------------------------------------------
-- 9. Numeración atómica (secuencias de Postgres — nunca MAX()+1)
-- -----------------------------------------------------------------------------
create or replace function public.next_sequence_code(seq_name text, prefix text, pad_width int default 6)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  next_val bigint;
begin
  execute format('select nextval(%L)', seq_name) into next_val;
  return prefix || lpad(next_val::text, pad_width, '0');
end;
$$;

revoke all on function public.next_sequence_code(text, text, int) from public;
grant execute on function public.next_sequence_code(text, text, int) to authenticated;

create or replace function public.next_report_number()
returns text
language sql
security definer
set search_path = public
as $$
  select public.next_sequence_code('public.lab_reports_code_seq', 'LAB-', 6);
$$;

create or replace function public.next_patient_code()
returns text
language sql
security definer
set search_path = public
as $$
  select public.next_sequence_code('public.patients_code_seq', 'PAC-', 6);
$$;

create or replace function public.next_sample_code()
returns text
language sql
security definer
set search_path = public
as $$
  select public.next_sequence_code('public.samples_code_seq', 'MUE-', 6);
$$;

create or replace function public.next_order_code()
returns text
language sql
security definer
set search_path = public
as $$
  select public.next_sequence_code('public.lab_orders_code_seq', 'SOL-', 6);
$$;

grant execute on function public.next_report_number() to authenticated;
grant execute on function public.next_patient_code() to authenticated;
grant execute on function public.next_sample_code() to authenticated;
grant execute on function public.next_order_code() to authenticated;

-- -----------------------------------------------------------------------------
-- 10. Row Level Security
-- -----------------------------------------------------------------------------
alter table public.patients enable row level security;
alter table public.samples enable row level security;
alter table public.lab_orders enable row level security;
alter table public.lab_order_items enable row level security;
alter table public.lab_results enable row level security;
alter table public.reference_ranges enable row level security;
alter table public.lab_reports enable row level security;
alter table public.lab_settings enable row level security;

-- Datos clínicos: solo usuarios autenticados (nunca `anon`). Cualquier
-- cuenta con sesión iniciada puede operar el laboratorio; no se introduce
-- un tercer rol en esta fase, pero la tabla `profiles.role` ya deja espacio
-- para uno (ej. "lab_staff") en el futuro sin migrar datos.
drop policy if exists "patients_authenticated_all" on public.patients;
create policy "patients_authenticated_all"
  on public.patients for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists "samples_authenticated_all" on public.samples;
create policy "samples_authenticated_all"
  on public.samples for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists "lab_orders_authenticated_all" on public.lab_orders;
create policy "lab_orders_authenticated_all"
  on public.lab_orders for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists "lab_order_items_authenticated_all" on public.lab_order_items;
create policy "lab_order_items_authenticated_all"
  on public.lab_order_items for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists "lab_results_authenticated_all" on public.lab_results;
create policy "lab_results_authenticated_all"
  on public.lab_results for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists "lab_reports_authenticated_all" on public.lab_reports;
create policy "lab_reports_authenticated_all"
  on public.lab_reports for all
  to authenticated
  using (true)
  with check (true);

-- Catálogo de valores de referencia y configuración del laboratorio:
-- cualquier autenticado puede leer (los necesita para registrar resultados
-- e imprimir informes), pero solo un admin puede modificarlos.
drop policy if exists "reference_ranges_authenticated_read" on public.reference_ranges;
create policy "reference_ranges_authenticated_read"
  on public.reference_ranges for select
  to authenticated
  using (true);

drop policy if exists "reference_ranges_admin_write" on public.reference_ranges;
create policy "reference_ranges_admin_write"
  on public.reference_ranges for insert
  to authenticated
  with check (public.is_admin((select auth.uid())));

drop policy if exists "reference_ranges_admin_update" on public.reference_ranges;
create policy "reference_ranges_admin_update"
  on public.reference_ranges for update
  to authenticated
  using (public.is_admin((select auth.uid())));

drop policy if exists "reference_ranges_admin_delete" on public.reference_ranges;
create policy "reference_ranges_admin_delete"
  on public.reference_ranges for delete
  to authenticated
  using (public.is_admin((select auth.uid())));

drop policy if exists "lab_settings_authenticated_read" on public.lab_settings;
create policy "lab_settings_authenticated_read"
  on public.lab_settings for select
  to authenticated
  using (true);

drop policy if exists "lab_settings_admin_update" on public.lab_settings;
create policy "lab_settings_admin_update"
  on public.lab_settings for update
  to authenticated
  using (public.is_admin((select auth.uid())))
  with check (public.is_admin((select auth.uid())));

-- -----------------------------------------------------------------------------
-- 11. Storage — logo / firma / sello del laboratorio
-- -----------------------------------------------------------------------------
-- Bucket privado (no público): solo el personal autenticado puede ver estos
-- archivos, y solo un admin puede subir/reemplazar/borrar. Se sirven con
-- signed URLs generadas bajo demanda (ver lib/lab/storage.ts).
insert into storage.buckets (id, name, public)
values ('lab-assets', 'lab-assets', false)
on conflict (id) do nothing;

drop policy if exists "lab_assets_authenticated_read" on storage.objects;
create policy "lab_assets_authenticated_read"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'lab-assets');

drop policy if exists "lab_assets_admin_write" on storage.objects;
create policy "lab_assets_admin_write"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'lab-assets' and public.is_admin((select auth.uid())));

drop policy if exists "lab_assets_admin_update" on storage.objects;
create policy "lab_assets_admin_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'lab-assets' and public.is_admin((select auth.uid())));

drop policy if exists "lab_assets_admin_delete" on storage.objects;
create policy "lab_assets_admin_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'lab-assets' and public.is_admin((select auth.uid())));
