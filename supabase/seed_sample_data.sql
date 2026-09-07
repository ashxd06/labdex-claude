-- =============================================================================
-- LABDEX — Datos de prueba (Fase 2)
-- =============================================================================
-- OPCIONAL. Ejecutar solo si quieres comprobar que el CRUD, las relaciones y
-- las fichas públicas funcionan de extremo a extremo.
--
-- Todo lo que crea este script queda marcado con is_sample_data = true, y la
-- interfaz pública muestra una insignia "Dato de prueba" en ese contenido
-- para que nunca se confunda con contenido oficial de LABDEX.
-- =============================================================================

insert into public.categories (name, slug, description, icon, type, display_order)
values
  ('Microbiología', 'microbiologia', 'Bacterias, hongos, virus y parásitos de importancia clínica.', 'microscope', 'microbiologia', 1),
  ('Hematología', 'hematologia', 'Series celulares y pruebas hematológicas.', 'droplets', 'hematologia', 2),
  ('Bioquímica', 'bioquimica', 'Perfiles metabólicos y marcadores clínicos.', 'flask-conical', 'bioquimica', 3),
  ('Parasitología', 'parasitologia', 'Identificación y ciclos biológicos de parásitos.', 'bug', 'parasitologia', 4),
  ('Inmunología', 'inmunologia', 'Serología y marcadores inmunológicos.', 'shield-check', 'inmunologia', 5),
  ('Citología', 'citologia', 'Estudio morfológico de células y tejidos.', 'scan-eye', 'citologia', 6)
on conflict (slug) do nothing;

insert into public.culture_media (name, slug, description, type, is_sample_data)
values
  ('Agar XLD', 'agar-xld', 'Medio selectivo y diferencial para enterobacterias.', 'Selectivo/diferencial', true),
  ('Agar MacConkey', 'agar-macconkey', 'Medio selectivo para bacilos gramnegativos.', 'Selectivo', true)
on conflict (slug) do nothing;

insert into public.laboratory_tests (name, slug, description, is_sample_data)
values
  ('Catalasa', 'catalasa', 'Prueba bioquímica para detectar la enzima catalasa.', true),
  ('Coagulasa', 'coagulasa', 'Prueba bioquímica para detectar la enzima coagulasa.', true)
on conflict (slug) do nothing;

insert into public.microorganisms (
  scientific_name, common_name, slug, kind, category_id,
  description, gram_stain, shape, is_sample_data
)
select
  'Staphylococcus aureus', null, 'staphylococcus-aureus', 'bacteria',
  (select id from public.categories where slug = 'microbiologia'),
  'Dato de prueba para verificar el funcionamiento del CRUD y las fichas de contenido.',
  'Positivo', 'Coco', true
where not exists (select 1 from public.microorganisms where slug = 'staphylococcus-aureus');

insert into public.microorganisms (
  scientific_name, common_name, slug, kind, category_id,
  description, gram_stain, shape, is_sample_data
)
select
  'Escherichia coli', null, 'escherichia-coli', 'bacteria',
  (select id from public.categories where slug = 'microbiologia'),
  'Dato de prueba para verificar el funcionamiento del CRUD y las fichas de contenido.',
  'Negativo', 'Bacilo', true
where not exists (select 1 from public.microorganisms where slug = 'escherichia-coli');

insert into public.microorganisms (
  scientific_name, common_name, slug, kind, category_id,
  description, gram_stain, shape, is_sample_data
)
select
  'Salmonella enterica', null, 'salmonella-enterica', 'bacteria',
  (select id from public.categories where slug = 'microbiologia'),
  'Dato de prueba para verificar el funcionamiento del CRUD y las fichas de contenido.',
  'Negativo', 'Bacilo', true
where not exists (select 1 from public.microorganisms where slug = 'salmonella-enterica');

insert into public.microorganisms (
  scientific_name, common_name, slug, kind, category_id,
  description, is_sample_data
)
select
  'Giardia lamblia', null, 'giardia-lamblia', 'parasito',
  (select id from public.categories where slug = 'microbiologia'),
  'Dato de prueba para verificar el funcionamiento del CRUD y las fichas de contenido.',
  true
where not exists (select 1 from public.microorganisms where slug = 'giardia-lamblia');

-- Relaciones de ejemplo
insert into public.microorganism_media (microorganism_id, media_id, notes)
select m.id, cm.id, 'Relación de ejemplo (dato de prueba).'
from public.microorganisms m, public.culture_media cm
where m.slug = 'salmonella-enterica' and cm.slug = 'agar-xld'
on conflict do nothing;

insert into public.microorganism_media (microorganism_id, media_id, notes)
select m.id, cm.id, 'Relación de ejemplo (dato de prueba).'
from public.microorganisms m, public.culture_media cm
where m.slug = 'escherichia-coli' and cm.slug = 'agar-macconkey'
on conflict do nothing;

insert into public.microorganism_tests (microorganism_id, test_id, result_expected, notes)
select m.id, t.id, 'Positivo', 'Relación de ejemplo (dato de prueba).'
from public.microorganisms m, public.laboratory_tests t
where m.slug = 'staphylococcus-aureus' and t.slug = 'catalasa'
on conflict do nothing;

insert into public.microorganism_tests (microorganism_id, test_id, result_expected, notes)
select m.id, t.id, 'Positivo (S. aureus) / Negativo (otros)', 'Relación de ejemplo (dato de prueba).'
from public.microorganisms m, public.laboratory_tests t
where m.slug = 'staphylococcus-aureus' and t.slug = 'coagulasa'
on conflict do nothing;
