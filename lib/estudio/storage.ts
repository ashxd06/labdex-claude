import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Almacenamiento de materiales de estudio (Fase 6, §24, §31, §32).
 *
 * Se reutiliza el mismo patrón que `lib/content/storage.ts` (validar tipo/
 * tamaño antes de subir, construir la ruta en el servidor) pero con un
 * bucket privado por usuario, igual que `lab-assets` en Fase 4. Por ahora
 * el único formato soportado es PDF (Fase 6, §31): agregar DOCX/PPTX/EPUB
 * queda para una fase posterior.
 */

export const STUDY_MATERIALS_BUCKET = "study-materials";

// 20 MB: mismo límite que el bucket "documents" de Fase 2 (lib/content/storage.ts).
// Es suficiente para la mayoría de apuntes/separatas y mantiene los envíos a
// Gemini (inline, en base64) dentro de un tamaño de petición razonable una
// vez fragmentado por lotes de páginas (ver lib/estudio/pdf/chunking.ts).
export const MAX_FILE_BYTES = 20 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set(["application/pdf"]);

export interface UploadFileLike {
  type: string;
  size: number;
}

/** Valida tipo MIME, tamaño y que el archivo no esté vacío (Fase 6, §32).
 * Devuelve un mensaje de error legible o `null` si el archivo es válido. */
export function validateUploadFile(file: UploadFileLike): string | null {
  if (!file || file.size === 0) {
    return "El archivo está vacío.";
  }
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return "Formato de archivo no permitido. Por ahora solo se admite PDF.";
  }
  if (file.size > MAX_FILE_BYTES) {
    return `El archivo supera el tamaño máximo permitido (${Math.round(MAX_FILE_BYTES / (1024 * 1024))} MB).`;
  }
  return null;
}

/** Construye la ruta de almacenamiento para el PDF original de un
 * material. Nunca se confía en un nombre de archivo enviado por el
 * cliente: solo se usa para la extensión, ya validada como PDF. */
export function buildStoragePath(userId: string, materialId: string): string {
  return `${userId}/${materialId}/original.pdf`;
}

export async function uploadOriginalPdf(
  supabase: SupabaseClient,
  path: string,
  file: File | Blob
): Promise<{ error: string | null }> {
  const { error } = await supabase.storage
    .from(STUDY_MATERIALS_BUCKET)
    .upload(path, file, { upsert: true, contentType: "application/pdf" });

  if (error) {
    return { error: "No se pudo subir el archivo." };
  }
  return { error: null };
}

export async function deleteStoredPdf(supabase: SupabaseClient, path: string): Promise<void> {
  await supabase.storage.from(STUDY_MATERIALS_BUCKET).remove([path]);
}

/** Genera una URL firmada de corta duración para el visor del documento
 * original (Fase 6, §21). Nunca se expone el bucket como público: cada URL
 * se genera bajo demanda y expira. */
export async function getSignedPdfUrl(
  supabase: SupabaseClient,
  path: string,
  expiresInSeconds = 300
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(STUDY_MATERIALS_BUCKET)
    .createSignedUrl(path, expiresInSeconds);

  if (error || !data) return null;
  return data.signedUrl;
}
