import type { ExamDifficulty } from "@/lib/estudio/practice/types";

/**
 * Tipos de Fase 6.2 (Repaso Inteligente). No se crea ninguna tabla nueva
 * para esto (ver lib/estudio/adaptive/queries.ts): todo se calcula a
 * partir de `study_questions`, `study_exam_attempts`, `study_exam_answers`
 * y `study_flashcards` (Fase 6.1) más `study_materials.content_json`
 * (Fase 6.0, de donde salen los `keyConcepts` usados como "tema").
 *
 * Principio de Fase 6.2, §3: todo lo numérico/cuantitativo de este archivo
 * y de `mastery.ts`/`priority.ts`/`flashcardPriority.ts` se calcula en
 * código, nunca pidiéndoselo a la IA.
 */

export type MasteryLevel = "necesita_repaso" | "en_progreso" | "dominado";

export const MASTERY_LEVEL_LABELS: Record<MasteryLevel, string> = {
  necesita_repaso: "Necesita repaso",
  en_progreso: "En progreso",
  dominado: "Dominado",
};

// --- Entradas (ya calculadas a partir de las tablas existentes) -----------

/** Historial agregado de una pregunta para un usuario+material, derivado de
 * `study_exam_answers` (Fase 6.1). `lastAnsweredAt`/`lastCorrect`
 * corresponden a la respuesta más reciente, no a un promedio. */
export interface QuestionPerformance {
  questionId: string;
  timesAnswered: number;
  timesCorrect: number;
  lastAnsweredAt: string | null;
  lastCorrect: boolean | null;
}

/** Una pregunta del banco, con lo mínimo necesario para agruparla por tema
 * y priorizarla — no duplica `StudyQuestionRecord`, solo toma lo que hace
 * falta para Fase 6.2. */
export interface QuestionForAdaptive {
  id: string;
  sourcePages: string | null;
  difficulty: ExamDifficulty;
}

export interface FlashcardPerformanceInput {
  id: string;
  timesSeen: number;
  timesKnown: number;
  lastKnown: boolean | null;
  lastReviewedAt: string | null;
}

// --- Salidas de los cálculos de dominio -------------------------------------

export interface TopicStats {
  topic: string;
  questionIds: string[];
  timesAnswered: number;
  timesCorrect: number;
  /** Respuestas dentro de la "ventana reciente" (ver mastery.ts), usada
   * para que un examen puntual no cambie de golpe el estado del tema
   * (Fase 6.2, §5-6). */
  recentTimesAnswered: number;
  recentTimesCorrect: number;
}

export interface TopicMastery {
  topic: string;
  questionIds: string[];
  timesAnswered: number;
  /** Porcentaje 0-100, redondeado, listo para mostrar. */
  accuracyPercent: number;
  /** Puntaje 0-1 usado internamente para ordenar/priorizar (mezcla de
   * histórico + reciente, ver mastery.ts). */
  score: number;
  /** `null` cuando no hay datos suficientes todavía (Fase 6.2, §24-26): en
   * ese caso la interfaz no debe mostrar un color de dominio inventado. */
  level: MasteryLevel | null;
  hasEnoughData: boolean;
}

export interface MasteryCounts {
  dominado: number;
  en_progreso: number;
  necesita_repaso: number;
}

export interface Recommendation {
  topic: string;
  level: MasteryLevel;
  accuracyPercent: number;
  message: string;
  suggestedCount: number;
}

export interface PerformanceSnapshot {
  hasEnoughData: boolean;
  totalAnswered: number;
  totalCorrect: number;
  overallAccuracyPercent: number;
  topics: TopicMastery[];
  masteryCounts: MasteryCounts;
  recommendations: Recommendation[];
  flashcards: {
    total: number;
    seen: number;
    known: number;
    toReinforce: number;
  };
  exams: {
    completed: number;
    bestScorePercent: number | null;
  };
  lastStudiedAt: string | null;
}
