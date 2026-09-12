import type { MasteryLevel, Recommendation, TopicMastery } from "@/lib/estudio/adaptive/types";
import { sortTopicsForDisplay } from "@/lib/estudio/adaptive/mastery";
import { GENERAL_TOPIC } from "@/lib/estudio/adaptive/topics";

/**
 * Recomendaciones textuales (Fase 6.2, §15, §18). Deliberadamente
 * plantillas fijas en código, no generadas por IA: son una consecuencia
 * directa y determinística del dominio ya calculado (§3 — "no generar
 * recomendaciones genéricas", y estas no lo son porque siempre citan un
 * tema y un porcentaje reales), y evita una llamada a IA por cada vez que
 * el estudiante abre el workspace (§14).
 */

const MAX_RECOMMENDATIONS = 3;
const SUGGESTED_COUNT_BY_LEVEL: Record<MasteryLevel, number> = {
  necesita_repaso: 10,
  en_progreso: 10,
  dominado: 5,
};

function messageFor(topic: TopicMastery): string {
  const label = topic.topic === GENERAL_TOPIC ? "este material" : topic.topic;
  switch (topic.level) {
    case "necesita_repaso":
      return `Tienes dificultad en ${label} (${topic.accuracyPercent}%). Te recomendamos practicar.`;
    case "en_progreso":
      return `Estás progresando en ${label} (${topic.accuracyPercent}%). Un poco más de práctica te ayudará a dominarlo.`;
    case "dominado":
      return `Dominas bien ${label} (${topic.accuracyPercent}%). Puedes intentar preguntas de mayor dificultad.`;
    default:
      return `Todavía no hay suficiente información sobre ${label}.`;
  }
}

/**
 * Construye hasta `MAX_RECOMMENDATIONS` recomendaciones, priorizando los
 * temas más débiles con datos suficientes. Los temas sin datos suficientes
 * (§24-26) nunca generan una recomendación — mostrarían una debilidad
 * inventada.
 */
export function buildRecommendations(topics: TopicMastery[]): Recommendation[] {
  const withData = sortTopicsForDisplay(topics).filter((t) => t.hasEnoughData && t.level);

  return withData.slice(0, MAX_RECOMMENDATIONS).map((topic) => ({
    topic: topic.topic,
    level: topic.level as MasteryLevel,
    accuracyPercent: topic.accuracyPercent,
    message: messageFor(topic),
    suggestedCount: SUGGESTED_COUNT_BY_LEVEL[topic.level as MasteryLevel],
  }));
}
