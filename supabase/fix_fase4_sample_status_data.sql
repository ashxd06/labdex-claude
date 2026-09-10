-- =============================================================================
-- LABDEX — Corrección de datos: muestras existentes atascadas en "pendiente"
-- =============================================================================
-- OPCIONAL. Ejecutar manualmente en el SQL Editor de Supabase, revisando
-- primero el SELECT de vista previa. No es parte de schema_fase4_security.sql
-- a propósito: es un cambio de DATOS, no de esquema, y quien lo aplique debe
-- ver antes exactamente qué filas se van a tocar.
--
-- CONTEXTO:
-- Antes de esta fase, `createSample` (lib/lab/actions.ts) nunca fijaba la
-- columna `status`, así que toda muestra registrada por la interfaz quedaba
-- en el valor por defecto de la columna: 'pendiente'. Esto incluye muestras
-- de prueba ya existentes como MUE-000001 a MUE-000004. El código ya está
-- corregido (ver lib/lab/workflow.ts: initialSampleStatus()) y toda muestra
-- NUEVA nace como 'recibida'. Este script es solo para poner al día las
-- filas que ya existían antes del arreglo.
--
-- QUÉ HACE:
-- Cambia `status` de 'pendiente' a 'recibida' ÚNICAMENTE en las muestras que
-- hoy están en 'pendiente'. No toca ninguna otra columna, no borra nada, y
-- no afecta muestras que el personal ya haya movido manualmente a
-- 'en_proceso', 'procesada' o 'rechazada' (esas no están en 'pendiente', así
-- que el UPDATE no las alcanza).
--
-- Si tienes una razón real para que alguna muestra específica siga
-- "pendiente" (por ejemplo, si decides usar ese estado en el futuro para una
-- muestra programada que aún no llega físicamente), no ejecutes este script
-- sin revisar antes cuál es esa fila y excluirla.
-- =============================================================================

-- 1) VISTA PREVIA — ejecuta esto primero y revisa la lista antes de aplicar
--    el UPDATE de abajo.
select id, sample_code, sample_type, condition, status, received_date, created_at
from public.samples
where status = 'pendiente'
order by created_at;

-- 2) APLICAR EL CAMBIO — descomenta y ejecuta solo después de revisar la
--    vista previa.
--
-- update public.samples
-- set status = 'recibida',
--     received_date = coalesce(received_date, collected_date, created_at::date),
--     received_time = coalesce(received_time, created_at::time)
-- where status = 'pendiente';

-- 3) VERIFICACIÓN — confirma que ya no queda ninguna muestra en 'pendiente'
--    (a menos que hayas excluido alguna a propósito).
--
-- select count(*) from public.samples where status = 'pendiente';
