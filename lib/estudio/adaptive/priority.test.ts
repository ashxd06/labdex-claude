import { describe, expect, it } from "vitest";
import {
  computeQuestionPriority,
  daysBetween,
  targetDifficultyMix,
  selectAdaptiveQuestionIds,
} from "@/lib/estudio/adaptive/priority";
import type { QuestionForAdaptive, QuestionPerformance } from "@/lib/estudio/adaptive/types";

const NOW = new Date("2026-09-11T00:00:00.000Z");

describe("daysBetween", () => {
  it("computes whole days elapsed", () => {
    expect(daysBetween("2026-09-01T00:00:00.000Z", NOW)).toBeCloseTo(10, 5);
  });

  it("returns Infinity for null (never happened)", () => {
    expect(daysBetween(null, NOW)).toBe(Infinity);
  });

  it("never returns negative (clamped at 0)", () => {
    expect(daysBetween("2026-09-12T00:00:00.000Z", NOW)).toBe(0);
  });
});

describe("computeQuestionPriority", () => {
  it("gives never-answered questions the highest baseline priority", () => {
    const neverAnswered = computeQuestionPriority(undefined, 0.9, NOW);
    const answeredWell: QuestionPerformance = {
      questionId: "q",
      timesAnswered: 10,
      timesCorrect: 10,
      lastAnsweredAt: NOW.toISOString(),
      lastCorrect: true,
    };
    const masteredAndFresh = computeQuestionPriority(answeredWell, 0.9, NOW);
    expect(neverAnswered).toBeGreaterThan(masteredAndFresh);
  });

  it("prioritizes a question answered incorrectly last time over one answered correctly", () => {
    const wrongLast: QuestionPerformance = {
      questionId: "q1",
      timesAnswered: 5,
      timesCorrect: 3,
      lastAnsweredAt: NOW.toISOString(),
      lastCorrect: false,
    };
    const correctLast: QuestionPerformance = {
      questionId: "q2",
      timesAnswered: 5,
      timesCorrect: 3,
      lastAnsweredAt: NOW.toISOString(),
      lastCorrect: true,
    };
    expect(computeQuestionPriority(wrongLast, 0.5, NOW)).toBeGreaterThan(computeQuestionPriority(correctLast, 0.5, NOW));
  });

  it("prioritizes questions from weak topics over strong topics, all else equal", () => {
    const perf: QuestionPerformance = {
      questionId: "q",
      timesAnswered: 5,
      timesCorrect: 4,
      lastAnsweredAt: NOW.toISOString(),
      lastCorrect: true,
    };
    const weakTopic = computeQuestionPriority(perf, 0.2, NOW);
    const strongTopic = computeQuestionPriority(perf, 0.95, NOW);
    expect(weakTopic).toBeGreaterThan(strongTopic);
  });

  it("gives higher priority to a question not practiced in a long time than one practiced recently, all else equal", () => {
    const stale: QuestionPerformance = {
      questionId: "q1",
      timesAnswered: 5,
      timesCorrect: 5,
      lastAnsweredAt: "2026-01-01T00:00:00.000Z",
      lastCorrect: true,
    };
    const fresh: QuestionPerformance = {
      questionId: "q2",
      timesAnswered: 5,
      timesCorrect: 5,
      lastAnsweredAt: NOW.toISOString(),
      lastCorrect: true,
    };
    expect(computeQuestionPriority(stale, 0.5, NOW)).toBeGreaterThan(computeQuestionPriority(fresh, 0.5, NOW));
  });

  it("never assigns a zero or negative priority to a mastered question (never fully removed from rotation)", () => {
    const mastered: QuestionPerformance = {
      questionId: "q",
      timesAnswered: 20,
      timesCorrect: 20,
      lastAnsweredAt: NOW.toISOString(),
      lastCorrect: true,
    };
    expect(computeQuestionPriority(mastered, 0.95, NOW)).toBeGreaterThan(0);
  });
});

describe("targetDifficultyMix", () => {
  it("favors easy/normal for low performance", () => {
    const mix = targetDifficultyMix(0.3);
    expect(mix.easy).toBeGreaterThan(mix.hard);
  });

  it("is balanced with some hard for medium performance", () => {
    const mix = targetDifficultyMix(0.65);
    expect(mix.normal).toBeGreaterThanOrEqual(mix.easy);
    expect(mix.hard).toBeGreaterThan(0);
  });

  it("favors normal/hard for high performance", () => {
    const mix = targetDifficultyMix(0.9);
    expect(mix.hard).toBeGreaterThan(mix.easy);
  });

  it("every mix sums to 1", () => {
    for (const score of [0.1, 0.4, 0.6, 0.85, 1]) {
      const mix = targetDifficultyMix(score);
      expect(mix.easy + mix.normal + mix.hard).toBeCloseTo(1, 5);
    }
  });
});

function q(id: string, difficulty: "easy" | "normal" | "hard"): QuestionForAdaptive {
  return { id, sourcePages: null, difficulty };
}

describe("selectAdaptiveQuestionIds", () => {
  it("returns up to `count` unique question ids", () => {
    const questions = Array.from({ length: 20 }, (_, i) => q(`q${i}`, "normal"));
    const result = selectAdaptiveQuestionIds(questions, new Map(), new Map(), new Map(), 0.5, 10, NOW);
    expect(result).toHaveLength(10);
    expect(new Set(result).size).toBe(10);
  });

  it("returns fewer than `count` when there simply aren't enough questions", () => {
    const questions = [q("q1", "normal"), q("q2", "easy")];
    const result = selectAdaptiveQuestionIds(questions, new Map(), new Map(), new Map(), 0.5, 10, NOW);
    expect(result).toHaveLength(2);
  });

  it("prioritizes never-answered and recently-wrong questions first", () => {
    const questions = [q("mastered", "normal"), q("wrong", "normal"), q("new", "normal")];
    const performance = new Map<string, QuestionPerformance>([
      ["mastered", { questionId: "mastered", timesAnswered: 10, timesCorrect: 10, lastAnsweredAt: NOW.toISOString(), lastCorrect: true }],
      ["wrong", { questionId: "wrong", timesAnswered: 3, timesCorrect: 1, lastAnsweredAt: NOW.toISOString(), lastCorrect: false }],
    ]);
    const result = selectAdaptiveQuestionIds(questions, performance, new Map(), new Map(), 0.7, 2, NOW);
    expect(result).toEqual(expect.arrayContaining(["wrong", "new"]));
    expect(result).not.toContain("mastered");
  });

  it("is deterministic: same input always yields the same output", () => {
    const questions = Array.from({ length: 8 }, (_, i) => q(`q${i}`, "normal"));
    const a = selectAdaptiveQuestionIds(questions, new Map(), new Map(), new Map(), 0.5, 5, NOW);
    const b = selectAdaptiveQuestionIds(questions, new Map(), new Map(), new Map(), 0.5, 5, NOW);
    expect(a).toEqual(b);
  });

  it("fills remaining slots from other difficulties when one difficulty runs out", () => {
    // Solo hay preguntas 'easy'; incluso con un score alto (que pide sobre
    // todo normal/hard), debe devolver `count` preguntas igual.
    const questions = Array.from({ length: 5 }, (_, i) => q(`q${i}`, "easy"));
    const result = selectAdaptiveQuestionIds(questions, new Map(), new Map(), new Map(), 0.9, 5, NOW);
    expect(result).toHaveLength(5);
  });
});
