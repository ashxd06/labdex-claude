-- =============================================================================
-- LABDEX — Fase 6.1: Práctica Inteligente (Flashcards, preguntas, examen)
-- =============================================================================
-- Migración idempotente (IF NOT EXISTS / DROP POLICY IF EXISTS). No modifica
-- ni elimina ninguna tabla de las Fases 1-6.0. Añade cuatro tablas nuevas,
-- todas hijas de `study_materials` (Fase 6.0):
--
--   1. study_flashcards      — tarjetas pregunta/respuesta generadas del material.
--   2. study_questions       — banco de preguntas de opción múltiple del material.
--   3. study_exam_attempts   — una sesión de práctica/examen/repaso de errores.
--   4. study_exam_answers    — cada respuesta que el estudiante dio dentro de un intento.
--
-- No se crea una tabla de "progreso" separada (Fase 6.1, §52): las métricas
-- básicas (tarjetas vistas/sabidas, preguntas respondidas/correctas, exámenes
-- realizados, mejor puntaje) se calculan con agregados sobre estas cuatro
-- tablas más `study_materials.last_studied_at`, que ya existe.
--
-- IMPORTANTE (seguridad, Fase 6.1 §30-31, §41):
--   * Todas las tablas nuevas exigen `user_id = auth.uid()` en RLS.
--   * `study_questions.correct_answer_index` y `.explanation` SÍ son
--     legibles por el dueño de la fila vía RLS estándar (Postgres/PostgREST
--     no permite ocultar columnas por fila), pero el backend (rutas de API)
--     nunca los envía al cliente mientras un intento está en curso: los
--     filtra explícitamente antes de responder (ver lib/estudio/practice/*).
--     RLS aquí protege el aislamiento ENTRE usuarios, no la ocultación de
--     una columna para el propio dueño durante un examen en curso; eso es
--     responsabilidad de la capa de aplicación.
--   * Esta migración NO toca patients/samples/lab_orders/lab_results/
--     lab_reports/reference_ranges (tablas clínicas de Fase 4).
-- =============================================================================

-- 1. Tabla study_flashcards -----------------------------------------------------
create table if not exists public.study_flashcards (
  id uuid primary key default gen_random_uuid(),
  material_id uuid not null references public.study_materials (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  question text not null,
  answer text not null,
  -- Referencia de páginas legible ("12" o "12-14"), o null si no se pudo
  -- determinar (Fase 6.1, §13: nunca inventar páginas).
  source_pages text,
  -- Métricas mínimas de repaso (Fase 6.1, §52). Sin algoritmo de repetición
  -- espaciada todavía (eso es Fase 6.2): solo conteos simples.
  times_seen int not null default 0,
  times_known int not null default 0,
  last_known boolean,
  last_reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

comment on table public.study_flashcards is
  'Flashcards pregunta/respuesta generadas a partir de un material de estudio (Fase 6.1). Privadas por usuario.';

create index if not exists study_flashcards_material_id_idx
  on public.study_flashcards (material_id, created_at);

alter table public.study_flashcards enable row level security;

drop policy if exists "study_flashcards_owner_all" on public.study_flashcards;
create policy "study_flashcards_owner_all"
  on public.study_flashcards for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- 2. Tabla study_questions -------------------------------------------------------
create table if not exists public.study_questions (
  id uuid primary key default gen_random_uuid(),
  material_id uuid not null references public.study_materials (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  question text not null,
  -- Siempre 4 opciones (Fase 6.1, §44). Se guarda como jsonb en vez de
  -- 4 columnas para no atarse a un número fijo si una fase futura lo cambia.
  options jsonb not null,
  correct_answer_index int not null check (correct_answer_index >= 0),
  explanation text not null,
  source_pages text,
  difficulty text not null default 'normal'
    check (difficulty in ('easy', 'normal', 'hard')),
  created_at timestamptz not null default now()
);

comment on table public.study_questions is
  'Banco de preguntas de opción múltiple generadas a partir de un material de estudio (Fase 6.1). Privadas por usuario. La respuesta correcta la conoce y valida el backend, nunca el modelo en cada clic (Fase 6.1, §40-41).';

create index if not exists study_questions_material_id_idx
  on public.study_questions (material_id, created_at);

alter table public.study_questions enable row level security;

drop policy if exists "study_questions_owner_all" on public.study_questions;
create policy "study_questions_owner_all"
  on public.study_questions for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- 3. Tabla study_exam_attempts ----------------------------------------------------
-- Un "intento" cubre tanto el modo Práctica como el Modo examen y el Repaso
-- de errores (Fase 6.1, §10, §16-21, §21/§46): los tres son la misma
-- mecánica (una lista ordenada de preguntas, respuestas, corrección al
-- final o inmediata) y comparten esta tabla para no triplicar lógica.
create table if not exists public.study_exam_attempts (
  id uuid primary key default gen_random_uuid(),
  material_id uuid not null references public.study_materials (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  mode text not null check (mode in ('practica', 'examen', 'repaso_errores')),
  -- Orden fijo de preguntas para este intento, decidido al crearlo
  -- (Fase 6.1, §15: aleatorizar entre intentos, pero mantener la
  -- asociación estable dentro de uno). Array de uuids de study_questions.
  question_ids jsonb not null,
  total_questions int not null,
  correct_count int not null default 0,
  status text not null default 'en_progreso'
    check (status in ('en_progreso', 'finalizado')),
  -- Intento del que provienen las preguntas, cuando mode = 'repaso_errores'
  -- (Fase 6.1, §21, §46).
  source_attempt_id uuid references public.study_exam_attempts (id) on delete set null,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

comment on table public.study_exam_attempts is
  'Una sesión de práctica, examen o repaso de errores sobre un material de estudio (Fase 6.1). El puntaje se calcula en el backend, nunca por el modelo (Fase 6.1, §39).';

create index if not exists study_exam_attempts_material_id_idx
  on public.study_exam_attempts (material_id, started_at desc);

alter table public.study_exam_attempts enable row level security;

drop policy if exists "study_exam_attempts_owner_all" on public.study_exam_attempts;
create policy "study_exam_attempts_owner_all"
  on public.study_exam_attempts for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- 4. Tabla study_exam_answers ------------------------------------------------------
create table if not exists public.study_exam_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.study_exam_attempts (id) on delete cascade,
  question_id uuid not null references public.study_questions (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  selected_index int not null check (selected_index >= 0),
  is_correct boolean not null,
  answered_at timestamptz not null default now(),
  unique (attempt_id, question_id)
);

comment on table public.study_exam_answers is
  'Cada respuesta registrada dentro de un intento de práctica/examen/repaso (Fase 6.1). No permite reenviar la misma pregunta dos veces dentro del mismo intento.';

create index if not exists study_exam_answers_attempt_id_idx
  on public.study_exam_answers (attempt_id);

alter table public.study_exam_answers enable row level security;

drop policy if exists "study_exam_answers_owner_all" on public.study_exam_answers;
create policy "study_exam_answers_owner_all"
  on public.study_exam_answers for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- No se otorga ningún privilegio a `anon` en ninguna de las cuatro tablas.
-- No hay política que permita a un admin leer flashcards/preguntas/
-- intentos/respuestas de otro usuario: el módulo de Práctica hereda el
-- mismo aislamiento estrictamente privado del Hub de Estudio (Fase 6.0).
