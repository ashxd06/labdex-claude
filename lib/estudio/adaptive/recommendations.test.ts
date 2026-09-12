import { describe, expect, it } from "vitest";
import { buildRecommendations } from "@/lib/estudio/adaptive/recommendations";
import type { TopicMastery } from "@/lib/estudio/adaptive/types";

function topic(overrides: Partial<TopicMastery>): TopicMastery {
  return {
    topic: "Tema",
    questionIds: [],
    timesAnswered: 10,
    accuracyPercent: 50,
    score: 0.5,
    level: "en_progreso",
    hasEnoughData: true,
    ...overrides,
  };
}

describe("buildRecommendations", () => {
  it("returns no recommendations when there is not enough data anywhere", () => {
    const result = buildRecommendations([topic({ hasEnoughData: false, level: null })]);
    expect(result).toEqual([]);
  });

  it("produces one recommendation for a single weakness", () => {
    const result = buildRecommendations([
      topic({ topic: "Metabolismo bacteriano", level: "necesita_repaso", accuracyPercent: 42 }),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].message).toMatch(/Metabolismo bacteriano/);
    expect(result[0].message).toMatch(/42%/);
    expect(result[0].suggestedCount).toBe(10);
  });

  it("orders multiple weaknesses from worst to best and caps at 3", () => {
    const topics = [
      topic({ topic: "A", level: "dominado", accuracyPercent: 95, score: 0.95 }),
      topic({ topic: "B", level: "necesita_repaso", accuracyPercent: 30, score: 0.3 }),
      topic({ topic: "C", level: "en_progreso", accuracyPercent: 60, score: 0.6 }),
      topic({ topic: "D", level: "necesita_repaso", accuracyPercent: 45, score: 0.45 }),
    ];
    const result = buildRecommendations(topics);
    expect(result).toHaveLength(3);
    expect(result.map((r) => r.topic)).toEqual(["B", "D", "C"]);
  });

  it("gives a lower suggested count for already-mastered material (retention check, not remediation)", () => {
    const result = buildRecommendations([topic({ level: "dominado", accuracyPercent: 91 })]);
    expect(result[0].suggestedCount).toBe(5);
  });

  it("never recommends a topic with insufficient data, even if mixed with valid ones", () => {
    const result = buildRecommendations([
      topic({ topic: "Con datos", level: "necesita_repaso", accuracyPercent: 40 }),
      topic({ topic: "Sin datos", level: null, hasEnoughData: false }),
    ]);
    expect(result.map((r) => r.topic)).toEqual(["Con datos"]);
  });

  it("uses a generic phrase for the General bucket instead of the literal word 'General' as a topic name", () => {
    const result = buildRecommendations([topic({ topic: "General", level: "necesita_repaso", accuracyPercent: 40 })]);
    expect(result[0].message).toMatch(/este material/);
  });
});
