import type {
  MasteryCounts,
  MasteryLevel,
  QuestionPerformance,
  TopicMastery,
  TopicStats,
} from "@/lib/estudio/adaptive/types";
import { GENERAL_TOPIC } from "@/lib/estudio/adaptive/topics";

/**
 * Fórmula de dominio de Fase 6.2 (§5-6, §25). Deliberadamente simple:
 *
 *   score = 0.6 × precisión histórica + 0.4 × precisión reciente
 *
 * La precisión histórica usa TODO el historial de respuestas del tema; la
 * "reciente" usa solo las últimas `RECENT_WINDOW` respuestas de ese tema.
 * Mezclar ambas es lo que evita que un único examen cambie de golpe el
 * estado (§5: "Evitar que un solo examen cambie completamente el estado")
 * sin dejar de reaccionar a una mejora o caída reciente sostenida.
 *
 * Umbrales (documentados aquí, no mágicos):
 *   - menos de MIN_ANSWERS_FOR_SIGNAL (5) respuestas → sin datos
 *     suficientes (§25); no se asigna nivel.
 *   - score < 0.5 → "necesita_repaso"
 *   - 0.5 ≤ score < 0.8 → "en_progreso"
 *   - score ≥ 0.8 → "dominado"
 */

export const MIN_ANSWERS_FOR_SIGNAL = 5;
export const RECENT_WINDOW = 5;
export const OVERALL_WEIGHT = 0.6;
export const RECENT_WEIGHT = 0.4;
export const LEVEL_THRESHOLD_LOW = 0.5;
export const LEVEL_THRESHOLD_HIGH = 0.8;

export function computeAccuracy(correct: number, answered: number): number {
  if (answered <= 0) return 0;
  return correct / answered;
}

export function computeMasteryScore(overallAccuracy: number, recentAccuracy: number): number {
  const score = OVERALL_WEIGHT * overallAccuracy + RECENT_WEIGHT * recentAccuracy;
  return Math.min(1, Math.max(0, score));
}

export function scoreToLevel(score: number): MasteryLevel {
  if (score < LEVEL_THRESHOLD_LOW) return "necesita_repaso";
  if (score < LEVEL_THRESHOLD_HIGH) return "en_progreso";
  return "dominado";
}

export function computeTopicMastery(stats: TopicStats): TopicMastery {
  const hasEnoughData = stats.timesAnswered >= MIN_ANSWERS_FOR_SIGNAL;
  const overallAccuracy = computeAccuracy(stats.timesCorrect, stats.timesAnswered);
  const recentAccuracy = computeAccuracy(stats.recentTimesCorrect, stats.recentTimesAnswered);
  // Sin respuestas recientes (tema no tocado últimamente), usar el
  // histórico como única señal en vez de penalizar por "0 recientes".
  const effectiveRecent = stats.recentTimesAnswered > 0 ? recentAccuracy : overallAccuracy;
  const score = computeMasteryScore(overallAccuracy, effectiveRecent);

  return {
    topic: stats.topic,
    questionIds: stats.questionIds,
    timesAnswered: stats.timesAnswered,
    accuracyPercent: Math.round(overallAccuracy * 100),
    score,
    level: hasEnoughData ? scoreToLevel(score) : null,
    hasEnoughData,
  };
}

/**
 * Agrupa el desempeño por pregunta en estadísticas por tema, tomando la
 * "ventana reciente" como las últimas `RECENT_WINDOW` respuestas de CADA
 * pregunta del tema (no de todo el tema junto), para que preguntas
 * practicadas hace tiempo no cuenten como "recientes" solo porque el tema
 * tuvo actividad en otra pregunta.
 */
export function buildTopicStats(
  topicToQuestionIds: Map<string, string[]>,
  performanceByQuestion: Map<string, QuestionPerformance>
): TopicStats[] {
  const result: TopicStats[] = [];
  for (const [topic, questionIds] of topicToQuestionIds) {
    let timesAnswered = 0;
    let timesCorrect = 0;
    let recentTimesAnswered = 0;
    let recentTimesCorrect = 0;

    for (const id of questionIds) {
      const perf = performanceByQuestion.get(id);
      if (!perf || perf.timesAnswered === 0) continue;
      timesAnswered += perf.timesAnswered;
      timesCorrect += perf.timesCorrect;
      // Aproximación simple: la "respuesta más reciente" de cada pregunta
      // cuenta como una muestra de la ventana reciente del tema. No se
      // guarda el historial completo por pregunta (solo el agregado, ver
      // queries.ts), así que esto es lo más fino que se puede calcular sin
      // una tabla nueva.
      recentTimesAnswered += 1;
      if (perf.lastCorrect) recentTimesCorrect += 1;
    }

    result.push({ topic, questionIds, timesAnswered, timesCorrect, recentTimesAnswered, recentTimesCorrect });
  }
  return result;
}

export function computeMasteryCounts(topics: TopicMastery[]): MasteryCounts {
  const counts: MasteryCounts = { dominado: 0, en_progreso: 0, necesita_repaso: 0 };
  for (const topic of topics) {
    if (topic.level) counts[topic.level] += 1;
  }
  return counts;
}

/** Ordena temas para mostrarlos como "puntos débiles": primero los que
 * tienen datos suficientes, del peor al mejor; los sin datos van al final,
 * y "General" (sin concepto identificado) siempre al final de su grupo. */
export function sortTopicsForDisplay(topics: TopicMastery[]): TopicMastery[] {
  return [...topics].sort((a, b) => {
    if (a.hasEnoughData !== b.hasEnoughData) return a.hasEnoughData ? -1 : 1;
    if (a.topic === GENERAL_TOPIC && b.topic !== GENERAL_TOPIC) return 1;
    if (b.topic === GENERAL_TOPIC && a.topic !== GENERAL_TOPIC) return -1;
    if (a.score !== b.score) return a.score - b.score;
    return a.topic.localeCompare(b.topic);
  });
}
