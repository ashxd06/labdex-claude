import { describe, expect, it } from "vitest";
import { isLikelyDuplicateTitle, normalizeTitle } from "@/lib/labdex-ai/admin/duplicates";

describe("normalizeTitle", () => {
  it("lowercases, strips accents, and collapses whitespace", () => {
    expect(normalizeTitle("  Microbiología   Clínica ")).toBe("microbiologia clinica");
  });
});

describe("isLikelyDuplicateTitle", () => {
  it("flags identical titles regardless of case/accents", () => {
    expect(isLikelyDuplicateTitle("Staphylococcus aureus", "STAPHYLOCOCCUS AUREUS")).toBe(true);
  });

  it("flags a title that is a prefix of another plus extra words (§13 example)", () => {
    expect(isLikelyDuplicateTitle("Microbiología", "Microbiología clínica")).toBe(true);
    expect(isLikelyDuplicateTitle("Microbiología clínica", "Microbiología")).toBe(true);
  });

  it("does not flag unrelated titles", () => {
    expect(isLikelyDuplicateTitle("Escherichia coli", "Staphylococcus aureus")).toBe(false);
  });

  it("does not flag loose substring matches that are actually different words", () => {
    expect(isLikelyDuplicateTitle("Test", "Testosterona")).toBe(false);
  });

  it("handles empty strings safely", () => {
    expect(isLikelyDuplicateTitle("", "algo")).toBe(false);
    expect(isLikelyDuplicateTitle("algo", "")).toBe(false);
  });
});
