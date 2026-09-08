import type { ContextSource, LabdexSourceType } from "@/lib/labdex-ai/types";
import { VALID_SOURCE_URL_PREFIXES } from "@/lib/labdex-ai/context/sourceUrls";

/**
 * Capa de validación de LABDEX AI (Fase 5, §15).
 *
 * No pretende ser un sistema de moderación completo: es una capa razonable
 * y mantenible que comprueba las cosas que sí importan para esta fase:
 *   - que las fuentes mostradas realmente vinieron del Context Engine
 *     (nunca se confía en nada "adicional" añadido después);
 *   - que las URLs de esas fuentes apuntan a rutas internas válidas;
 *   - que ninguna fuente pertenece a una tabla clínica privada;
 *   - que la respuesta de texto no esté vacía;
 *   - un filtro best-effort para no reenviar accidentalmente valores que
 *     parezcan secretos si algún día se registran errores más detallados.
 */

const FORBIDDEN_PRIVATE_TABLES = [
  "patients",
  "samples",
  "lab_orders",
  "lab_order_items",
  "lab_results",
  "lab_reports",
  "reference_ranges",
  "lab_settings",
];

const VALID_SOURCE_TYPES: LabdexSourceType[] = [
  "microorganism",
  "culture_media",
  "test",
  "procedure",
  "analysis",
  "document",
];

/**
 * Filtra `sources` para quedarse únicamente con las que:
 *   1. tienen un `sourceType` reconocido y no son una tabla privada;
 *   2. su `sourceId` está entre los IDs realmente recuperados por el
 *      Context Engine (`allowedIds`), evitando que una fuente "aparezca"
 *      sin haber sido recuperada de Supabase;
 *   3. su `url` empieza por uno de los prefijos internos válidos de LABDEX.
 */
export function sanitizeSources(
  sources: ContextSource[],
  allowedIds: Set<string>
): ContextSource[] {
  const seen = new Set<string>();
  const result: ContextSource[] = [];

  for (const source of sources) {
    if (!VALID_SOURCE_TYPES.includes(source.sourceType)) continue;
    if (FORBIDDEN_PRIVATE_TABLES.includes(source.sourceType)) continue;
    if (!allowedIds.has(source.sourceId)) continue;
    if (!VALID_SOURCE_URL_PREFIXES.some((prefix) => source.url.startsWith(prefix))) continue;

    const dedupeKey = `${source.sourceType}:${source.sourceId}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    result.push(source);
  }

  return result;
}

/** Verifica que ninguna de las fuentes recuperadas provenga de una tabla
 * clínica privada. Se usa como comprobación defensiva adicional dentro del
 * propio Context Engine, aunque este nunca debería consultarlas. */
export function assertNoPrivateTables(sources: ContextSource[]): void {
  for (const source of sources) {
    if (FORBIDDEN_PRIVATE_TABLES.includes(source.sourceType)) {
      throw new Error(
        `LABDEX AI intentó usar una fuente de una tabla clínica privada: ${source.sourceType}`
      );
    }
  }
}

export function validateResponseText(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error("La respuesta generada está vacía.");
  }
  return trimmed;
}

/**
 * Elimina de un mensaje de error cualquier fragmento que parezca una clave
 * o token (cadenas largas alfanuméricas) antes de registrarlo o, en el
 * futuro, de mostrarlo. Los mensajes que sí se muestran al usuario ya son
 * fijos y amigables (ver app/api/labdex-ai/chat/route.ts), pero esta
 * función es una segunda capa de defensa si algún día se registra el
 * mensaje original de un error de Gemini.
 */
export function redactPotentialSecrets(message: string): string {
  return message.replace(/[A-Za-z0-9_-]{24,}/g, "[REDACTADO]");
}
