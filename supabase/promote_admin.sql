-- =============================================================================
-- LABDEX — Promover un usuario a administrador (mecanismo seguro)
-- =============================================================================
-- Este es el ÚNICO camino soportado para que un usuario pase de `user` a
-- `admin`. No existe ningún botón, endpoint público ni Server Action que
-- permita este cambio: la policy de UPDATE de `profiles` (ver schema.sql)
-- bloquea explícitamente cualquier intento de modificar el rol propio desde
-- la aplicación cliente.
--
-- Cómo ejecutarlo:
--   1. Abre el SQL Editor de tu proyecto en supabase.com (requiere acceso de
--      propietario/administrador del proyecto Supabase, no de la app).
--   2. Sustituye el correo de ejemplo por el del usuario real.
--   3. Ejecuta la consulta.
--
-- Esta consulta se ejecuta con el rol `postgres`/`service_role` del panel de
-- Supabase, que no está sujeto a las RLS de `authenticated`, por eso puede
-- hacer lo que la aplicación nunca podrá hacer por sí sola.
-- =============================================================================

update public.profiles
set role = 'admin'
where id = (
  select id from auth.users where email = 'correo-del-nuevo-admin@ejemplo.com'
);

-- Para revertir a usuario normal:
-- update public.profiles
-- set role = 'user'
-- where id = (select id from auth.users where email = 'correo@ejemplo.com');

-- Para verificar el resultado:
-- select p.id, p.full_name, p.role, u.email
-- from public.profiles p
-- join auth.users u on u.id = p.id
-- where u.email = 'correo-del-nuevo-admin@ejemplo.com';
