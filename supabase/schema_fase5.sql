-- =============================================================================
-- LABDEX — Fase 5: LABDEX AI + Gemini
-- =============================================================================
-- Esta migración es idempotente (usa IF NOT EXISTS / DROP POLICY IF EXISTS)
-- y no modifica ninguna tabla de las Fases 1-4. Solo añade las tablas nuevas
-- necesarias para persistir conversaciones de LABDEX AI.
--
-- IMPORTANTE (seguridad):
--   * LABDEX AI NUNCA consulta patients/samples/lab_orders/lab_results/
--     lab_reports. Estas tablas no se tocan en esta migración y el código de
--     lib/labdex-ai/* no las referencia en ningún momento (ver Fase 5, §13).
--   * `user_id` se guarda tanto en ai_conversations como (denormalizado) en
--     ai_messages para que las políticas RLS de ai_messages puedan comparar
--     directamente `auth.uid()` sin necesitar un JOIN/EXISTS en cada fila,
--     y para que el rate limiting (lib/labdex-ai/rateLimit.ts) pueda contar
--     mensajes por usuario con una consulta simple e indexada.
-- =============================================================================

-- 1. Tabla ai_conversations ---------------------------------------------------
create table if not exists public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default 'Nueva conversación',
  mode text not null default 'general'
    check (mode in ('general', 'estudio', 'microbiologia', 'laboratorio')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.ai_conversations is
  'Conversaciones de LABDEX AI. Cada conversación pertenece a un único usuario (user_id); nunca es compartida entre usuarios.';

create index if not exists ai_conversations_user_id_updated_at_idx
  on public.ai_conversations (user_id, updated_at desc);

drop trigger if exists set_ai_conversations_updated_at on public.ai_conversations;
create trigger set_ai_conversations_updated_at
  before update on public.ai_conversations
  for each row
  execute function public.handle_updated_at();

-- 2. Tabla ai_messages ---------------------------------------------------------
create table if not exists public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_conversations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  -- Fuentes LABDEX citadas en la respuesta (array de ContextSource
  -- serializados) o [] si no se usó ninguna fuente oficial.
  sources jsonb not null default '[]'::jsonb,
  -- true cuando la respuesta usó conocimiento general de Gemini porque
  -- LABDEX no tenía información oficial suficiente (ver §6 de la Fase 5).
  used_general_knowledge boolean not null default false,
  created_at timestamptz not null default now()
);

comment on table public.ai_messages is
  'Mensajes (usuario/asistente) de cada conversación de LABDEX AI. user_id está denormalizado desde ai_conversations para simplificar RLS y rate limiting.';

create index if not exists ai_messages_conversation_id_created_at_idx
  on public.ai_messages (conversation_id, created_at asc);

create index if not exists ai_messages_user_id_created_at_idx
  on public.ai_messages (user_id, created_at desc);

-- 3. Mantener updated_at de la conversación al insertar un mensaje nuevo -------
create or replace function public.handle_ai_message_touch_conversation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.ai_conversations
  set updated_at = now()
  where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists touch_conversation_on_new_message on public.ai_messages;
create trigger touch_conversation_on_new_message
  after insert on public.ai_messages
  for each row
  execute function public.handle_ai_message_touch_conversation();

-- 4. Row Level Security --------------------------------------------------------
alter table public.ai_conversations enable row level security;
alter table public.ai_messages enable row level security;

-- Un usuario autenticado solo puede ver/crear/editar/borrar sus PROPIAS
-- conversaciones. No existe ninguna política que permita a un admin leer
-- las conversaciones de otro usuario: LABDEX AI es un espacio privado por
-- diseño (ver Fase 5, §13).
drop policy if exists "ai_conversations_owner_all" on public.ai_conversations;
create policy "ai_conversations_owner_all"
  on public.ai_conversations for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "ai_messages_owner_all" on public.ai_messages;
create policy "ai_messages_owner_all"
  on public.ai_messages for all
  to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.ai_conversations c
      where c.id = conversation_id
        and c.user_id = auth.uid()
    )
  );

-- No se otorga ningún privilegio a `anon`: LABDEX AI exige sesión iniciada
-- para poder persistir el historial (igual que el módulo de Laboratorio,
-- ver lib/lab/shared.ts::requireLabSession, del que lib/labdex-ai reutiliza
-- el mismo patrón de comprobación en servidor).

-- 5. Estadísticas agregadas para /admin/ai -------------------------------------
-- Las políticas RLS de arriba son intencionalmente estrictas: un admin NO
-- puede leer conversaciones ni mensajes de otros usuarios directamente
-- (Fase 5, §13). Para poder mostrar "estadísticas básicas" en /admin/ai sin
-- romper esa privacidad, se expone únicamente un conteo agregado a través
-- de una función SECURITY DEFINER que comprueba el rol de admin dentro de
-- la propia función y nunca devuelve contenido de mensajes ni identifica a
-- usuarios concretos.
create or replace function public.get_ai_usage_stats()
returns table (total_conversations bigint, total_messages bigint)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  ) then
    raise exception 'No autorizado';
  end if;

  return query
    select
      (select count(*) from public.ai_conversations)::bigint,
      (select count(*) from public.ai_messages)::bigint;
end;
$$;

grant execute on function public.get_ai_usage_stats() to authenticated;
