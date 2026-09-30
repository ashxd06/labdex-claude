import { describe, expect, it } from "vitest";
import {
  safeParseJson,
  validateChunkAnalysisResult,
  validateSynthesisResult,
} from "@/lib/estudio/analysis/types";

describe("safeParseJson", () => {
  it("parses plain JSON", () => {
    const result = safeParseJson<{ a: number }>('{"a": 1}');
    expect(result).toEqual({ a: 1 });
  });

  it("parses JSON wrapped in a markdown code fence", () => {
    const raw = '```json\n{"a": 1, "b": [1,2,3]}\n```';
    const result = safeParseJson<{ a: number; b: number[] }>(raw);
    expect(result).toEqual({ a: 1, b: [1, 2, 3] });
  });

  it("parses JSON wrapped in a fence without the json language tag", () => {
    const raw = '```\n{"ok": true}\n```';
    const result = safeParseJson<{ ok: boolean }>(raw);
    expect(result).toEqual({ ok: true });
  });

  it("returns null for empty input", () => {
    expect(safeParseJson("")).toBeNull();
    expect(safeParseJson("   ")).toBeNull();
  });

  it("returns null for malformed JSON instead of throwing", () => {
    expect(safeParseJson("{not valid json")).toBeNull();
  });

  it("returns null for prose that isn't JSON at all", () => {
    expect(safeParseJson("Lo siento, no puedo procesar esta página.")).toBeNull();
  });
});

describe("validateChunkAnalysisResult", () => {
  const range = { startPage: 4, endPage: 5 };
  const valid = {
    pages: [
      { page: 5, text: " Página cinco ", unclear: false },
      { page: 4, text: "Página cuatro", unclear: false },
    ],
    notableConcepts: [{ concept: "Concepto", page: 4 }],
  };

  it("requires every requested page exactly once and sorts them", () => {
    expect(validateChunkAnalysisResult(valid, range)?.pages.map((page) => page.page)).toEqual([4, 5]);
    expect(validateChunkAnalysisResult({ ...valid, pages: valid.pages.slice(1) }, range)).toBeNull();
    expect(
      validateChunkAnalysisResult({ ...valid, pages: [valid.pages[0], valid.pages[0]] }, range)
    ).toBeNull();
  });

  it("rejects out-of-range pages and malformed concepts", () => {
    expect(
      validateChunkAnalysisResult(
        { ...valid, pages: [{ page: 3, text: "Fuera del lote", unclear: false }, valid.pages[1]] },
        range
      )
    ).toBeNull();
    expect(validateChunkAnalysisResult({ ...valid, notableConcepts: [{ concept: "X", page: 9 }] }, range)).toBeNull();
  });
});

describe("validateSynthesisResult", () => {
  const valid = {
    summary: [{ heading: "Tema", content: "Explicación" }],
    keyConcepts: [],
    mustRemember: [],
    simpleExplanation: "Explicado de forma simple.",
    notes: [],
  };

  it("accepts a usable synthesis and defaults omitted notes", () => {
    expect(validateSynthesisResult(valid)).toEqual(valid);
    expect(validateSynthesisResult({ ...valid, notes: undefined })?.notes).toEqual([]);
  });

  it("rejects an empty or malformed synthesis instead of marking it ready", () => {
    expect(validateSynthesisResult({ ...valid, summary: [] })).toBeNull();
    expect(validateSynthesisResult({ ...valid, simpleExplanation: " " })).toBeNull();
    expect(validateSynthesisResult({ ...valid, keyConcepts: [{ term: "X" }] })).toBeNull();
  });
});
