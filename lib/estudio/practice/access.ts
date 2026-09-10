import type { SupabaseClient } from "@supabase/supabase-js";
import { toMaterialContent, type StudyMaterialContent, type StudyMaterialRecord } from "@/lib/estudio/types";

/**
 * Carga un material de estudio verificando que pertenece al usuario
 * (Fase 6.1, §30: aislamiento por usuario en todas las rutas de Práctica,
 * no solo en las de Fase 6.0). Se centraliza aquí porque las ocho rutas
 * nuevas de esta fase necesitan exactamente esta misma comprobación antes
 * de leer/escribir flashcards, preguntas o intentos.
 */
export type LoadMaterialResult =
  | { ok: true; material: StudyMaterialRecord; content: StudyMaterialContent }
  | { ok: false; status: number; error: string };

export async function loadReadyOwnedMaterial(
  supabase: SupabaseClient,
  materialId: string,
  userId: string
): Promise<LoadMaterialResult> {
  const { data, error } = await supabase
    .from("study_materials")
    .select("*")
    .eq("id", materialId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[estudio:practice] fetch material", error.message);
    return { ok: false, status: 500, error: "No se pudo acceder al material." };
  }
  if (!data) {
    return { ok: false, status: 404, error: "El material no existe o no te pertenece." };
  }

  const material = data as unknown as StudyMaterialRecord;
  const content = toMaterialContent(material);
  if (!content) {
    return { ok: false, status: 409, error: "Este material todavía no está listo para practicar." };
  }

  return { ok: true, material, content };
}
