/**
 * Tipos del módulo de Práctica Inteligente (Fase 6.1): flashcards,
 * preguntas de opción múltiple e intentos (práctica/examen/repaso de
 * errores). Igual que `lib/estudio/types.ts` para el Hub de Estudio,
 * mantener las formas en un solo archivo evita duplicarlas entre el
 * pipeline de generación, las rutas de API y los componentes de UI.
 */

export type ExamDifficulty = "easy" | "normal" | "hard";
export const EXAM_DIFFICULTIES: ExamDifficulty[] = ["easy", "normal", "hard"];

export type AttemptMode = "practica" | "examen" | "repaso_errores" | "inteligente";
export type AttemptStatus = "en_progreso" | "finalizado";

// --- Flashcards -----------------------------------------------------------

export interface StudyFlashcardRecord {
  id: string;
  material_id: string;
  user_id: string;
  question: string;
  answer: string;
  source_pages: string | null;
  times_seen: number;
  times_known: number;
  last_known: boolean | null;
  last_reviewed_at: string | null;
  created_at: string;
}

export interface FlashcardView {
  id: string;
  question: string;
  answer: string;
  sourcePages: string | null;
  timesSeen: number;
  timesKnown: number;
}

export function toFlashcardView(record: StudyFlashcardRecord): FlashcardView {
  return {
    id: record.id,
    question: record.question,
    answer: record.answer,
    sourcePages: record.source_pages,
    timesSeen: record.times_seen,
    timesKnown: record.times_known,
  };
}

/** Forma cruda de una flashcard generada por Gemini, antes de validar. */
export interface RawFlashcard {
  question?: unknown;
  answer?: unknown;
  source_pages?: unknown;
}

// --- Preguntas de opción múltiple ------------------------------------------

export interface StudyQuestionRecord {
  id: string;
  material_id: string;
  user_id: string;
  question: string;
  options: string[];
  correct_answer_index: number;
  explanation: string;
  source_pages: string | null;
  difficulty: ExamDifficulty;
  created_at: string;
}

/** Vista de una pregunta SIN la respuesta correcta ni la explicación
 * (Fase 6.1, §41): lo único seguro de enviar al cliente mientras un
 * intento está en curso. */
export interface QuestionPromptView {
  id: string;
  question: string;
  options: string[];
  sourcePages: string | null;
  difficulty: ExamDifficulty;
}

/** Vista completa de una pregunta, incluida la respuesta correcta y la
 * explicación. Solo se envía al cliente DESPUÉS de responder (modo
 * práctica) o al finalizar el intento (modo examen), nunca antes. */
export interface QuestionRevealView extends QuestionPromptView {
  correctAnswerIndex: number;
  explanation: string;
}

export function toQuestionPromptView(record: StudyQuestionRecord): QuestionPromptView {
  return {
    id: record.id,
    question: record.question,
    options: record.options,
    sourcePages: record.source_pages,
    difficulty: record.difficulty,
  };
}

export function toQuestionRevealView(record: StudyQuestionRecord): QuestionRevealView {
  return {
    ...toQuestionPromptView(record),
    correctAnswerIndex: record.correct_answer_index,
    explanation: record.explanation,
  };
}

/** Forma cruda de una pregunta generada por Gemini, antes de validar
 * (Fase 6.1, §42-44). */
export interface RawQuestion {
  question?: unknown;
  options?: unknown;
  correct_answer?: unknown;
  explanation?: unknown;
  source_pages?: unknown;
  difficulty?: unknown;
}

// --- Intentos (práctica / examen / repaso de errores) ----------------------

export interface StudyExamAttemptRecord {
  id: string;
  material_id: string;
  user_id: string;
  mode: AttemptMode;
  question_ids: string[];
  total_questions: number;
  correct_count: number;
  status: AttemptStatus;
  source_attempt_id: string | null;
  started_at: string;
  finished_at: string | null;
}

export interface StudyExamAnswerRecord {
  id: string;
  attempt_id: string;
  question_id: string;
  user_id: string;
  selected_index: number;
  is_correct: boolean;
  answered_at: string;
}

export interface AttemptSummaryView {
  id: string;
  mode: AttemptMode;
  totalQuestions: number;
  correctCount: number;
  incorrectCount: number;
  scorePercent: number;
  status: AttemptStatus;
  startedAt: string;
  finishedAt: string | null;
}

export function toAttemptSummaryView(record: StudyExamAttemptRecord): AttemptSummaryView {
  const incorrectCount = record.total_questions - record.correct_count;
  return {
    id: record.id,
    mode: record.mode,
    totalQuestions: record.total_questions,
    correctCount: record.correct_count,
    incorrectCount: incorrectCount < 0 ? 0 : incorrectCount,
    scorePercent: computeScorePercent(record.correct_count, record.total_questions),
    status: record.status,
    startedAt: record.started_at,
    finishedAt: record.finished_at,
  };
}

/**
 * Cálculo determinista del puntaje (Fase 6.1, §39): siempre en código, nunca
 * pedido a Gemini. Redondeado al entero más cercano para mostrarse como
 * porcentaje.
 */
export function computeScorePercent(correct: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((correct / total) * 100);
}
