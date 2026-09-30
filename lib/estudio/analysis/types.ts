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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Rechaza respuestas del modelo que no cubren exactamente el lote solicitado. */
export function validateChunkAnalysisResult(
  value: unknown,
  range: { startPage: number; endPage: number }
): ChunkAnalysisResult | null {
  if (!isRecord(value) || !Array.isArray(value.pages) || !Array.isArray(value.notableConcepts)) return null;

  const expectedPages = range.endPage - range.startPage + 1;
  if (value.pages.length !== expectedPages) return null;

  const seenPages = new Set<number>();
  const pages: ChunkPageResult[] = [];
  for (const item of value.pages) {
    if (
      !isRecord(item) ||
      !Number.isInteger(item.page) ||
      (item.page as number) < range.startPage ||
      (item.page as number) > range.endPage ||
      typeof item.text !== "string" ||
      item.text.length > 12000 ||
      typeof item.unclear !== "boolean" ||
      seenPages.has(item.page as number)
    ) {
      return null;
    }
    seenPages.add(item.page as number);
    pages.push({ page: item.page as number, text: item.text.trim(), unclear: item.unclear });
  }

  if (seenPages.size !== expectedPages) return null;

  const notableConcepts: ChunkAnalysisResult["notableConcepts"] = [];
  for (const item of value.notableConcepts) {
    if (
      !isRecord(item) ||
      typeof item.concept !== "string" ||
      !item.concept.trim() ||
      item.concept.length > 1000 ||
      !Number.isInteger(item.page) ||
      (item.page as number) < range.startPage ||
      (item.page as number) > range.endPage
    ) {
      return null;
    }
    notableConcepts.push({ concept: item.concept.trim(), page: item.page as number });
  }

  return { pages: pages.sort((a, b) => a.page - b.page), notableConcepts };
}

/** Valida la estructura esencial de la síntesis antes de marcar el PDF como listo. */
export function validateSynthesisResult(value: unknown): SynthesisResult | null {
  if (!isRecord(value)) return null;
  const { summary, keyConcepts, mustRemember, simpleExplanation } = value;
  if (
    !Array.isArray(summary) ||
    summary.length === 0 ||
    !Array.isArray(keyConcepts) ||
    !Array.isArray(mustRemember) ||
    typeof simpleExplanation !== "string" ||
    !simpleExplanation.trim()
  ) {
    return null;
  }

  const validSummary = summary.every(
    (item) => isRecord(item) && typeof item.heading === "string" && !!item.heading.trim() && typeof item.content === "string" && !!item.content.trim()
  );
  const validConcepts = keyConcepts.every(
    (item) =>
      isRecord(item) &&
      typeof item.term === "string" && !!item.term.trim() &&
      typeof item.definition === "string" && !!item.definition.trim() &&
      (item.pages === null || typeof item.pages === "string")
  );
  const validReminders = mustRemember.every(
    (item) => isRecord(item) && typeof item.text === "string" && !!item.text.trim() && (item.pages === null || typeof item.pages === "string")
  );
  const notes = value.notes === undefined ? [] : value.notes;
  if (!validSummary || !validConcepts || !validReminders || !Array.isArray(notes) || !notes.every((note) => typeof note === "string")) {
    return null;
  }

  return {
    summary: summary as SynthesisResult["summary"],
    keyConcepts: keyConcepts as SynthesisResult["keyConcepts"],
    mustRemember: mustRemember as SynthesisResult["mustRemember"],
    simpleExplanation: simpleExplanation.trim(),
    notes: notes.map((note) => note.trim()).filter(Boolean),
  };
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
