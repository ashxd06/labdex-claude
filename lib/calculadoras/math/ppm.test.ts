import { describe, it, expect } from "vitest";
import { convertPpmPercent } from "@/lib/calculadoras/math/ppm";
import { CalculatorError } from "@/lib/calculadoras/shared";

describe("convertPpmPercent", () => {
  it("convierte 800 ppm a 0.08 % (Fase 5.1 §7)", () => {
    const result = convertPpmPercent(800, "ppmToPercent");
    expect(result.result).toBe(0.08);
    expect(result.resultUnit).toBe("%");
  });

  it("convierte 0.1 % a 1000 ppm (Fase 5.1 §7)", () => {
    const result = convertPpmPercent(0.1, "percentToPpm");
    expect(result.result).toBe(1000);
    expect(result.resultUnit).toBe("ppm");
  });

  it("1% = 10000 ppm exactamente", () => {
    expect(convertPpmPercent(1, "percentToPpm").result).toBe(10_000);
    expect(convertPpmPercent(10_000, "ppmToPercent").result).toBe(1);
  });

  it("rechaza valores negativos", () => {
    expect(() => convertPpmPercent(-1, "ppmToPercent")).toThrow(CalculatorError);
  });
});
