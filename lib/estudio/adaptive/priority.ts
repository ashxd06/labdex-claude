import type { ExamDifficulty } from "@/lib/estudio/practice/types";
import type { QuestionForAdaptive, QuestionPerformance } from "@/lib/estudio/adaptive/types";

/**
 * Priorización determinística de preguntas para el Repaso Inteligente
 * (Fase 6.2, §9-11). Cada pregunta recibe un puntaje de prioridad (número,
 * mayor = se debe practicar antes); nunca se le pide esto a la IA (§3, §14).
 *
 * Señales que SUMAN prioridad:
 *   - nunca respondida               → NEVER_ANSWERED_BONUS
 *   - la última respuesta fue mala   → WRONG_LAST_BONUS
 *   - baja precisión propia          → hasta OWN_ACCURACY_WEIGHT (peor precisión = más)
 *   - tema débil                     → hasta WEAK_TOPIC_MAX_BONUS (peor score de tema = más)
 *   - tiempo sin practicarse         → hasta STALENESS_MAX_BONUS (satura a los STALENESS_DAYS_FOR_MAX días)
 *
 * Nada de esto ELIMINA una pregunta dominada de la rotación (§10: "no
 * eliminar permanentemente"): incluso una pregunta perfecta conserva algo
 * de prioridad por "tiempo sin practicarse", así que eventualmente puede
 * volver a aparecer para comprobar retención (§20).
 */

export const NEVER_ANSWERED_BONUS = 50;
export const WRONG_LAST_BONUS = 40;
export const OWN_ACCURACY_WEIGHT = 30;
export const WEAK_TOPIC_MAX_BONUS = 30;
export const STALENESS_MAX_BONUS = 20;
export const STALENESS_DAYS_FOR_MAX = 21;

/** Score de tema neutral cuando no se tiene información de dominio (p. ej.
 * el tema todavía no tiene datos suficientes) — ni penaliza ni privilegia. */
const NEUTRAL_TOPIC_SCORE = 0.5;

export function daysBetween(from: string | null, to: Date): number {
  if (!from) return Number.POSITIVE_INFINITY;
  const fromDate = new Date(from);
  const diffMs = to.getTime() - fromDate.getTime();
  return Math.max(0, diffMs / (1000 * 60 * 60 * 24));
}

export function computeQuestionPriority(
  performance: QuestionPerformance | undefined,
  topicScore: number | undefined,
  now: Date = new Date()
): number {
  let score = 0;
  const effectiveTopicScore = topicScore ?? NEUTRAL_TOPIC_SCORE;

  if (!performance || performance.timesAnswered === 0) {
    score += NEVER_ANSWERED_BONUS;
  } else {
    const accuracy = performance.timesCorrect / performance.timesAnswered;
    score += (1 - accuracy) * OWN_ACCURACY_WEIGHT;
    if (performance.lastCorrect === false) {
      score += WRONG_LAST_BONUS;
    }
    const days = daysBetween(performance.lastAnsweredAt, now);
    const staleness = Number.isFinite(days) ? Math.min(days / STALENESS_DAYS_FOR_MAX, 1) : 1;
    score += staleness * STALENESS_MAX_BONUS;
  }

  score += (1 - effectiveTopicScore) * WEAK_TOPIC_MAX_BONUS;

  return score;
}

// --- Mezcla de dificultad según rendimiento general (§11) -------------------

export type DifficultyMix = Record<ExamDifficulty, number>;

/**
 * Proporción objetivo de cada dificultad según el score general (0-1) del
 * estudiante en el material. Los tres perfiles pedidos en §11:
 *   - bajo (<0.5): mayormente fácil/normal.
 *   - medio (0.5-0.8): normal, con algo de fácil y difícil.
 *   - alto (≥0.8): normal/difícil, casi nada de fácil.
 */
export function targetDifficultyMix(overallScore: number): DifficultyMix {
  if (overallScore < 0.5) return { easy: 0.5, normal: 0.4, hard: 0.1 };
  if (overallScore < 0.8) return { easy: 0.2, normal: 0.5, hard: 0.3 };
  return { easy: 0.1, normal: 0.4, hard: 0.5 };
}

interface CandidateQuestion {
  id: string;
  difficulty: ExamDifficulty;
  priority: number;
}

/**
 * Selecciona hasta `count` ids de pregunta para una sesión de Repaso
 * Inteligente (Fase 6.2, §9-11). Reparte los cupos entre dificultades según
 * `targetDifficultyMix`, tomando en cada dificultad las de mayor prioridad
 * primero; si una dificultad no tiene suficientes preguntas disponibles, el
 * cupo sobrante se rellena con las preguntas de mayor prioridad restantes
 * de cualquier dificultad, para no devolver menos de `count` si hay
 * suficientes preguntas en total.
 *
 * Determinístico: a igual prioridad, se ordena por id para que el
 * resultado sea reproducible (mismo input → mismo output), a diferencia de
 * `pickRandomIds` (que es deliberadamente aleatorio, usado en
 * práctica/examen normales).
 */
export function selectAdaptiveQuestionIds(
  questions: QuestionForAdaptive[],
  performanceByQuestion: Map<string, QuestionPerformance>,
  topicByQuestionId: Map<string, string>,
  topicScoreByTopic: Map<string, number>,
  overallScore: number,
  count: number,
  now: Date = new Date()
): string[] {
  const candidates: CandidateQuestion[] = questions.map((q) => {
    const topic = topicByQuestionId.get(q.id);
    const topicScore = topic ? topicScoreByTopic.get(topic) : undefined;
    return {
      id: q.id,
      difficulty: q.difficulty,
      priority: computeQuestionPriority(performanceByQuestion.get(q.id), topicScore, now),
    };
  });

  const byPriorityDesc = (a: CandidateQuestion, b: CandidateQuestion) =>
    b.priority - a.priority || a.id.localeCompare(b.id);

  const mix = targetDifficultyMix(overallScore);
  const byDifficulty: Record<ExamDifficulty, CandidateQuestion[]> = { easy: [], normal: [], hard: [] };
  for (const c of candidates) {
    byDifficulty[c.difficulty].push(c);
  }
  (Object.keys(byDifficulty) as ExamDifficulty[]).forEach((d) => byDifficulty[d].sort(byPriorityDesc));

  const selected = new Set<string>();
  const result: string[] = [];

  (Object.keys(mix) as ExamDifficulty[]).forEach((difficulty) => {
    const slots = Math.round(count * mix[difficulty]);
    let takenForThisDifficulty = 0;
    for (const candidate of byDifficulty[difficulty]) {
      if (takenForThisDifficulty >= slots) break;
      if (selected.has(candidate.id)) continue;
      selected.add(candidate.id);
      result.push(candidate.id);
      takenForThisDifficulty += 1;
    }
  });

  if (result.length < count) {
    const remaining = candidates.filter((c) => !selected.has(c.id)).sort(byPriorityDesc);
    for (const candidate of remaining) {
      if (result.length >= count) break;
      selected.add(candidate.id);
      result.push(candidate.id);
    }
  }

  return result.slice(0, count);
}
