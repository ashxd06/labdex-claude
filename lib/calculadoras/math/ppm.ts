import { CalculatorError, requireNonNegative, roundForDisplay } from "@/lib/calculadoras/shared";
import type { CalculationSteps } from "@/lib/calculadoras/types";

/**
 * Conversión ppm ↔ % (Fase 5.1, §7): 1 % = 10 000 ppm.
 */

export type PpmDirection = "percentToPpm" | "ppmToPercent";

export interface PpmConversionResult extends CalculationSteps {
  direction: PpmDirection;
  inputValue: number;
  result: number;
  resultUnit: "ppm" | "%";
}

const PPM_PER_PERCENT = 10_000;

export function convertPpmPercent(value: number, direction: PpmDirection): PpmConversionResult {
  if (value === undefined || value === null) {
    throw new CalculatorError('Falta el valor a convertir.');
  }
  requireNonNegative(value, "Valor");

  if (direction === "percentToPpm") {
    const result = roundForDisplay(value * PPM_PER_PERCENT);
    return {
      direction,
      inputValue: value,
      result,
      resultUnit: "ppm",
      formula: "ppm = % × 10 000",
      substitution: `ppm = ${value} × 10 000`,
      procedure: [`Multiplicar el porcentaje por 10 000.`, `${value} % = ${result} ppm`],
    };
  }

  const result = roundForDisplay(value / PPM_PER_PERCENT);
  return {
    direction,
    inputValue: value,
    result,
    resultUnit: "%",
    formula: "% = ppm / 10 000",
    substitution: `% = ${value} / 10 000`,
    procedure: [`Dividir los ppm entre 10 000.`, `${value} ppm = ${result} %`],
  };
}
