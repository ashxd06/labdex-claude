/**
 * Utilidades compartidas por las calculadoras de LABDEX (Fase 5.1, §3-4).
 *
 * Todas las calculadoras usan funciones deterministas de TypeScript, nunca
 * Gemini, para el resultado numérico (Fase 5.1, §3). Este archivo agrupa
 * las validaciones que se repiten en las 5 calculadoras para no duplicar
 * lógica (Fase 5.1, §21).
 */

/** Error de validación o de cálculo imposible, con un mensaje en español
 * listo para mostrar al usuario (nunca un mensaje técnico crudo). */
export class CalculatorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CalculatorError";
  }
}

/** Convierte un valor de un campo de formulario (string u undefined) a
 * número, o `undefined` si el campo está vacío. Lanza si el texto no es un
 * número válido. */
export function parseOptionalNumber(raw: string | undefined, fieldLabel: string): number | undefined {
  if (raw === undefined || raw.trim() === "") return undefined;
  const value = Number(raw);
  if (Number.isNaN(value) || !Number.isFinite(value)) {
    throw new CalculatorError(`"${fieldLabel}" debe ser un número válido.`);
  }
  return value;
}

export function requireNumber(value: number | undefined, fieldLabel: string): number {
  if (value === undefined) {
    throw new CalculatorError(`Falta el valor de "${fieldLabel}".`);
  }
  return value;
}

export function requireNonNegative(value: number, fieldLabel: string): number {
  if (value < 0) {
    throw new CalculatorError(`"${fieldLabel}" no puede ser negativo.`);
  }
  return value;
}

export function requirePositive(value: number, fieldLabel: string): number {
  if (value <= 0) {
    throw new CalculatorError(`"${fieldLabel}" debe ser mayor que cero.`);
  }
  return value;
}

export function requireFiniteResult(value: number, context: string): number {
  if (!Number.isFinite(value) || Number.isNaN(value)) {
    throw new CalculatorError(`El resultado de ${context} no es un número válido.`);
  }
  return value;
}

/** Redondea a un número razonable de decimales para mostrar en pantalla,
 * sin acumular errores de coma flotante visibles (p. ej. 0.1 + 0.2). */
export function roundForDisplay(value: number, decimals = 6): number {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}
