import { describe, expect, it } from "vitest";
import {
  computeAccuracy,
  computeMasteryScore,
  scoreToLevel,
  computeTopicMastery,
  buildTopicStats,
  computeMasteryCounts,
  sortTopicsForDisplay,
  MIN_ANSWERS_FOR_SIGNAL,
} from "@/lib/estudio/adaptive/mastery";
import type { QuestionPerformance, TopicMastery, TopicStats } from "@/lib/estudio/adaptive/types";

describe("computeAccuracy", () => {
  it("computes correct/answered", () => {
    expect(computeAccuracy(8, 10)).toBe(0.8);
  });

  it("returns 0 for zero answered instead of NaN", () => {
    expect(computeAccuracy(0, 0)).toBe(0);
  });
});

describe("computeMasteryScore / scoreToLevel", () => {
  it("classifies low performance as necesita_repaso", () => {
    const score = computeMasteryScore(0.3, 0.3);
    expect(scoreToLevel(score)).toBe("necesita_repaso");
  });

  it("classifies medium performance as en_progreso", () => {
    const score = computeMasteryScore(0.65, 0.65);
    expect(scoreToLevel(score)).toBe("en_progreso");
  });

  it("classifies high performance as dominado", () => {
    const score = computeMasteryScore(0.9, 0.9);
    expect(scoreToLevel(score)).toBe("dominado");
  });

  it("weighs overall accuracy more than a single recent blip (no single exam swings the state)", () => {
    // Mucho historial bueno (0.9) pero una mala racha reciente (0.2):
    // 0.6*0.9 + 0.4*0.2 = 0.62 -> sigue en "en_progreso", no cae a "necesita_repaso".
    const score = computeMasteryScore(0.9, 0.2);
    expect(scoreToLevel(score)).toBe("en_progreso");
  });

  it("clamps the score into [0,1]", () => {
    expect(computeMasteryScore(1, 1)).toBeLessThanOrEqual(1);
    expect(computeMasteryScore(0, 0)).toBeGreaterThanOrEqual(0);
  });
});

describe("computeTopicMastery", () => {
  const baseStats: TopicStats = {
    topic: "Metabolismo bacteriano",
    questionIds: ["q1", "q2"],
    timesAnswered: 0,
    timesCorrect: 0,
    recentTimesAnswered: 0,
    recentTimesCorrect: 0,
  };

  it("reports insufficient data below MIN_ANSWERS_FOR_SIGNAL", () => {
    const stats: TopicStats = { ...baseStats, timesAnswered: MIN_ANSWERS_FOR_SIGNAL - 1, timesCorrect: 1 };
    const mastery = computeTopicMastery(stats);
    expect(mastery.hasEnoughData).toBe(false);
    expect(mastery.level).toBeNull();
  });

  it("computes a level once there is enough data", () => {
    const stats: TopicStats = {
      ...baseStats,
      timesAnswered: 10,
      timesCorrect: 9,
      recentTimesAnswered: 5,
      recentTimesCorrect: 5,
    };
    const mastery = computeTopicMastery(stats);
    expect(mastery.hasEnoughData).toBe(true);
    expect(mastery.level).toBe("dominado");
    expect(mastery.accuracyPercent).toBe(90);
  });

  it("falls back to overall accuracy when there is no recent activity", () => {
    const stats: TopicStats = {
      ...baseStats,
      timesAnswered: 10,
      timesCorrect: 3,
      recentTimesAnswered: 0,
      recentTimesCorrect: 0,
    };
    const mastery = computeTopicMastery(stats);
    expect(mastery.level).toBe("necesita_repaso");
  });
});

describe("buildTopicStats", () => {
  it("aggregates per-question performance into per-topic totals", () => {
    const topicMap = new Map([["Tema A", ["q1", "q2"]]]);
    const performance = new Map<string, QuestionPerformance>([
      ["q1", { questionId: "q1", timesAnswered: 3, timesCorrect: 2, lastAnsweredAt: "2026-01-01", lastCorrect: true }],
      ["q2", { questionId: "q2", timesAnswered: 2, timesCorrect: 0, lastAnsweredAt: "2026-01-02", lastCorrect: false }],
    ]);

    const [stats] = buildTopicStats(topicMap, performance);
    expect(stats.timesAnswered).toBe(5);
    expect(stats.timesCorrect).toBe(2);
    expect(stats.recentTimesAnswered).toBe(2); // una muestra por pregunta con actividad
    expect(stats.recentTimesCorrect).toBe(1);
  });

  it("skips questions that were never answered", () => {
    const topicMap = new Map([["Tema A", ["q1", "q2"]]]);
    const performance = new Map<string, QuestionPerformance>([
      ["q1", { questionId: "q1", timesAnswered: 0, timesCorrect: 0, lastAnsweredAt: null, lastCorrect: null }],
    ]);
    const [stats] = buildTopicStats(topicMap, performance);
    expect(stats.timesAnswered).toBe(0);
    expect(stats.recentTimesAnswered).toBe(0);
  });
});

describe("computeMasteryCounts", () => {
  it("counts only topics with a defined level", () => {
    const topics: TopicMastery[] = [
      { topic: "A", questionIds: [], timesAnswered: 10, accuracyPercent: 90, score: 0.9, level: "dominado", hasEnoughData: true },
      { topic: "B", questionIds: [], timesAnswered: 10, accuracyPercent: 40, score: 0.4, level: "necesita_repaso", hasEnoughData: true },
      { topic: "C", questionIds: [], timesAnswered: 2, accuracyPercent: 50, score: 0.5, level: null, hasEnoughData: false },
    ];
    expect(computeMasteryCounts(topics)).toEqual({ dominado: 1, en_progreso: 0, necesita_repaso: 1 });
  });
});

describe("sortTopicsForDisplay", () => {
  it("puts topics with enough data first, weakest first", () => {
    const topics: TopicMastery[] = [
      { topic: "Fuerte", questionIds: [], timesAnswered: 10, accuracyPercent: 90, score: 0.9, level: "dominado", hasEnoughData: true },
      { topic: "Débil", questionIds: [], timesAnswered: 10, accuracyPercent: 40, score: 0.4, level: "necesita_repaso", hasEnoughData: true },
      { topic: "Sin datos", questionIds: [], timesAnswered: 1, accuracyPercent: 0, score: 0, level: null, hasEnoughData: false },
    ];
    const sorted = sortTopicsForDisplay(topics);
    expect(sorted.map((t) => t.topic)).toEqual(["Débil", "Fuerte", "Sin datos"]);
  });

  it("always places General last among topics with equal data status", () => {
    const topics: TopicMastery[] = [
      { topic: "General", questionIds: [], timesAnswered: 10, accuracyPercent: 40, score: 0.4, level: "necesita_repaso", hasEnoughData: true },
      { topic: "Específico", questionIds: [], timesAnswered: 10, accuracyPercent: 40, score: 0.4, level: "necesita_repaso", hasEnoughData: true },
    ];
    const sorted = sortTopicsForDisplay(topics);
    expect(sorted.map((t) => t.topic)).toEqual(["Específico", "General"]);
  });
});
