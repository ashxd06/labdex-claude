-- =============================================================================
-- LABDEX — Fase 6.0: Hub de Estudio Inteligente
-- =============================================================================
-- Migración idempotente (IF NOT EXISTS / DROP POLICY IF EXISTS). No modifica
-- ni elimina ninguna tabla de las Fases 1-5.1. Añade:
--   1. La tabla `study_materials` (materiales de estudio del alumno).
--   2. El bucket de Storage `study-materials` (privado, por carpeta de
--      usuario) para los PDF originales.
--   3. Una columna nueva y opcional `study_material_id` en la ya existente
--      `ai_conversations` de Fase 5, para poder reutilizar exactamente la
--      misma infraestructura de conversaciones/mensajes/rate-limit de
--      LABDEX AI en el chat "Pregúntale a tu material" (Fase 6, §18, §24,
--      §27) en vez de duplicar un sistema de chat paralelo.
--
-- IMPORTANTE (seguridad, Fase 6 §25-26):
--   * Los materiales de estudio son estrictamente privados: RLS exige que
--     `user_id = auth.uid()` en cada fila y cada objeto de Storage.
--   * Esta migración NO toca patients/samples/lab_orders/lab_results/
--     lab_reports/reference_ranges (tablas clínicas de Fase 4).
--   * El pipeline de análisis (lib/estudio/analysis/*) nunca consulta esas
--     tablas ni las relaciona con `study_materials`.
-- =============================================================================

-- 1. Tabla study_materials -----------------------------------------------------
create table if not exists public.study_materials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  original_filename text not null,
  storage_path text not null,
  file_size_bytes bigint not null,
  status text not null default 'subiendo'
    check (status in ('subiendo', 'procesando', 'listo', 'error')),
  page_count int,
  pages_processed int,
  truncated boolean not null default false,
  error_message text,
  -- Contenido estructurado generado por el pipeline (solo cuando status = 'listo').
  summary jsonb,
  key_concepts jsonb,
  must_remember jsonb,
  simple_explanation text,
  -- Índice condensado por página, usado para citas y para el chat sobre el
  -- material (lib/estudio/chat.ts). No es el PDF original ni una copia
  -- literal de su texto: es un resumen parafraseado por página.
  page_index jsonb,
  processing_notes jsonb not null default '[]'::jsonb,
  last_studied_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.study_materials is
  'Materiales de estudio (PDF) subidos por el estudiante y su contenido procesado por LABDEX AI. Estrictamente privados por usuario (Fase 6, §25).';

create index if not exists study_materials_user_id_created_at_idx
  on public.study_materials (user_id, created_at desc);

drop trigger if exists set_study_materials_updated_at on public.study_materials;
create trigger set_study_materials_updated_at
  before update on public.study_materials
  for each row
  execute function public.handle_updated_at();

alter table public.study_materials enable row level security;

drop policy if exists "study_materials_owner_all" on public.study_materials;
create policy "study_materials_owner_all"
  on public.study_materials for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- No se otorga ningún privilegio a `anon` ni existe ninguna política que
-- permita a un admin leer materiales de otro usuario: el Hub de Estudio es
-- un espacio privado por diseño, igual que LABDEX AI (Fase 5, §13) y el
-- Laboratorio (Fase 4).

-- 2. Storage — PDFs originales de los materiales --------------------------------
-- Bucket privado. La ruta de cada objeto siempre empieza por
-- "<user_id>/..." (ver lib/estudio/storage.ts::buildStoragePath), así que
-- las políticas comparan el primer segmento de la ruta con auth.uid() en
-- vez de solo el bucket_id (a diferencia de "lab-assets", que es de
-- lectura para todo el personal autenticado: aquí cada estudiante solo
-- puede tocar su propia carpeta).
insert into storage.buckets (id, name, public)
values ('study-materials', 'study-materials', false)
on conflict (id) do nothing;

drop policy if exists "study_materials_bucket_owner_select" on storage.objects;
create policy "study_materials_bucket_owner_select"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'study-materials'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "study_materials_bucket_owner_insert" on storage.objects;
create policy "study_materials_bucket_owner_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'study-materials'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "study_materials_bucket_owner_update" on storage.objects;
create policy "study_materials_bucket_owner_update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'study-materials'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "study_materials_bucket_owner_delete" on storage.objects;
create policy "study_materials_bucket_owner_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'study-materials'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- 3. Reutilizar ai_conversations/ai_messages (Fase 5) para el chat sobre el
--    material, en vez de crear un sistema de conversaciones paralelo -------
alter table public.ai_conversations
  add column if not exists study_material_id uuid references public.study_materials (id) on delete cascade;

create index if not exists ai_conversations_study_material_id_idx
  on public.ai_conversations (study_material_id)
  where study_material_id is not null;

-- Las políticas RLS de ai_conversations/ai_messages (Fase 5) ya exigen
-- `user_id = auth.uid()` en todos los casos, así que una conversación con
-- study_material_id apuntando al material de OTRO usuario simplemente no
-- sería visible ni editable por RLS; la ruta de API además comprueba
-- explícitamente que el material pertenece al usuario antes de usarlo
-- (ver app/api/estudio/materials/[id]/chat/route.ts).
