-- =============================================================================
-- LABDEX — Datos DEMO del módulo de Laboratorio (Fase 4)
-- =============================================================================
-- OPCIONAL. Crea un paciente, una muestra y una solicitud de ejemplo para
-- probar el flujo completo (solicitud → resultado → informe → PDF).
--
-- Todo lo que crea este script queda marcado con is_demo = true. Nunca
-- ejecutar en un ambiente de producción real con pacientes verdaderos.
-- =============================================================================

insert into public.patients (internal_code, first_name, last_name, document_id, birth_date, sex, is_demo)
select public.next_patient_code(), 'Paciente', 'Demo', '00000000', '1990-01-01', 'M', true
where not exists (select 1 from public.patients where is_demo = true and first_name = 'Paciente' and last_name = 'Demo');
