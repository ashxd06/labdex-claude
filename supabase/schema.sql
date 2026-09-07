-- =============================================================================
-- LABDEX — Fase 1: esquema inicial de base de datos
-- =============================================================================
-- Ejecutar en el SQL Editor de Supabase (o vía `supabase db push` con esta
-- migración) en un proyecto nuevo o existente.
-- =============================================================================

-- 1. Tipo de rol -------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('user', 'admin');
  end if;
end $$;

-- 2. Tabla profiles ------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  avatar_url text,
  role public.app_role not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  'Perfil público de cada usuario. El rol es la única fuente de verdad de autorización y solo puede cambiarse desde el backend (ver policies + promote_to_admin más abajo).';

-- 3. updated_at automático -----------------------------------------------------
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row
  execute function public.handle_updated_at();

-- 4. Creación automática de perfil al registrarse ------------------------------
-- Se ejecuta con SECURITY DEFINER porque el usuario recién creado todavía no
-- tiene una fila en `profiles` (y por tanto ninguna policy se lo permitiría).
-- El rol SIEMPRE se fuerza a 'user': el valor que llegue en los metadatos del
-- signUp (si alguno) se ignora a propósito para impedir que alguien intente
-- registrarse pasando role=admin en el cliente.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    'user'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- 5. Row Level Security ---------------------------------------------------------
alter table public.profiles enable row level security;

-- Lectura: cada usuario ve su propio perfil.
-- (En Fase 1 no exponemos perfiles ajenos; se ampliará con cuidado cuando
-- haga falta un directorio de usuarios).
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles
  for select
  to authenticated
  using (id = (select auth.uid()));

-- Actualización: un usuario puede editar su propio perfil, PERO nunca su rol.
-- La cláusula WITH CHECK compara el rol nuevo contra el rol ya almacenado:
-- si alguien intenta enviar role=admin en un UPDATE, la fila es rechazada.
drop policy if exists "profiles_update_own_except_role" on public.profiles;
create policy "profiles_update_own_except_role"
  on public.profiles
  for update
  to authenticated
  using (id = (select auth.uid()))
  with check (
    id = (select auth.uid())
    and role = (select p.role from public.profiles p where p.id = (select auth.uid()))
  );

-- No se define ninguna policy de INSERT ni DELETE para el rol `authenticated`:
-- los perfiles solo se crean vía el trigger (SECURITY DEFINER) y solo se
-- eliminan en cascada al borrar el usuario. Sin policy = operación denegada
-- por defecto bajo RLS.

-- 6. Función auxiliar para futuras políticas basadas en rol ---------------------
-- SECURITY DEFINER + search_path fijo evita recursión infinita al usarla
-- dentro de policies de `profiles` u otras tablas (p. ej. "solo admin puede
-- editar microorganismos" en la Fase 2).
create or replace function public.is_admin(uid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles where id = uid and role = 'admin'
  );
$$;

revoke all on function public.is_admin(uuid) from public;
grant execute on function public.is_admin(uuid) to authenticated;

-- Ejemplo de uso en una tabla futura (no se ejecuta en esta fase):
-- create policy "solo_admin_puede_escribir"
--   on public.microorganismos
--   for insert
--   to authenticated
--   with check (public.is_admin((select auth.uid())));
