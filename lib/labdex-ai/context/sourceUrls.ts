import { KIND_VALUE_TO_SLUG } from "@/lib/content/kindSlugs";
import type { LabdexSourceType } from "@/lib/labdex-ai/types";
import type { MicroorganismKind } from "@/lib/supabase/types";

/**
 * Construye la URL pública real de una fuente de LABDEX a partir de su slug.
 *
 * REGLA (Fase 5, §7): nunca se inventan rutas. Cada rama de este switch
 * reproduce exactamente los mismos patrones de URL que ya usa
 * `app/api/search/route.ts` para el buscador del header, que a su vez son
 * los mismos que las páginas de detalle públicas en `app/contenido/*`.
 *
 * `documents` es la única excepción: hoy no existe una página de detalle
 * por slug (`app/contenido/documentos` solo tiene un listado), así que se
 * enlaza al listado en vez de fabricar una ruta que no existe.
 */
export function buildSourceUrl(
  sourceType: LabdexSourceType,
  slug: string,
  extra?: { microorganismKind?: MicroorganismKind }
): string {
  switch (sourceType) {
    case "microorganism": {
      const kindSlug = extra?.microorganismKind
        ? KIND_VALUE_TO_SLUG[extra.microorganismKind]
        : undefined;
      return kindSlug ? `/contenido/microbiologia/${kindSlug}/${slug}` : `/contenido/microbiologia`;
    }
    case "culture_media":
      return `/contenido/medios/${slug}`;
    case "test":
      return `/contenido/pruebas/${slug}`;
    case "procedure":
      return `/contenido/procedimientos/${slug}`;
    case "analysis":
      return `/contenido/analisis/${slug}`;
    case "document":
      return `/contenido/documentos`;
    default:
      return `/contenido`;
  }
}

/** Prefijos de ruta internos válidos. Usado por la capa de validación para
 * rechazar cualquier URL que no apunte al propio LABDEX. */
export const VALID_SOURCE_URL_PREFIXES = [
  "/contenido/microbiologia",
  "/contenido/medios",
  "/contenido/pruebas",
  "/contenido/procedimientos",
  "/contenido/analisis",
  "/contenido/documentos",
];
