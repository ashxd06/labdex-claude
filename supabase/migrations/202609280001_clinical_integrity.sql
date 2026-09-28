-- =============================================================================
-- LABDEX — Integridad clínica y seguridad de acceso
-- =============================================================================
-- Migración versionada para instalaciones existentes.
-- Ejecutar después de schema.sql, schema_fase2.sql y schema_fase4.sql.
-- No se modifican ni eliminan datos clínicos.
--
-- Antes de aplicar: asigne el rol lab_staff o admin a todo el personal que
-- deba operar el laboratorio. Las cuentas con rol user dejan de tener acceso
-- directo a los datos clínicos, incluso mediante la API de Supabase.
-- =============================================================================

-- 1. Rol y función de autorización del personal de laboratorio.
alter type public.app_role add value if not exists 'lab_staff';

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

-- 2. RLS: los datos clínicos solo pertenecen al personal de laboratorio.
drop policy if exists "patients_authenticated_all" on public.patients;
drop policy if exists "patients_lab_staff_all" on public.patients;
create policy "patients_lab_staff_all" on public.patients for all to authenticated
  using (public.is_lab_staff((select auth.uid())))
  with check (public.is_lab_staff((select auth.uid())));

drop policy if exists "samples_authenticated_all" on public.samples;
drop policy if exists "samples_lab_staff_all" on public.samples;
create policy "samples_lab_staff_all" on public.samples for all to authenticated
  using (public.is_lab_staff((select auth.uid())))
  with check (public.is_lab_staff((select auth.uid())));

drop policy if exists "lab_orders_authenticated_all" on public.lab_orders;
drop policy if exists "lab_orders_lab_staff_all" on public.lab_orders;
create policy "lab_orders_lab_staff_all" on public.lab_orders for all to authenticated
  using (public.is_lab_staff((select auth.uid())))
  with check (public.is_lab_staff((select auth.uid())));

drop policy if exists "lab_order_items_authenticated_all" on public.lab_order_items;
drop policy if exists "lab_order_items_lab_staff_all" on public.lab_order_items;
create policy "lab_order_items_lab_staff_all" on public.lab_order_items for all to authenticated
  using (public.is_lab_staff((select auth.uid())))
  with check (public.is_lab_staff((select auth.uid())));

drop policy if exists "lab_results_authenticated_all" on public.lab_results;
drop policy if exists "lab_results_lab_staff_all" on public.lab_results;
create policy "lab_results_lab_staff_all" on public.lab_results for all to authenticated
  using (public.is_lab_staff((select auth.uid())))
  with check (public.is_lab_staff((select auth.uid())));

drop policy if exists "lab_reports_authenticated_all" on public.lab_reports;
drop policy if exists "lab_reports_lab_staff_all" on public.lab_reports;
create policy "lab_reports_lab_staff_all" on public.lab_reports for all to authenticated
  using (public.is_lab_staff((select auth.uid())))
  with check (public.is_lab_staff((select auth.uid())));

drop policy if exists "lab_assets_authenticated_read" on storage.objects;
drop policy if exists "lab_assets_lab_staff_read" on storage.objects;
create policy "lab_assets_lab_staff_read" on storage.objects for select to authenticated
  using (bucket_id = 'lab-assets' and public.is_lab_staff((select auth.uid())));

-- 3. Una solicitud solo puede generar un informe. No se eliminan duplicados
-- automáticamente: si existen datos previos inconsistentes, se detiene con
-- un mensaje para que un administrador los revise conscientemente.
do $$
begin
  if exists (
    select 1
    from public.lab_reports
    group by order_id
    having count(*) > 1
  ) then
    raise exception 'No se puede aplicar la restricción de informe único: existen solicitudes con más de un informe. Revise y consolide esos registros antes de reintentar.';
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'lab_reports_order_id_key'
      and conrelid = 'public.lab_reports'::regclass
  ) then
    alter table public.lab_reports
      add constraint lab_reports_order_id_key unique (order_id);
  end if;
end;
$$;
