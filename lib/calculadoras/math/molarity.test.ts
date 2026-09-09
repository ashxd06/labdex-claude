import { describe, it, expect } from "vitest";
import { calculateMolarity } from "@/lib/calculadoras/math/molarity";
import { CalculatorError } from "@/lib/calculadoras/shared";

describe("calculateMolarity", () => {
  it("calcula la molaridad a partir de masa y masa molar (ejemplo Fase 5.1 §8)", () => {
    const result = calculateMolarity({ solveFor: "molarity", mass: 5.85, molarMass: 58.5, volume: 1 });
    expect(result.moles).toBe(0.1);
    expect(result.value).toBe(0.1);
    expect(result.molesDerivedFromMass).toBe(true);
  });

  it("calcula la molaridad a partir de moles directos", () => {
    const result = calculateMolarity({ solveFor: "molarity", moles: 0.5, volume: 2 });
    expect(result.value).toBe(0.25);
  });

  it("calcula el volumen dado moles y molaridad", () => {
    const result = calculateMolarity({ solveFor: "volume", moles: 0.5, molarity: 0.25 });
    expect(result.value).toBe(2);
  });

  it("calcula los moles a partir de volumen y molaridad", () => {
    const result = calculateMolarity({ solveFor: "moles", volume: 2, molarity: 0.25 });
    expect(result.value).toBe(0.5);
  });

  it("calcula los moles a partir de masa y masa molar", () => {
    const result = calculateMolarity({ solveFor: "moles", mass: 5.85, molarMass: 58.5 });
    expect(result.value).toBe(0.1);
  });

  it("rechaza masa molar en cero", () => {
    expect(() => calculateMolarity({ solveFor: "molarity", mass: 5.85, molarMass: 0, volume: 1 })).toThrow(CalculatorError);
  });

  it("rechaza volumen en cero al calcular molaridad", () => {
    expect(() => calculateMolarity({ solveFor: "molarity", moles: 0.5, volume: 0 })).toThrow(CalculatorError);
  });

  it("rechaza masa negativa", () => {
    expect(() => calculateMolarity({ solveFor: "molarity", mass: -1, molarMass: 58.5, volume: 1 })).toThrow(CalculatorError);
  });

  it("rechaza campos faltantes", () => {
    expect(() => calculateMolarity({ solveFor: "molarity" })).toThrow(CalculatorError);
  });
});
