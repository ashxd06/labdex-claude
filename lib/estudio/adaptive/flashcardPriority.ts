import type { FlashcardPerformanceInput } from "@/lib/estudio/adaptive/types";
import { daysBetween } from "@/lib/estudio/adaptive/priority";

/**
 * Repaso espaciado SIMPLE para flashcards (Fase 6.2, §19-20): no es SM-2,
 * no calcula un intervalo óptimo de repetición — solo un puntaje de
 * prioridad determinístico a partir de lo que ya guarda Fase 6.1
 * (`times_seen`, `times_known`, `last_known`, `last_reviewed_at`).
 *
 * Casos guía del propio encargo (§20):
 *   - difícil y fallada recientemente        → prioridad alta
 *   - dominada y revisada ayer                → prioridad baja
 *   - dominada pero no revisada hace mucho     → prioridad media (para
 *     comprobar retención, sin ser tan urgente como una que falla)
 */

export const FLASHCARD_NEVER_SEEN_BONUS = 50;
export const FLASHCARD_UNKNOWN_RATIO_WEIGHT = 30;
export const FLASHCARD_LAST_UNKNOWN_BONUS = 20;
export const FLASHCARD_STALENESS_MAX_BONUS = 20;
export const FLASHCARD_STALENESS_DAYS_FOR_MAX = 14;

export function computeFlashcardPriority(card: FlashcardPerformanceInput, now: Date = new Date()): number {
  if (card.timesSeen === 0) {
    return FLASHCARD_NEVER_SEEN_BONUS;
  }

  const knownRatio = card.timesKnown / card.timesSeen;
  let score = (1 - knownRatio) * FLASHCARD_UNKNOWN_RATIO_WEIGHT;

  if (card.lastKnown === false) {
    score += FLASHCARD_LAST_UNKNOWN_BONUS;
  }

  const days = daysBetween(card.lastReviewedAt, now);
  const staleness = Number.isFinite(days) ? Math.min(days / FLASHCARD_STALENESS_DAYS_FOR_MAX, 1) : 1;
  score += staleness * FLASHCARD_STALENESS_MAX_BONUS;

  return score;
}

/** Ordena flashcards por prioridad descendente (mayor prioridad primero),
 * determinístico (empate se resuelve por id). No elimina ninguna tarjeta:
 * solo cambia el orden en que se presentan. */
export function sortFlashcardsByPriority<T extends FlashcardPerformanceInput>(
  cards: T[],
  now: Date = new Date()
): T[] {
  return [...cards].sort((a, b) => {
    const diff = computeFlashcardPriority(b, now) - computeFlashcardPriority(a, now);
    if (diff !== 0) return diff;
    return a.id.localeCompare(b.id);
  });
}
