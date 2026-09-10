/**
 * Tipos de la base de datos de LABDEX.
 *
 * En fases posteriores este archivo se generará automáticamente con:
 *   npx supabase gen types typescript --project-id <id> > lib/supabase/types.ts
 *
 * Por ahora se define a mano, cubriendo Fase 1 (auth/roles) y Fase 2
 * (base de conocimiento).
 */
export type AppRole = "user" | "admin" | "lab_staff";
export type ContentStatus = "draft" | "published" | "archived";
export type MicroorganismKind = "bacteria" | "hongo" | "virus" | "parasito";

export interface ContentFields {
  is_active: boolean;
  status: ContentStatus;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Category extends ContentFields {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  type: string | null;
  display_order: number;
}

export interface Microorganism extends ContentFields {
  id: string;
  scientific_name: string;
  common_name: string | null;
  slug: string;
  kind: MicroorganismKind;
  category_id: string | null;
  description: string | null;
  classification: string | null;
  morphology: string | null;
  gram_stain: string | null;
  shape: string | null;
  arrangement: string | null;
  oxygen_requirement: string | null;
  motility: string | null;
  spore_formation: string | null;
  culture: string | null;
  pathogenicity: string | null;
  clinical_importance: string | null;
  transmission: string | null;
  diagnosis: string | null;
  prevention: string | null;
  microscopy_image_path: string | null;
  culture_image_path: string | null;
  is_sample_data: boolean;
}

export interface CultureMedia extends ContentFields {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  type: string | null;
  purpose: string | null;
  principle: string | null;
  composition: string | null;
  preparation: string | null;
  incubation: string | null;
  interpretation: string | null;
  quality_control: string | null;
  is_sample_data: boolean;
}

export interface LaboratoryTest extends ContentFields {
  id: string;
  name: string;
  slug: string;
  category_id: string | null;
  description: string | null;
  principle: string | null;
  sample_type: string | null;
  reagents: string | null;
  materials: string | null;
  procedure: string | null;
  interpretation: string | null;
  is_sample_data: boolean;
}

export interface Procedure extends ContentFields {
  id: string;
  name: string;
  slug: string;
  category_id: string | null;
  description: string | null;
  objective: string | null;
  sample: string | null;
  materials: string | null;
  reagents: string | null;
  procedure: string | null;
  precautions: string | null;
  interpretation: string | null;
  is_sample_data: boolean;
}

export interface ClinicalAnalysis extends ContentFields {
  id: string;
  name: string;
  slug: string;
  category_id: string | null;
  description: string | null;
  sample_type: string | null;
  method: string | null;
  principle: string | null;
  unit: string | null;
  reference_range: string | null;
  calculation: string | null;
  interpretation: string | null;
  is_sample_data: boolean;
}

export interface LabDocument extends ContentFields {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  category: string | null;
  file_path: string | null;
  file_type: string | null;
  source: string | null;
}

export interface MicroorganismMedia {
  microorganism_id: string;
  media_id: string;
  notes: string | null;
}

export interface MicroorganismTest {
  microorganism_id: string;
  test_id: string;
  result_expected: string | null;
  notes: string | null;
}

export interface MicroorganismProcedure {
  microorganism_id: string;
  procedure_id: string;
  notes: string | null;
}

export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: AppRole;
  created_at: string;
  updated_at: string;
}

/**
 * Este proyecto no usa la inferencia genérica completa de
 * `@supabase/supabase-js` (Database["public"]["Tables"][...]) para las
 * tablas de contenido: se tipan explícitamente los resultados en cada
 * función de `lib/content/*` con las interfaces de arriba. Esto evita un
 * archivo de tipos gigantesco mientras el esquema todavía cambia rápido en
 * estas primeras fases.
 */
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & { id: string };
        Update: Partial<Profile>;
      };
    };
  };
}
