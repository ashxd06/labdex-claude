import { CalculatorError, roundForDisplay } from "@/lib/calculadoras/shared";
import type { CalculationSteps } from "@/lib/calculadoras/types";

/**
 * Conversor de unidades (Fase 5.1, §9). Cada categoría define un factor de
 * conversión hacia una unidad base; convertir entre categorías distintas
 * (p. ej. g → mL) está explícitamente prohibido.
 */

export type UnitCategory = "masa" | "volumen" | "concentracion";

export type MassUnit = "kg" | "g" | "mg" | "µg";
export type VolumeUnit = "L" | "mL" | "µL";
export type ConcentrationUnit = "%" | "ppm";
export type Unit = MassUnit | VolumeUnit | ConcentrationUnit;

/** Factor de cada unidad respecto a su unidad base de categoría
 * (gramos para masa, litros para volumen, ppm para concentración). */
const MASS_TO_BASE: Record<MassUnit, number> = {
  kg: 1000,
  g: 1,
  mg: 0.001,
  "µg": 0.000001,
};

const VOLUME_TO_BASE: Record<VolumeUnit, number> = {
  L: 1,
  mL: 0.001,
  "µL": 0.000001,
};

const CONCENTRATION_TO_BASE: Record<ConcentrationUnit, number> = {
  "%": 10_000,
  ppm: 1,
};

export const UNIT_CATEGORY: Record<Unit, UnitCategory> = {
  kg: "masa",
  g: "masa",
  mg: "masa",
  "µg": "masa",
  L: "volumen",
  mL: "volumen",
  "µL": "volumen",
  "%": "concentracion",
  ppm: "concentracion",
};

export const UNITS_BY_CATEGORY: Record<UnitCategory, Unit[]> = {
  masa: ["kg", "g", "mg", "µg"],
  volumen: ["L", "mL", "µL"],
  concentracion: ["%", "ppm"],
};

function factorFor(unit: Unit): number {
  if (unit in MASS_TO_BASE) return MASS_TO_BASE[unit as MassUnit];
  if (unit in VOLUME_TO_BASE) return VOLUME_TO_BASE[unit as VolumeUnit];
  return CONCENTRATION_TO_BASE[unit as ConcentrationUnit];
}

export interface UnitConversionResult extends CalculationSteps {
  category: UnitCategory;
  from: Unit;
  to: Unit;
  inputValue: number;
  result: number;
}

export function convertUnits(value: number, from: Unit, to: Unit): UnitConversionResult {
  if (value === undefined || value === null || Number.isNaN(value)) {
    throw new CalculatorError("Indica un valor numérico para convertir.");
  }
  if (value < 0) {
    throw new CalculatorError("El valor no puede ser negativo.");
  }

  const categoryFrom = UNIT_CATEGORY[from];
  const categoryTo = UNIT_CATEGORY[to];

  if (categoryFrom !== categoryTo) {
    throw new CalculatorError(
      `No se puede convertir de ${from} a ${to}: son magnitudes distintas (${categoryFrom} vs. ${categoryTo}).`
    );
  }

  const baseValue = value * factorFor(from);
  const result = roundForDisplay(baseValue / factorFor(to));

  return {
    category: categoryFrom,
    from,
    to,
    inputValue: value,
    result,
    formula: `valor en ${to} = valor en ${from} × (factor ${from}→base) / (factor ${to}→base)`,
    substitution: `${value} ${from} × ${factorFor(from)} / ${factorFor(to)}`,
    procedure: [`Convertir ${value} ${from} a la unidad base de la categoría.`, `Convertir el valor base a ${to}.`, `${value} ${from} = ${result} ${to}`],
  };
}
