import { describe, it, expect } from "vitest";
import { calculateDilution } from "@/lib/calculadoras/math/dilutions";
import { CalculatorError } from "@/lib/calculadoras/shared";

describe("calculateDilution", () => {
  it("calcula V1 correctamente (ejemplo de la Fase 5.1 §5)", () => {
    const result = calculateDilution({ solveFor: "v1", c1: 10, c2: 2, v2: 100 });
    expect(result.value).toBe(20);
    expect(result.v1).toBe(20);
    expect(result.diluent).toBe(80);
  });

  it("calcula el diluyente como V2 - V1", () => {
    const result = calculateDilution({ solveFor: "v1", c1: 10, c2: 2, v2: 100 });
    expect(result.diluent).toBe(result.v2 - result.v1);
  });

  it("calcula C1 dado V1, C2, V2", () => {
    const result = calculateDilution({ solveFor: "c1", v1: 20, c2: 2, v2: 100 });
    expect(result.value).toBe(10);
  });

  it("calcula C2 dado C1, V1, V2", () => {
    const result = calculateDilution({ solveFor: "c2", c1: 10, v1: 20, v2: 100 });
    expect(result.value).toBe(2);
  });

  it("calcula V2 dado C1, V1, C2", () => {
    const result = calculateDilution({ solveFor: "v2", c1: 10, v1: 20, c2: 2 });
    expect(result.value).toBe(100);
  });

  it("rechaza campos faltantes", () => {
    expect(() => calculateDilution({ solveFor: "v1", c1: 10, c2: 2 })).toThrow(CalculatorError);
  });

  it("rechaza valores negativos", () => {
    expect(() => calculateDilution({ solveFor: "v1", c1: -10, c2: 2, v2: 100 })).toThrow(CalculatorError);
  });

  it("rechaza división entre cero (C1 = 0 al calcular V1)", () => {
    expect(() => calculateDilution({ solveFor: "v1", c1: 0, c2: 2, v2: 100 })).toThrow(CalculatorError);
  });

  it("rechaza un resultado imposible (V2 < V1, sería una concentración)", () => {
    expect(() => calculateDilution({ solveFor: "v2", c1: 2, v1: 100, c2: 10 })).toThrow(CalculatorError);
  });
});
