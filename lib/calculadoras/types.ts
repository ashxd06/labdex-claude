/**
 * Tipos compartidos del módulo de Calculadoras (Fase 5.1).
 */

export type CalculatorId = "diluciones" | "concentracion" | "ppm" | "molaridad" | "unidades";

/** Resultado educativo común: no solo el número final, también la fórmula,
 * la sustitución de valores y el procedimiento paso a paso (Fase 5.1, §16). */
export interface CalculationSteps {
  formula: string;
  substitution: string;
  procedure: string[];
}
