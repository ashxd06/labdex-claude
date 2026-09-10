-- =============================================================================
-- LABDEX — Promover una cuenta a personal de laboratorio (lab_staff)
-- =============================================================================
-- Ejecutar en el SQL Editor de Supabase DESPUÉS de aplicar
-- schema_fase4_security.sql (esa migración es la que crea el rol
-- 'lab_staff'). Igual patrón que promote_admin.sql: reemplaza el correo y
-- ejecuta solo la sentencia que necesites.
--
-- Un admin NO necesita esto — ya tiene acceso total al laboratorio.
-- Usa esto para el personal de laboratorio que no debe (o no necesita) ser
-- admin de toda la plataforma.
-- =============================================================================

-- Reemplaza 'correo@ejemplo.com' por el correo real de la cuenta.
update public.profiles
set role = 'lab_staff'
where id = (select id from auth.users where email = 'correo@ejemplo.com');

-- Para revertir (dejar la cuenta como usuario normal, sin acceso al
-- laboratorio):
-- update public.profiles
-- set role = 'user'
-- where id = (select id from auth.users where email = 'correo@ejemplo.com');

-- Para ver quién tiene acceso al laboratorio en este momento:
-- select p.id, u.email, p.role
-- from public.profiles p
-- join auth.users u on u.id = p.id
-- where p.role in ('admin', 'lab_staff')
-- order by u.email;
