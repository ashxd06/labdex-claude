import type { KeyConcept } from "@/lib/estudio/types";
import type { QuestionForAdaptive } from "@/lib/estudio/adaptive/types";

/**
 * "Tema" de una pregunta (Fase 6.2, §8): el material no tiene una
 * taxonomía de conceptos dedicada, así que no se inventa una. Se reutiliza
 * lo que YA existe de Fase 6.0: `study_materials.content_json.keyConcepts`,
 * cada uno con un `term` (p. ej. "Metabolismo bacteriano") y un rango de
 * páginas opcional. Una pregunta se asocia al primer concepto cuyo rango de
 * páginas se solape con el de la pregunta; si no hay ningún solapamiento
 * (o la pregunta no tiene `source_pages`), cae en el bucket "General" en
 * vez de fabricar un tema falso.
 */

export const GENERAL_TOPIC = "General";

interface PageRange {
  min: number;
  max: number;
}

/** Extrae los números de un string de páginas ("12", "12-14", "12, 15") y
 * devuelve el rango que cubren. Reutiliza la misma idea de
 * `lib/estudio/practice/validation.ts` (extraer todos los números, tomar
 * min/max), sin depender de ese módulo para no acoplar capas. */
export function parsePageRange(pages: string | null | undefined): PageRange | null {
  if (!pages) return null;
  const numbers = pages.match(/\d+/g);
  if (!numbers || numbers.length === 0) return null;
  const values = numbers.map(Number);
  return { min: Math.min(...values), max: Math.max(...values) };
}

export function rangesOverlap(a: PageRange, b: PageRange): boolean {
  return a.min <= b.max && b.min <= a.max;
}

/**
 * Determina el tema de una pregunta/flashcard a partir de su
 * `source_pages` y la lista de conceptos clave del material. Determinístico
 * y puro: mismo input, mismo tema, siempre.
 */
export function deriveTopic(sourcePages: string | null, keyConcepts: KeyConcept[]): string {
  const questionRange = parsePageRange(sourcePages);
  if (!questionRange) return GENERAL_TOPIC;

  for (const concept of keyConcepts) {
    const conceptRange = parsePageRange(concept.pages);
    if (conceptRange && rangesOverlap(questionRange, conceptRange)) {
      return concept.term;
    }
  }
  return GENERAL_TOPIC;
}

/** Agrupa un conjunto de preguntas por tema. Devuelve un mapa
 * tema -> ids de pregunta, en el orden en que aparecieron. */
export function groupQuestionIdsByTopic(
  questions: QuestionForAdaptive[],
  keyConcepts: KeyConcept[]
): Map<string, string[]> {
  const groups = new Map<string, string[]>();
  for (const question of questions) {
    const topic = deriveTopic(question.sourcePages, keyConcepts);
    const existing = groups.get(topic);
    if (existing) {
      existing.push(question.id);
    } else {
      groups.set(topic, [question.id]);
    }
  }
  return groups;
}
