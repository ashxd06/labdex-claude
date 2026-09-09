import { CalculatorError, requireNonNegative, requireFiniteResult, roundForDisplay } from "@/lib/calculadoras/shared";
import type { CalculationSteps } from "@/lib/calculadoras/types";

/**
 * Calculadora de concentración % m/v (Fase 5.1, §6).
 *
 * % m/v = gramos de soluto / mL de solución × 100
 *
 * Solo % m/v en esta primera versión (no % v/v, % m/m, normalidad,
 * molalidad ni osmolaridad — Fase 5.1, §6 "IMPORTANTE").
 */

export type ConcentrationField = "soluto" | "solucion" | "porcentaje";

export interface ConcentrationInput {
  solveFor: ConcentrationField;
  /** Gramos de soluto. */
  soluto?: number;
  /** mL de solución (volumen final, no de disolvente). */
  solucion?: number;
  /** % m/v. */
  porcentaje?: number;
}

export interface ConcentrationResult extends CalculationSteps {
  solveFor: ConcentrationField;
  value: number;
  soluto: number;
  solucion: number;
  porcentaje: number;
}

const FIELD_LABELS: Record<ConcentrationField, string> = {
  soluto: "Gramos de soluto",
  solucion: "mL de solución",
  porcentaje: "Concentración % m/v",
};

function requireKnown(value: number | undefined, field: ConcentrationField): number {
  if (value === undefined) {
    throw new CalculatorError(`Falta el valor de "${FIELD_LABELS[field]}".`);
  }
  return requireNonNegative(value, FIELD_LABELS[field]);
}

export function calculateConcentrationMV(input: ConcentrationInput): ConcentrationResult {
  let soluto: number, solucion: number, porcentaje: number;

  switch (input.solveFor) {
    case "porcentaje": {
      soluto = requireKnown(input.soluto, "soluto");
      solucion = requireKnown(input.solucion, "solucion");
      if (solucion === 0) {
        throw new CalculatorError("Los mL de solución no pueden ser 0 (división entre cero).");
      }
      porcentaje = requireFiniteResult((soluto / solucion) * 100, "el porcentaje");
      break;
    }
    case "soluto": {
      solucion = requireKnown(input.solucion, "solucion");
      porcentaje = requireKnown(input.porcentaje, "porcentaje");
      soluto = requireFiniteResult((porcentaje * solucion) / 100, "los gramos de soluto");
      break;
    }
    case "solucion": {
      soluto = requireKnown(input.soluto, "soluto");
      porcentaje = requireKnown(input.porcentaje, "porcentaje");
      if (porcentaje === 0) {
        throw new CalculatorError("La concentración % no puede ser 0 al calcular el volumen de solución (división entre cero).");
      }
      solucion = requireFiniteResult((soluto * 100) / porcentaje, "los mL de solución");
      break;
    }
  }

  const rSoluto = roundForDisplay(soluto);
  const rSolucion = roundForDisplay(solucion);
  const rPorcentaje = roundForDisplay(porcentaje);
  const value = input.solveFor === "soluto" ? rSoluto : input.solveFor === "solucion" ? rSolucion : rPorcentaje;

  return {
    solveFor: input.solveFor,
    value,
    soluto: rSoluto,
    solucion: rSolucion,
    porcentaje: rPorcentaje,
    formula: "% m/v = (gramos de soluto / mL de solución) × 100",
    substitution:
      input.solveFor === "porcentaje"
        ? `% m/v = (${rSoluto} / ${rSolucion}) × 100`
        : input.solveFor === "soluto"
          ? `gramos de soluto = (${rPorcentaje} × ${rSolucion}) / 100`
          : `mL de solución = (${rSoluto} × 100) / ${rPorcentaje}`,
    procedure: [`Despejar ${FIELD_LABELS[input.solveFor]} de la fórmula de % m/v.`, `${FIELD_LABELS[input.solveFor]} = ${value}`],
  };
}
