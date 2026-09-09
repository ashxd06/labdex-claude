import { describe, expect, it } from "vitest";
import { safeParseJson } from "@/lib/estudio/analysis/types";

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
