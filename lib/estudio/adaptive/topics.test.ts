import { describe, expect, it } from "vitest";
import { parsePageRange, rangesOverlap, deriveTopic, groupQuestionIdsByTopic, GENERAL_TOPIC } from "@/lib/estudio/adaptive/topics";
import type { KeyConcept } from "@/lib/estudio/types";

describe("parsePageRange", () => {
  it("parses a single page", () => {
    expect(parsePageRange("12")).toEqual({ min: 12, max: 12 });
  });

  it("parses a range", () => {
    expect(parsePageRange("12-14")).toEqual({ min: 12, max: 14 });
  });

  it("parses comma-separated pages as their min/max", () => {
    expect(parsePageRange("12, 20")).toEqual({ min: 12, max: 20 });
  });

  it("returns null for null/empty/non-numeric input", () => {
    expect(parsePageRange(null)).toBeNull();
    expect(parsePageRange("")).toBeNull();
    expect(parsePageRange("sin página")).toBeNull();
  });
});

describe("rangesOverlap", () => {
  it("detects overlapping ranges", () => {
    expect(rangesOverlap({ min: 10, max: 14 }, { min: 12, max: 20 })).toBe(true);
  });

  it("detects non-overlapping ranges", () => {
    expect(rangesOverlap({ min: 1, max: 5 }, { min: 6, max: 10 })).toBe(false);
  });

  it("treats touching ranges as overlapping (inclusive bounds)", () => {
    expect(rangesOverlap({ min: 1, max: 5 }, { min: 5, max: 10 })).toBe(true);
  });
});

const concepts: KeyConcept[] = [
  { term: "Tinción de Gram", definition: "d", pages: "1-3" },
  { term: "Metabolismo bacteriano", definition: "d", pages: "10-14" },
];

describe("deriveTopic", () => {
  it("matches a question to the concept whose page range overlaps", () => {
    expect(deriveTopic("2", concepts)).toBe("Tinción de Gram");
    expect(deriveTopic("12", concepts)).toBe("Metabolismo bacteriano");
  });

  it("falls back to General when no concept overlaps", () => {
    expect(deriveTopic("50", concepts)).toBe(GENERAL_TOPIC);
  });

  it("falls back to General when the question has no source pages", () => {
    expect(deriveTopic(null, concepts)).toBe(GENERAL_TOPIC);
  });

  it("falls back to General when there are no key concepts at all", () => {
    expect(deriveTopic("2", [])).toBe(GENERAL_TOPIC);
  });
});

describe("groupQuestionIdsByTopic", () => {
  it("groups questions under their derived topic, preserving order", () => {
    const groups = groupQuestionIdsByTopic(
      [
        { id: "q1", sourcePages: "2", difficulty: "normal" },
        { id: "q2", sourcePages: "12", difficulty: "normal" },
        { id: "q3", sourcePages: "2-3", difficulty: "easy" },
        { id: "q4", sourcePages: null, difficulty: "hard" },
      ],
      concepts
    );

    expect(groups.get("Tinción de Gram")).toEqual(["q1", "q3"]);
    expect(groups.get("Metabolismo bacteriano")).toEqual(["q2"]);
    expect(groups.get(GENERAL_TOPIC)).toEqual(["q4"]);
  });
});
