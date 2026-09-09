import { CalculatorError, requireNonNegative, requireFiniteResult, roundForDisplay } from "@/lib/calculadoras/shared";
import type { CalculationSteps } from "@/lib/calculadoras/types";

/**
 * Calculadora de diluciones (Fase 5.1, §5): C₁ × V₁ = C₂ × V₂.
 *
 * Convención de unidades de esta primera versión: concentraciones en %,
 * volúmenes en mL (Fase 5.1, §5 no exige un selector de unidades para esta
 * calculadora; el conversor de unidades genérico, §9, cubre ese caso).
 */

export type DilutionField = "c1" | "v1" | "c2" | "v2";

export interface DilutionInput {
  solveFor: DilutionField;
  c1?: number;
  v1?: number;
  c2?: number;
  v2?: number;
}

export interface DilutionResult extends CalculationSteps {
  solveFor: DilutionField;
  value: number;
  c1: number;
  v1: number;
  c2: number;
  v2: number;
  /** Volumen de diluyente a añadir (V₂ − V₁), en mL. */
  diluent: number;
}

const FIELD_LABELS: Record<DilutionField, string> = {
  c1: "Concentración inicial (C₁)",
  v1: "Volumen inicial (V₁)",
  c2: "Concentración final (C₂)",
  v2: "Volumen final (V₂)",
};

function requireKnown(value: number | undefined, field: DilutionField): number {
  if (value === undefined) {
    throw new CalculatorError(`Falta el valor de "${FIELD_LABELS[field]}".`);
  }
  return requireNonNegative(value, FIELD_LABELS[field]);
}

export function calculateDilution(input: DilutionInput): DilutionResult {
  const known: Record<DilutionField, number | undefined> = {
    c1: input.c1,
    v1: input.v1,
    c2: input.c2,
    v2: input.v2,
  };

  let c1: number, v1: number, c2: number, v2: number;

  switch (input.solveFor) {
    case "v1": {
      c1 = requireKnown(known.c1, "c1");
      c2 = requireKnown(known.c2, "c2");
      v2 = requireKnown(known.v2, "v2");
      if (c1 === 0) throw new CalculatorError("C₁ no puede ser 0 al calcular V₁ (división entre cero).");
      v1 = requireFiniteResult((c2 * v2) / c1, "V₁");
      break;
    }
    case "v2": {
      c1 = requireKnown(known.c1, "c1");
      v1 = requireKnown(known.v1, "v1");
      c2 = requireKnown(known.c2, "c2");
      if (c2 === 0) throw new CalculatorError("C₂ no puede ser 0 al calcular V₂ (división entre cero).");
      v2 = requireFiniteResult((c1 * v1) / c2, "V₂");
      break;
    }
    case "c1": {
      v1 = requireKnown(known.v1, "v1");
      c2 = requireKnown(known.c2, "c2");
      v2 = requireKnown(known.v2, "v2");
      if (v1 === 0) throw new CalculatorError("V₁ no puede ser 0 al calcular C₁ (división entre cero).");
      c1 = requireFiniteResult((c2 * v2) / v1, "C₁");
      break;
    }
    case "c2": {
      c1 = requireKnown(known.c1, "c1");
      v1 = requireKnown(known.v1, "v1");
      v2 = requireKnown(known.v2, "v2");
      if (v2 === 0) throw new CalculatorError("V₂ no puede ser 0 al calcular C₂ (división entre cero).");
      c2 = requireFiniteResult((c1 * v1) / v2, "C₂");
      break;
    }
  }

  if (v2 < v1) {
    throw new CalculatorError(
      "El resultado no corresponde a una dilución válida: el volumen final es menor que el inicial (eso sería una concentración, no una dilución)."
    );
  }

  const diluent = roundForDisplay(v2 - v1);
  const value = roundForDisplay(
    input.solveFor === "c1" ? c1 : input.solveFor === "v1" ? v1 : input.solveFor === "c2" ? c2 : v2
  );

  const rC1 = roundForDisplay(c1);
  const rV1 = roundForDisplay(v1);
  const rC2 = roundForDisplay(c2);
  const rV2 = roundForDisplay(v2);

  return {
    solveFor: input.solveFor,
    value,
    c1: rC1,
    v1: rV1,
    c2: rC2,
    v2: rV2,
    diluent,
    formula: "C₁ × V₁ = C₂ × V₂",
    substitution: `${rC1} × ${rV1} = ${rC2} × ${rV2}`,
    procedure: [
      `Despejar ${FIELD_LABELS[input.solveFor]} de la fórmula C₁ × V₁ = C₂ × V₂.`,
      `${FIELD_LABELS[input.solveFor]} = ${value}`,
      `Diluyente a añadir = V₂ − V₁ = ${rV2} − ${rV1} = ${diluent} mL`,
    ],
  };
}
