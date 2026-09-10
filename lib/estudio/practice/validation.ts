import type { MaterialPageEntry } from "@/lib/estudio/types";
import type { RawFlashcard, RawQuestion, ExamDifficulty } from "@/lib/estudio/practice/types";

/**
 * Validación de contenido generado por Gemini antes de guardarlo (Fase 6.1,
 * §42-44): "no confiar ciegamente en JSON generado por la IA". Cada
 * función devuelve `null` cuando el ítem no es válido; el llamador
 * simplemente lo descarta en vez de guardarlo, sin abortar el resto del
 * lote (mismo espíritu que el pipeline de análisis de Fase 6.0).
 */

const VALID_DIFFICULTIES: ExamDifficulty[] = ["easy", "normal", "hard"];

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/** Comprueba que un `source_pages` generado por el modelo corresponde a
 * páginas que realmente existen en el índice del material (Fase 6.1, §13,
 * §26: nunca inventar páginas). Extrae los números del string ("12",
 * "12-14", "12, 15") y valida cada uno individualmente; si ninguno es
 * válido, se descarta el campo completo en vez de la tarjeta/pregunta. */
export function sanitizeSourcePages(raw: unknown, pageIndex: MaterialPageEntry[]): string | null {
  if (!isNonEmptyString(raw)) return null;
  if (pageIndex.length === 0) return null;

  const validPages = new Set(pageIndex.map((p) => p.page));
  const numbers = raw.match(/\d+/g);
  if (!numbers || numbers.length === 0) return null;

  const validNumbers = numbers.map((n) => Number(n)).filter((n) => validPages.has(n));
  if (validNumbers.length === 0) return null;

  const min = Math.min(...validNumbers);
  const max = Math.max(...validNumbers);
  return min === max ? String(min) : `${min}-${max}`;
}

export interface ValidatedFlashcard {
  question: string;
  answer: string;
  sourcePages: string | null;
}

const MAX_QUESTION_LENGTH = 300;
const MAX_ANSWER_LENGTH = 1200;

export function validateFlashcard(raw: RawFlashcard, pageIndex: MaterialPageEntry[]): ValidatedFlashcard | null {
  if (!isNonEmptyString(raw.question) || !isNonEmptyString(raw.answer)) return null;

  const question = raw.question.trim();
  const answer = raw.answer.trim();
  if (question.length > MAX_QUESTION_LENGTH || answer.length > MAX_ANSWER_LENGTH) return null;

  return {
    question,
    answer,
    sourcePages: sanitizeSourcePages(raw.source_pages, pageIndex),
  };
}

export function deduplicateFlashcards(cards: ValidatedFlashcard[]): ValidatedFlashcard[] {
  const seen = new Set<string>();
  const result: ValidatedFlashcard[] = [];
  for (const card of cards) {
    const key = card.question.toLowerCase().replace(/\s+/g, " ").trim();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(card);
  }
  return result;
}

export interface ValidatedQuestion {
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
  sourcePages: string | null;
  difficulty: ExamDifficulty;
}

const MIN_OPTIONS = 4;
const MAX_OPTIONS = 4;

/**
 * Valida una pregunta cruda contra las reglas de Fase 6.1, §43:
 * - existe pregunta y explicación
 * - existen exactamente 4 opciones, todas con texto, sin duplicados obvios
 * - el índice de respuesta correcta cae dentro del rango de opciones
 */
export function validateQuestion(raw: RawQuestion, pageIndex: MaterialPageEntry[]): ValidatedQuestion | null {
  if (!isNonEmptyString(raw.question) || !isNonEmptyString(raw.explanation)) return null;
  if (!Array.isArray(raw.options)) return null;

  const options = raw.options.filter(isNonEmptyString).map((o) => o.trim());
  if (options.length < MIN_OPTIONS || options.length > MAX_OPTIONS) return null;

  const uniqueOptions = new Set(options.map((o) => o.toLowerCase()));
  if (uniqueOptions.size !== options.length) return null; // opciones duplicadas

  const correctAnswerIndex = Number(raw.correct_answer);
  if (!Number.isInteger(correctAnswerIndex) || correctAnswerIndex < 0 || correctAnswerIndex >= options.length) {
    return null;
  }

  const difficulty = VALID_DIFFICULTIES.includes(raw.difficulty as ExamDifficulty)
    ? (raw.difficulty as ExamDifficulty)
    : "normal";

  return {
    question: raw.question.trim(),
    options,
    correctAnswerIndex,
    explanation: raw.explanation.trim(),
    sourcePages: sanitizeSourcePages(raw.source_pages, pageIndex),
    difficulty,
  };
}

export function deduplicateQuestions(questions: ValidatedQuestion[]): ValidatedQuestion[] {
  const seen = new Set<string>();
  const result: ValidatedQuestion[] = [];
  for (const q of questions) {
    const key = q.question.toLowerCase().replace(/\s+/g, " ").trim();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(q);
  }
  return result;
}
