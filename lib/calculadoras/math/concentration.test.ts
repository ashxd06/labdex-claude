import { describe, it, expect } from "vitest";
import { calculateConcentrationMV } from "@/lib/calculadoras/math/concentration";
import { CalculatorError } from "@/lib/calculadoras/shared";

describe("calculateConcentrationMV", () => {
  it("calcula el porcentaje (ejemplo de la Fase 5.1 §6: 5 g / 100 mL = 5%)", () => {
    const result = calculateConcentrationMV({ solveFor: "porcentaje", soluto: 5, solucion: 100 });
    expect(result.value).toBe(5);
  });

  it("calcula los gramos de soluto dado el porcentaje y la solución", () => {
    const result = calculateConcentrationMV({ solveFor: "soluto", solucion: 100, porcentaje: 5 });
    expect(result.value).toBe(5);
  });

  it("calcula los mL de solución dados los gramos y el porcentaje", () => {
    const result = calculateConcentrationMV({ solveFor: "solucion", soluto: 5, porcentaje: 5 });
    expect(result.value).toBe(100);
  });

  it("rechaza división entre cero (mL de solución = 0)", () => {
    expect(() => calculateConcentrationMV({ solveFor: "porcentaje", soluto: 5, solucion: 0 })).toThrow(CalculatorError);
  });

  it("rechaza división entre cero (porcentaje = 0 al calcular solución)", () => {
    expect(() => calculateConcentrationMV({ solveFor: "solucion", soluto: 5, porcentaje: 0 })).toThrow(CalculatorError);
  });

  it("rechaza valores negativos", () => {
    expect(() => calculateConcentrationMV({ solveFor: "porcentaje", soluto: -5, solucion: 100 })).toThrow(CalculatorError);
  });

  it("rechaza campos faltantes", () => {
    expect(() => calculateConcentrationMV({ solveFor: "porcentaje", soluto: 5 })).toThrow(CalculatorError);
  });
});
