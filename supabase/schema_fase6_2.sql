-- =============================================================================
-- LABDEX — Fase 6.2: Repaso Inteligente / Estudio Adaptativo
-- =============================================================================
-- Ejecutar DESPUÉS de schema_fase6.sql y schema_fase6_1.sql. Idempotente.
-- No crea ninguna tabla nueva: Fase 6.2 se calcula por completo a partir de
-- `study_questions`, `study_exam_attempts`, `study_exam_answers` y
-- `study_flashcards` (todas de Fase 6.1) más `study_materials.content_json`
-- (Fase 6.0). Ver lib/estudio/adaptive/queries.ts.
--
-- ÚNICO CAMBIO DE ESQUEMA:
-- El "Repaso inteligente" reutiliza exactamente el mismo mecanismo de
-- intentos de Fase 6.1 (study_exam_attempts / study_exam_answers, las
-- mismas rutas de crear/responder/finalizar/revisar) en vez de duplicar esa
-- lógica — solo cambia CÓMO se eligen las preguntas (algoritmo
-- determinístico de prioridad, ver lib/estudio/adaptive/priority.ts) para un
-- nuevo valor de `mode`. Para que ese valor pueda guardarse, hace falta
-- ampliar el CHECK de la columna `mode`:
--
--   ANTES: mode in ('practica', 'examen', 'repaso_errores')
--   AHORA: mode in ('practica', 'examen', 'repaso_errores', 'inteligente')
--
-- Esto NO es destructivo: no se borra ni se modifica ninguna fila
-- existente (ningún intento actual usa 'inteligente' todavía), y el CHECK
-- se puede revalidar instantáneamente porque ninguna fila viola la nueva
-- condición (es un superconjunto de la anterior).
-- =============================================================================

do $$
declare
  constraint_name text;
begin
  select conname into constraint_name
  from pg_constraint
  where conrelid = 'public.study_exam_attempts'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%mode%practica%';

  if constraint_name is not null then
    execute format('alter table public.study_exam_attempts drop constraint %I', constraint_name);
  end if;
end $$;

alter table public.study_exam_attempts
  add constraint study_exam_attempts_mode_check
  check (mode in ('practica', 'examen', 'repaso_errores', 'inteligente'));

comment on column public.study_exam_attempts.mode is
  'practica: feedback inmediato. examen: sin feedback hasta finalizar. repaso_errores: preguntas falladas de un intento anterior. inteligente (Fase 6.2): preguntas elegidas por el algoritmo determinístico de prioridad según el historial del estudiante.';

-- No se toca RLS: las policies existentes de study_exam_attempts/
-- study_exam_answers/study_questions/study_flashcards (is user_id =
-- auth.uid()) ya cubren el modo nuevo sin cambios, porque filtran por fila,
-- no por valor de `mode`.
