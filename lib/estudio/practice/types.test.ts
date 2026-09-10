import { describe, expect, it } from "vitest";
import { computeScorePercent, toAttemptSummaryView, type StudyExamAttemptRecord } from "@/lib/estudio/practice/types";

describe("computeScorePercent", () => {
  it("computes the exact percentage", () => {
    expect(computeScorePercent(8, 10)).toBe(80);
  });

  it("rounds to the nearest integer", () => {
    expect(computeScorePercent(1, 3)).toBe(33);
    expect(computeScorePercent(2, 3)).toBe(67);
  });

  it("returns 0 for zero total questions instead of dividing by zero", () => {
    expect(computeScorePercent(0, 0)).toBe(0);
  });

  it("returns 100 when everything is correct", () => {
    expect(computeScorePercent(5, 5)).toBe(100);
  });
});

describe("toAttemptSummaryView", () => {
  const base: StudyExamAttemptRecord = {
    id: "a1",
    material_id: "m1",
    user_id: "u1",
    mode: "examen",
    question_ids: ["q1", "q2", "q3", "q4", "q5", "q6", "q7", "q8", "q9", "q10"],
    total_questions: 10,
    correct_count: 8,
    status: "finalizado",
    source_attempt_id: null,
    started_at: "2026-09-09T00:00:00.000Z",
    finished_at: "2026-09-09T00:05:00.000Z",
  };

  it("computes incorrectCount and scorePercent consistently", () => {
    const view = toAttemptSummaryView(base);
    expect(view.incorrectCount).toBe(2);
    expect(view.scorePercent).toBe(80);
  });

  it("never returns a negative incorrectCount", () => {
    const view = toAttemptSummaryView({ ...base, correct_count: 12 });
    expect(view.incorrectCount).toBe(0);
  });
});
