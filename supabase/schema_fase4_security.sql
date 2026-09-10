-- =============================================================================
-- LABDEX — Fase 4: Corrección de seguridad del módulo de Laboratorio
-- =============================================================================
-- Ejecutar DESPUÉS de schema.sql, schema_fase2.sql y schema_fase4.sql, en el
-- SQL Editor de Supabase. Idempotente (se puede correr más de una vez sin
-- error). No borra tablas ni filas existentes.
--
-- PROBLEMA QUE CORRIGE:
-- Las políticas RLS originales de Fase 4 (`schema_fase4.sql`) usaban
-- `to authenticated using (true)` en patients, samples, lab_orders,
-- lab_order_items, lab_results y lab_reports. Eso significa que CUALQUIER
-- cuenta con sesión iniciada en LABDEX —incluida una que solo se registró
-- para usar el Hub de Estudio (Fase 6.0/6.1) y nunca pisó `/laboratorio`—
-- podía leer y modificar todos los datos clínicos directamente contra la
-- API de Supabase con su propio JWT, sin pasar por la interfaz. La capa de
-- aplicación tampoco lo evitaba: `requireLabSession` solo exigía sesión
-- iniciada, no un rol específico.
--
-- QUÉ HACE ESTA MIGRACIÓN:
--   1. Agrega el valor 'lab_staff' al enum `app_role` (ADD VALUE, no
--      destructivo; los roles 'user' y 'admin' existentes no cambian).
--   2. Crea `public.is_lab_staff(uid)`, análoga a `is_admin(uid)`: es
--      verdadera para 'admin' o 'lab_staff'. Un admin SIEMPRE conserva
--      acceso al laboratorio con esta migración — nunca queda bloqueado.
--   3. Reemplaza las políticas "cualquier autenticado" de las 6 tablas
--      clínicas por políticas que exigen `is_lab_staff(auth.uid())`.
--   4. Hace lo mismo con la política de LECTURA del bucket de Storage
--      `lab-assets` (logo/firma/sello), que también era de cualquier
--      autenticado. La escritura de ese bucket ya era admin-only y no
--      cambia.
--   5. NO toca `reference_ranges` ni `lab_settings`: su lectura para
--      cualquier autenticado ya era una decisión deliberada de Fase 4
--      (son catálogos de referencia/configuración, no historiales de
--      pacientes) y su escritura ya era admin-only. No se modifican.
--
-- ⚠️ EFECTO INMEDIATO TRAS APLICAR ESTA MIGRACIÓN:
-- Cualquier cuenta con `role = 'user'` (el valor por defecto de todo el que
-- se registra en LABDEX) PERDERÁ acceso a `/laboratorio` y a las tablas
-- clínicas — ese es justamente el objetivo. Antes de aplicar esto en
-- producción, promueve a `lab_staff` (o `admin`) a las cuentas que
-- realmente deben operar el laboratorio, usando
-- `supabase/promote_lab_staff.sql`. Una cuenta ya `admin` no necesita
-- nada adicional: sigue teniendo acceso total.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Nuevo valor de rol: lab_staff
-- -----------------------------------------------------------------------------
-- ADD VALUE ... IF NOT EXISTS es seguro de re-ejecutar. Ejecutar esta
-- sentencia SOLA (no dentro de un bloque con más sentencias que ya usen el
-- valor nuevo en la misma transacción) — así es como corre por defecto en
-- el SQL Editor de Supabase al pegar todo este archivo de una vez.
alter type public.app_role add value if not exists 'lab_staff';

-- -----------------------------------------------------------------------------
-- 2. Función is_lab_staff(uid)
-- -----------------------------------------------------------------------------
create or replace function public.is_lab_staff(uid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = uid and role in ('admin', 'lab_staff')
  );
$$;

revoke all on function public.is_lab_staff(uuid) from public;
grant execute on function public.is_lab_staff(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- 3. RLS de las tablas clínicas: de "cualquier autenticado" a "personal de
--    laboratorio"
-- -----------------------------------------------------------------------------
drop policy if exists "patients_authenticated_all" on public.patients;
drop policy if exists "patients_lab_staff_all" on public.patients;
create policy "patients_lab_staff_all"
  on public.patients for all
  to authenticated
  using (public.is_lab_staff((select auth.uid())))
  with check (public.is_lab_staff((select auth.uid())));

drop policy if exists "samples_authenticated_all" on public.samples;
drop policy if exists "samples_lab_staff_all" on public.samples;
create policy "samples_lab_staff_all"
  on public.samples for all
  to authenticated
  using (public.is_lab_staff((select auth.uid())))
  with check (public.is_lab_staff((select auth.uid())));

drop policy if exists "lab_orders_authenticated_all" on public.lab_orders;
drop policy if exists "lab_orders_lab_staff_all" on public.lab_orders;
create policy "lab_orders_lab_staff_all"
  on public.lab_orders for all
  to authenticated
  using (public.is_lab_staff((select auth.uid())))
  with check (public.is_lab_staff((select auth.uid())));

drop policy if exists "lab_order_items_authenticated_all" on public.lab_order_items;
drop policy if exists "lab_order_items_lab_staff_all" on public.lab_order_items;
create policy "lab_order_items_lab_staff_all"
  on public.lab_order_items for all
  to authenticated
  using (public.is_lab_staff((select auth.uid())))
  with check (public.is_lab_staff((select auth.uid())));

drop policy if exists "lab_results_authenticated_all" on public.lab_results;
drop policy if exists "lab_results_lab_staff_all" on public.lab_results;
create policy "lab_results_lab_staff_all"
  on public.lab_results for all
  to authenticated
  using (public.is_lab_staff((select auth.uid())))
  with check (public.is_lab_staff((select auth.uid())));

drop policy if exists "lab_reports_authenticated_all" on public.lab_reports;
drop policy if exists "lab_reports_lab_staff_all" on public.lab_reports;
create policy "lab_reports_lab_staff_all"
  on public.lab_reports for all
  to authenticated
  using (public.is_lab_staff((select auth.uid())))
  with check (public.is_lab_staff((select auth.uid())));

-- -----------------------------------------------------------------------------
-- 4. Storage: lectura de logo/firma/sello también restringida a personal de
--    laboratorio (la escritura ya era admin-only y no cambia)
-- -----------------------------------------------------------------------------
drop policy if exists "lab_assets_authenticated_read" on storage.objects;
drop policy if exists "lab_assets_lab_staff_read" on storage.objects;
create policy "lab_assets_lab_staff_read"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'lab-assets' and public.is_lab_staff((select auth.uid())));

-- No se tocan "lab_assets_admin_write" / "_update" / "_delete": ya exigían
-- is_admin() y siguen igual.

-- -----------------------------------------------------------------------------
-- 5. Verificación rápida (opcional, solo lectura)
-- -----------------------------------------------------------------------------
-- Ejecuta esto después de aplicar la migración para confirmar qué cuentas
-- quedarán con acceso al laboratorio:
--
-- select id, email, role from public.profiles where role in ('admin', 'lab_staff');
--
-- Si esa lista no incluye a todo el personal de laboratorio real, usa
-- supabase/promote_lab_staff.sql antes de que alguien reporte "ya no puedo
-- entrar a /laboratorio".
