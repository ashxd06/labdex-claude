import { describe, expect, it } from "vitest";
import { computeFlashcardPriority, sortFlashcardsByPriority } from "@/lib/estudio/adaptive/flashcardPriority";
import type { FlashcardPerformanceInput } from "@/lib/estudio/adaptive/types";

const NOW = new Date("2026-09-11T00:00:00.000Z");

function card(overrides: Partial<FlashcardPerformanceInput>): FlashcardPerformanceInput {
  return { id: "c1", timesSeen: 0, timesKnown: 0, lastKnown: null, lastReviewedAt: null, ...overrides };
}

describe("computeFlashcardPriority", () => {
  it("gives never-seen cards the top baseline priority", () => {
    const neverSeen = computeFlashcardPriority(card({}), NOW);
    const masteredFresh = computeFlashcardPriority(
      card({ timesSeen: 10, timesKnown: 10, lastKnown: true, lastReviewedAt: "2026-09-10T00:00:00.000Z" }),
      NOW
    );
    expect(neverSeen).toBeGreaterThan(masteredFresh);
  });

  it("a hard, recently-failed card gets high priority", () => {
    const failed = computeFlashcardPriority(
      card({ timesSeen: 5, timesKnown: 1, lastKnown: false, lastReviewedAt: NOW.toISOString() }),
      NOW
    );
    const known = computeFlashcardPriority(
      card({ timesSeen: 5, timesKnown: 5, lastKnown: true, lastReviewedAt: NOW.toISOString() }),
      NOW
    );
    expect(failed).toBeGreaterThan(known);
  });

  it("a mastered card reviewed yesterday gets low priority", () => {
    const yesterday = new Date(NOW.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const score = computeFlashcardPriority(card({ timesSeen: 10, timesKnown: 10, lastKnown: true, lastReviewedAt: yesterday }), NOW);
    expect(score).toBeLessThan(10);
  });

  it("a mastered card not reviewed in a long time gets medium priority (retention check), higher than one reviewed yesterday", () => {
    const longAgo = new Date(NOW.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString();
    const yesterday = new Date(NOW.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const stale = computeFlashcardPriority(card({ timesSeen: 10, timesKnown: 10, lastKnown: true, lastReviewedAt: longAgo }), NOW);
    const fresh = computeFlashcardPriority(card({ timesSeen: 10, timesKnown: 10, lastKnown: true, lastReviewedAt: yesterday }), NOW);
    expect(stale).toBeGreaterThan(fresh);
    // Pero sigue siendo menor que una tarjeta activamente fallada.
    const failed = computeFlashcardPriority(card({ timesSeen: 10, timesKnown: 2, lastKnown: false, lastReviewedAt: NOW.toISOString() }), NOW);
    expect(stale).toBeLessThan(failed);
  });

  it("never returns a non-positive priority (cards are never fully deprioritized to zero)", () => {
    const score = computeFlashcardPriority(
      card({ timesSeen: 20, timesKnown: 20, lastKnown: true, lastReviewedAt: NOW.toISOString() }),
      NOW
    );
    expect(score).toBeGreaterThanOrEqual(0);
  });
});

describe("sortFlashcardsByPriority", () => {
  it("orders never-seen and failed cards ahead of mastered ones, without removing any", () => {
    const cards = [
      card({ id: "mastered", timesSeen: 10, timesKnown: 10, lastKnown: true, lastReviewedAt: NOW.toISOString() }),
      card({ id: "new" }),
      card({ id: "failed", timesSeen: 3, timesKnown: 0, lastKnown: false, lastReviewedAt: NOW.toISOString() }),
    ];
    const sorted = sortFlashcardsByPriority(cards, NOW);
    expect(sorted).toHaveLength(3);
    expect(sorted[sorted.length - 1].id).toBe("mastered");
    expect(sorted.slice(0, 2).map((c) => c.id).sort()).toEqual(["failed", "new"]);
  });

  it("is deterministic for equal priorities (tie-break by id)", () => {
    const cards = [card({ id: "b" }), card({ id: "a" })];
    const sorted = sortFlashcardsByPriority(cards, NOW);
    expect(sorted.map((c) => c.id)).toEqual(["a", "b"]);
  });
});
