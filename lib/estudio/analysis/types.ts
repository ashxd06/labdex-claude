/** Formas de las respuestas JSON que se le piden a Gemini durante el
 * pipeline de análisis de documentos (Fase 6, §11). Se mantienen separadas
 * de `lib/estudio/types.ts` (que son las formas ya persistidas/combinadas)
 * porque estas son la forma "cruda" de una única llamada a Gemini. */

export interface ChunkPageResult {
  page: number;
  /** Contenido de la página condensado y parafraseado (no una transcripción
   * literal): suficiente para estudiar y para citar, sin copiar el
   * documento palabra por palabra. */
  text: string;
  unclear: boolean;
}

export interface ChunkAnalysisResult {
  pages: ChunkPageResult[];
  /** Puntos o conceptos notables observados en este lote, con su página. */
  notableConcepts: { concept: string; page: number }[];
}

export interface SynthesisResult {
  summary: { heading: string; content: string }[];
  keyConcepts: { term: string; definition: string; pages: string | null }[];
  mustRemember: { text: string; pages: string | null }[];
  simpleExplanation: string;
  /** Notas del propio modelo sobre partes que no pudo interpretar con
   * suficiente claridad (Fase 6, §10). */
  notes: string[];
}

/**
 * Extrae y parsea JSON de una respuesta de Gemini. Gemini a veces envuelve
 * el JSON en un bloque de código Markdown a pesar de pedir
 * `responseMimeType: application/json`; esta función tolera ambos casos.
 * Devuelve `null` en vez de lanzar, para que el llamador decida cómo
 * degradar (Fase 6, §30: nunca mostrar un error técnico crudo).
 */
export function safeParseJson<T>(raw: string): T | null {
  if (!raw || !raw.trim()) return null;

  const trimmed = raw.trim();
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const candidate = fenceMatch ? fenceMatch[1] : trimmed;

  try {
    return JSON.parse(candidate) as T;
  } catch {
    return null;
  }
}
