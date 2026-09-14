import { describe, expect, it } from "vitest";
import { generateMolarityExercise } from "./molarity";


describe("generateMolarityExercise", () => {
  it("generates valid exercises for every difficulty", () => {
    for (const difficulty of ["basico", "tecnico", "examen"] as const) {
      for (let seed = 1; seed <= 30; seed += 1) {
        const exercise = generateMolarityExercise(seed, difficulty);
        expect(exercise.category).toBe("molaridad");
        expect(exercise.difficulty).toBe(difficulty);
        expect(exercise.answer.value).toBeGreaterThan(0);
        expect(exercise.answer.unit.length).toBeGreaterThan(0);
        expect(exercise.procedure.length).toBeGreaterThan(0);
      }
    }
  });

  it("is deterministic for the same seed and difficulty", () => {
    const first = generateMolarityExercise(12345, "tecnico");
    const second = generateMolarityExercise(12345, "tecnico");
    expect(second).toEqual(first);
  });
});
