import { describe, it, expect } from "vitest";
import { convertUnits } from "@/lib/calculadoras/math/units";
import { CalculatorError } from "@/lib/calculadoras/shared";

describe("convertUnits", () => {
  it("1 g = 1000 mg", () => {
    expect(convertUnits(1, "g", "mg").result).toBe(1000);
  });

  it("1 mg = 1000 µg", () => {
    expect(convertUnits(1, "mg", "µg").result).toBe(1000);
  });

  it("1 L = 1000 mL", () => {
    expect(convertUnits(1, "L", "mL").result).toBe(1000);
  });

  it("1 mL = 1000 µL", () => {
    expect(convertUnits(1, "mL", "µL").result).toBe(1000);
  });

  it("1 % = 10000 ppm", () => {
    expect(convertUnits(1, "%", "ppm").result).toBe(10_000);
  });

  it("2.5 g -> mg = 2500 mg (ejemplo Fase 5.1 §14)", () => {
    expect(convertUnits(2.5, "g", "mg").result).toBe(2500);
  });

  it("1 kg = 1000 g", () => {
    expect(convertUnits(1, "kg", "g").result).toBe(1000);
  });

  it("rechaza conversiones entre categorías incompatibles (g -> mL)", () => {
    expect(() => convertUnits(1, "g", "mL")).toThrow(CalculatorError);
  });

  it("rechaza valores negativos", () => {
    expect(() => convertUnits(-1, "g", "mg")).toThrow(CalculatorError);
  });

  it("permite convertir una unidad a sí misma sin alterar el valor", () => {
    expect(convertUnits(42, "mL", "mL").result).toBe(42);
  });
});
