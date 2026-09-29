-- Progreso personal del reto diario. Solo guarda IDs de fichas y actividad
-- educativa (nunca datos de pacientes ni respuestas clínicas).
create table if not exists public.study_learning_progress (
  user_id uuid primary key references auth.users (id) on delete cascade,
  state jsonb not null default '{}'::jsonb check (jsonb_typeof(state) = 'object'),
  updated_at timestamptz not null default now()
);

alter table public.study_learning_progress enable row level security;

revoke all on public.study_learning_progress from anon, authenticated;
grant select, insert, update on public.study_learning_progress to authenticated;

drop policy if exists "Users can read their own learning progress" on public.study_learning_progress;
create policy "Users can read their own learning progress"
  on public.study_learning_progress for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their own learning progress" on public.study_learning_progress;
create policy "Users can create their own learning progress"
  on public.study_learning_progress for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own learning progress" on public.study_learning_progress;
create policy "Users can update their own learning progress"
  on public.study_learning_progress for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

