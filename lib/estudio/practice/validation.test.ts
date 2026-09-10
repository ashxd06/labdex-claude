import { describe, expect, it } from "vitest";
import {
  sanitizeSourcePages,
  validateFlashcard,
  deduplicateFlashcards,
  validateQuestion,
  deduplicateQuestions,
} from "@/lib/estudio/practice/validation";
import type { MaterialPageEntry } from "@/lib/estudio/types";

const pageIndex: MaterialPageEntry[] = [
  { page: 1, text: "Introducción", unclear: false },
  { page: 2, text: "Tinción de Gram", unclear: false },
  { page: 3, text: "Bacterias Gram positivas", unclear: false },
];

describe("sanitizeSourcePages", () => {
  it("returns a single page when it exists in the index", () => {
    expect(sanitizeSourcePages("2", pageIndex)).toBe("2");
  });

  it("returns a range when multiple valid pages are given", () => {
    expect(sanitizeSourcePages("2-3", pageIndex)).toBe("2-3");
    expect(sanitizeSourcePages("2, 3", pageIndex)).toBe("2-3");
  });

  it("discards pages that do not exist in the index (never invent pages)", () => {
    expect(sanitizeSourcePages("99", pageIndex)).toBeNull();
  });

  it("filters out invalid numbers but keeps valid ones from the same string", () => {
    expect(sanitizeSourcePages("2, 99", pageIndex)).toBe("2");
  });

  it("returns null for empty/invalid input", () => {
    expect(sanitizeSourcePages(null, pageIndex)).toBeNull();
    expect(sanitizeSourcePages("", pageIndex)).toBeNull();
    expect(sanitizeSourcePages("sin página", pageIndex)).toBeNull();
  });

  it("returns null when the material has no page index at all", () => {
    expect(sanitizeSourcePages("2", [])).toBeNull();
  });
});

describe("validateFlashcard", () => {
  it("accepts a well-formed flashcard", () => {
    const result = validateFlashcard(
      { question: "¿Qué es la tinción de Gram?", answer: "Una técnica de tinción diferencial.", source_pages: "2" },
      pageIndex
    );
    expect(result).toEqual({
      question: "¿Qué es la tinción de Gram?",
      answer: "Una técnica de tinción diferencial.",
      sourcePages: "2",
    });
  });

  it("rejects a flashcard missing a question or answer", () => {
    expect(validateFlashcard({ question: "", answer: "algo" }, pageIndex)).toBeNull();
    expect(validateFlashcard({ question: "algo" }, pageIndex)).toBeNull();
  });

  it("rejects an excessively long question", () => {
    const result = validateFlashcard({ question: "a".repeat(400), answer: "respuesta" }, pageIndex);
    expect(result).toBeNull();
  });

  it("drops an invented source page instead of rejecting the whole card", () => {
    const result = validateFlashcard({ question: "¿Qué es X?", answer: "Y", source_pages: "500" }, pageIndex);
    expect(result?.sourcePages).toBeNull();
  });
});

describe("deduplicateFlashcards", () => {
  it("removes cards with the same question, case/whitespace-insensitive", () => {
    const result = deduplicateFlashcards([
      { question: "¿Qué es X?", answer: "A", sourcePages: null },
      { question: "¿qué es x?", answer: "B", sourcePages: null },
      { question: "¿Qué es Y?", answer: "C", sourcePages: null },
    ]);
    expect(result).toHaveLength(2);
  });
});

describe("validateQuestion", () => {
  const validRaw = {
    question: "¿Cuál es el objetivo de la tinción de Gram?",
    options: ["Diferenciar bacterias", "Medir glucosa", "Contar plaquetas", "Detectar anemia"],
    correct_answer: 0,
    explanation: "Según el material, permite diferenciar bacterias por su pared celular.",
    source_pages: "2",
    difficulty: "normal",
  };

  it("accepts a well-formed question", () => {
    const result = validateQuestion(validRaw, pageIndex);
    expect(result).not.toBeNull();
    expect(result?.correctAnswerIndex).toBe(0);
    expect(result?.options).toHaveLength(4);
  });

  it("rejects a question without exactly 4 options", () => {
    expect(validateQuestion({ ...validRaw, options: ["A", "B", "C"] }, pageIndex)).toBeNull();
    expect(validateQuestion({ ...validRaw, options: ["A", "B", "C", "D", "E"] }, pageIndex)).toBeNull();
  });

  it("rejects a question with duplicate options", () => {
    expect(validateQuestion({ ...validRaw, options: ["A", "A", "B", "C"] }, pageIndex)).toBeNull();
  });

  it("rejects when correct_answer is out of range", () => {
    expect(validateQuestion({ ...validRaw, correct_answer: 4 }, pageIndex)).toBeNull();
    expect(validateQuestion({ ...validRaw, correct_answer: -1 }, pageIndex)).toBeNull();
  });

  it("rejects when explanation is missing", () => {
    expect(validateQuestion({ ...validRaw, explanation: "" }, pageIndex)).toBeNull();
  });

  it("falls back to 'normal' difficulty when missing or invalid", () => {
    expect(validateQuestion({ ...validRaw, difficulty: undefined }, pageIndex)?.difficulty).toBe("normal");
    expect(validateQuestion({ ...validRaw, difficulty: "imposible" }, pageIndex)?.difficulty).toBe("normal");
  });

  it("never invents a source page not present in the material", () => {
    expect(validateQuestion({ ...validRaw, source_pages: "500" }, pageIndex)?.sourcePages).toBeNull();
  });
});

describe("deduplicateQuestions", () => {
  it("removes questions with the same text", () => {
    const base = {
      options: ["A", "B", "C", "D"],
      correctAnswerIndex: 0,
      explanation: "porque sí",
      sourcePages: null,
      difficulty: "normal" as const,
    };
    const result = deduplicateQuestions([
      { ...base, question: "¿Qué es X?" },
      { ...base, question: "¿qué es x?" },
      { ...base, question: "¿Qué es Y?" },
    ]);
    expect(result).toHaveLength(2);
  });
});
