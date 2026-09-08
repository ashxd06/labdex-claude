import { describe, it, expect } from "vitest";
import { isAiMode, AI_MODES } from "@/lib/labdex-ai/types";

describe("isAiMode", () => {
  it("acepta los 4 modos válidos", () => {
    for (const mode of AI_MODES) {
      expect(isAiMode(mode)).toBe(true);
    }
  });

  it("rechaza valores inválidos", () => {
    expect(isAiMode("clinico")).toBe(false);
    expect(isAiMode(null)).toBe(false);
    expect(isAiMode(undefined)).toBe(false);
    expect(isAiMode(123)).toBe(false);
  });
});
