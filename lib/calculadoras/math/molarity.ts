import { CalculatorError, requireNonNegative, requirePositive, requireFiniteResult, roundForDisplay } from "@/lib/calculadoras/shared";
import type { CalculationSteps } from "@/lib/calculadoras/types";

/**
 * Calculadora de molaridad (Fase 5.1, §8): M = mol / L, con la opción de
 * obtener los moles a partir de la masa: mol = masa (g) / masa molar (g/mol).
 */

export type MolarityField = "molarity" | "moles" | "volume";

export interface MolarityInput {
  solveFor: MolarityField;
  /** Masa en gramos (opcional; junto con molarMass permite derivar los moles). */
  mass?: number;
  /** Masa molar en g/mol (obligatoria si se indica `mass`). */
  molarMass?: number;
  /** Moles, si ya se conocen directamente (alternativa a mass/molarMass). */
  moles?: number;
  /** Volumen en L. */
  volume?: number;
  /** Molaridad en mol/L. */
  molarity?: number;
}

export interface MolarityResult extends CalculationSteps {
  solveFor: MolarityField;
  value: number;
  moles: number;
  volume: number;
  molarity: number;
  molesDerivedFromMass: boolean;
}

/** Deriva los moles a partir de masa/masa molar cuando estén disponibles;
 * si no, usa los moles indicados directamente. Lanza si no hay suficiente
 * información. */
function resolveMolesFromMassOrDirect(
  input: MolarityInput,
  procedure: string[]
): { moles: number; derivedFromMass: boolean } {
  if (input.mass !== undefined || input.molarMass !== undefined) {
    if (input.mass === undefined) throw new CalculatorError('Falta la "masa (g)" para calcular los moles.');
    if (input.molarMass === undefined) throw new CalculatorError('Falta la "masa molar (g/mol)" para calcular los moles.');
    const mass = requireNonNegative(input.mass, "Masa");
    const molarMass = requirePositive(input.molarMass, "Masa molar");
    const moles = requireFiniteResult(mass / molarMass, "los moles");
    procedure.push(
      `mol = masa / masa molar = ${roundForDisplay(mass)} / ${roundForDisplay(molarMass)} = ${roundForDisplay(moles)} mol`
    );
    return { moles, derivedFromMass: true };
  }

  if (input.moles !== undefined) {
    return { moles: requireNonNegative(input.moles, "Moles"), derivedFromMass: false };
  }

  throw new CalculatorError('Indica los moles directamente, o la masa (g) y la masa molar (g/mol) para calcularlos.');
}

export function calculateMolarity(input: MolarityInput): MolarityResult {
  const procedure: string[] = [];
  let moles: number;
  let volume: number;
  let molarity: number;
  let molesDerivedFromMass = false;

  switch (input.solveFor) {
    case "molarity": {
      const resolved = resolveMolesFromMassOrDirect(input, procedure);
      moles = resolved.moles;
      molesDerivedFromMass = resolved.derivedFromMass;
      if (input.volume === undefined) throw new CalculatorError('Falta el "volumen (L)".');
      volume = requirePositive(input.volume, "Volumen");
      molarity = requireFiniteResult(moles / volume, "la molaridad");
      procedure.push(`M = mol / L = ${roundForDisplay(moles)} / ${roundForDisplay(volume)} = ${roundForDisplay(molarity)} M`);
      break;
    }
    case "volume": {
      const resolved = resolveMolesFromMassOrDirect(input, procedure);
      moles = resolved.moles;
      molesDerivedFromMass = resolved.derivedFromMass;
      if (input.molarity === undefined) throw new CalculatorError('Falta la "molaridad (M)".');
      molarity = requirePositive(input.molarity, "Molaridad");
      volume = requireFiniteResult(moles / molarity, "el volumen");
      procedure.push(`L = mol / M = ${roundForDisplay(moles)} / ${roundForDisplay(molarity)} = ${roundForDisplay(volume)} L`);
      break;
    }
    case "moles": {
      const hasMassPath = input.mass !== undefined || input.molarMass !== undefined;
      if (hasMassPath) {
        const resolved = resolveMolesFromMassOrDirect(input, procedure);
        moles = resolved.moles;
        molesDerivedFromMass = true;
        volume = input.volume !== undefined ? roundForDisplay(input.volume) : 0;
        molarity = input.molarity !== undefined ? roundForDisplay(input.molarity) : 0;
      } else {
        if (input.volume === undefined || input.molarity === undefined) {
          throw new CalculatorError(
            'Indica el volumen (L) y la molaridad (M), o la masa (g) y la masa molar (g/mol), para calcular los moles.'
          );
        }
        volume = requirePositive(input.volume, "Volumen");
        molarity = requireNonNegative(input.molarity, "Molaridad");
        moles = requireFiniteResult(molarity * volume, "los moles");
        procedure.push(`mol = M × L = ${roundForDisplay(molarity)} × ${roundForDisplay(volume)} = ${roundForDisplay(moles)} mol`);
      }
      break;
    }
  }

  const rMoles = roundForDisplay(moles);
  const rVolume = roundForDisplay(volume);
  const rMolarity = roundForDisplay(molarity);
  const value = input.solveFor === "moles" ? rMoles : input.solveFor === "volume" ? rVolume : rMolarity;

  return {
    solveFor: input.solveFor,
    value,
    moles: rMoles,
    volume: rVolume,
    molarity: rMolarity,
    molesDerivedFromMass,
    formula: molesDerivedFromMass ? "mol = masa / masa molar; M = mol / L" : "M = mol / L",
    substitution: procedure[procedure.length - 1] ?? "",
    procedure,
  };
}
