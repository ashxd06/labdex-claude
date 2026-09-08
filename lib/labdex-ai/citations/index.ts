import type { ContextSource, LabdexSourceType } from "@/lib/labdex-ai/types";

/**
 * Capa reutilizable de fuentes/citas (Fase 5, §7).
 *
 * Esta capa NO decide si una fuente es válida (eso lo hace
 * `lib/labdex-ai/validation`); solo se encarga de dar forma a los
 * `ContextSource[]` para mostrarlos en la interfaz (agrupados y con una
 * etiqueta legible por tipo).
 */

export const SOURCE_TYPE_LABELS: Record<LabdexSourceType, string> = {
  microorganism: "Microbiología",
  culture_media: "Medios de cultivo",
  test: "Pruebas de laboratorio",
  procedure: "Procedimientos",
  analysis: "Análisis clínicos",
  document: "Documentos",
};

export interface SourceGroup {
  sourceType: LabdexSourceType;
  label: string;
  sources: ContextSource[];
}

/** Agrupa fuentes por tipo, en el orden en que aparecen por primera vez. */
export function groupSourcesByType(sources: ContextSource[]): SourceGroup[] {
  const order: LabdexSourceType[] = [];
  const map = new Map<LabdexSourceType, ContextSource[]>();

  for (const source of sources) {
    if (!map.has(source.sourceType)) {
      map.set(source.sourceType, []);
      order.push(source.sourceType);
    }
    map.get(source.sourceType)!.push(source);
  }

  return order.map((sourceType) => ({
    sourceType,
    label: SOURCE_TYPE_LABELS[sourceType],
    sources: map.get(sourceType)!,
  }));
}

/** Forma "ligera" de una fuente, segura para enviar al cliente (sin el
 * fragmento de contenido completo usado internamente para el prompt). */
export interface ClientSource {
  sourceType: LabdexSourceType;
  sourceId: string;
  title: string;
  category: string | null;
  url: string;
}

export function toClientSources(sources: ContextSource[]): ClientSource[] {
  return sources.map((s) => ({
    sourceType: s.sourceType,
    sourceId: s.sourceId,
    title: s.title,
    category: s.category,
    url: s.url,
  }));
}
