-- =============================================================================
-- LABDEX — Migración correctiva: un solo informe por solicitud
-- =============================================================================
-- Corrige la sección 3 de 202609280001_clinical_integrity.sql, que quedó sin
-- aplicar en la base (el resto de esa migración sí está aplicado y verificado).
--
-- Seguridad: ADITIVA e IDEMPOTENTE. No borra ni modifica filas. Si existieran
-- solicitudes con más de un informe, se DETIENE con un mensaje para que una
-- persona las revise; nunca elimina duplicados automáticamente.
-- Contexto: el código de Laboratorio consulta lab_reports por order_id con
-- .maybeSingle(), que falla si hay más de una fila por solicitud.
-- =============================================================================
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
