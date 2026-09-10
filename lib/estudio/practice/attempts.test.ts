import { describe, expect, it } from "vitest";
import { shuffle, pickRandomIds, buildErrorReviewQuestionIds } from "@/lib/estudio/practice/attempts";

// Generador determinista simple para pruebas reproducibles.
function seededRandom(seed: number) {
  let value = seed;
  return () => {
    value = (value * 9301 + 49297) % 233280;
    return value / 233280;
  };
}

describe("shuffle", () => {
  it("returns all the same elements, possibly reordered", () => {
    const input = [1, 2, 3, 4, 5];
    const result = shuffle(input, seededRandom(7));
    expect(result.sort()).toEqual(input.sort());
  });

  it("does not mutate the original array", () => {
    const input = [1, 2, 3];
    const copy = [...input];
    shuffle(input, seededRandom(1));
    expect(input).toEqual(copy);
  });

  it("is deterministic given the same random function", () => {
    const a = shuffle([1, 2, 3, 4, 5], seededRandom(42));
    const b = shuffle([1, 2, 3, 4, 5], seededRandom(42));
    expect(a).toEqual(b);
  });
});

describe("pickRandomIds", () => {
  it("returns at most `count` ids", () => {
    const result = pickRandomIds(["a", "b", "c", "d"], 2, seededRandom(3));
    expect(result).toHaveLength(2);
  });

  it("returns all ids when count exceeds available amount", () => {
    const result = pickRandomIds(["a", "b"], 10, seededRandom(3));
    expect(result.sort()).toEqual(["a", "b"]);
  });

  it("returns no duplicates", () => {
    const result = pickRandomIds(["a", "b", "c", "d", "e"], 5, seededRandom(9));
    expect(new Set(result).size).toBe(5);
  });
});

describe("buildErrorReviewQuestionIds", () => {
  it("keeps only incorrect answers", () => {
    const result = buildErrorReviewQuestionIds(
      [
        { question_id: "q1", is_correct: true },
        { question_id: "q2", is_correct: false },
        { question_id: "q3", is_correct: false },
      ],
      seededRandom(1)
    );
    expect(result.sort()).toEqual(["q2", "q3"]);
  });

  it("deduplicates question ids", () => {
    const result = buildErrorReviewQuestionIds(
      [
        { question_id: "q1", is_correct: false },
        { question_id: "q1", is_correct: false },
      ],
      seededRandom(1)
    );
    expect(result).toEqual(["q1"]);
  });

  it("returns an empty array when there are no errors", () => {
    const result = buildErrorReviewQuestionIds([{ question_id: "q1", is_correct: true }], seededRandom(1));
    expect(result).toEqual([]);
  });
});
