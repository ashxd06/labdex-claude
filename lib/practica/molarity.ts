import type { PracticeDifficulty, PracticeExercise } from "./types";

const pick = <T,>(items: readonly T[], random: () => number): T => items[Math.floor(random() * items.length)];

function rng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function round(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function exercise(
  seed: number,
  difficulty: PracticeDifficulty,
  statement: string,
  answerLabel: string,
  value: number,
  unit: string,
  formula: string,
  procedure: string[],
  tolerance = 0.01,
): PracticeExercise {
  return {
    id: `molaridad-${seed.toString(36)}`,
    category: "molaridad",
    difficulty,
    statement,
    answerLabel,
    answer: { value: round(value), unit, tolerance },
    formula,
    procedure,
  };
}

type Solute = { name: string; pm: number };

const solutes: readonly Solute[] = [
  { name: "NaCl", pm: 58.44 },
  { name: "glucosa", pm: 180.16 },
  { name: "KCl", pm: 74.55 },
];

export function generateMolarityExercise(seed: number, difficulty: PracticeDifficulty): PracticeExercise {
  const random = rng(seed);
  const solute = pick(solutes, random);

  if (difficulty === "basico") {
    const template = pick(["massToM", "mToMass"] as const, random);

    if (template === "massToM") {
      const volume = pick([0.25, 0.5, 1], random);
      const moles = pick([0.05, 0.1, 0.2], random);
      const mass = moles * solute.pm;
      const molarity = moles / volume;
      return exercise(
        seed,
        difficulty,
        `Se pesan ${round(mass)} g de ${solute.name} (PM = ${solute.pm} g/mol) y se completa la solución hasta ${volume} L. ¿Cuál es la molaridad?`,
        "Molaridad",
        molarity,
        "mol/L",
        "M = n / V; n = masa / PM",
        [
          `n = ${round(mass)} / ${solute.pm} = ${round(moles)} mol`,
          `M = ${round(moles)} / ${volume} = ${round(molarity)} mol/L`,
        ],
      );
    }

    const molarity = pick([0.1, 0.25, 0.5, 1], random);
    const volume = pick([0.25, 0.5, 1], random);
    const mass = molarity * volume * solute.pm;
    return exercise(
      seed,
      difficulty,
      `Necesitas preparar ${volume} L de una solución ${molarity} M de ${solute.name} (PM = ${solute.pm} g/mol). ¿Cuántos gramos debes pesar?`,
      "Masa de soluto",
      mass,
      "g",
      "masa = M × V × PM",
      [
        `n = ${molarity} × ${volume} = ${round(molarity * volume)} mol`,
        `masa = ${round(molarity * volume)} × ${solute.pm} = ${round(mass)} g`,
      ],
      0.05,
    );
  }

  if (difficulty === "tecnico") {
    const template = pick(["dilution", "volume", "molarityFromMass"] as const, random);

    if (template === "dilution") {
      const stock = pick([2, 5, 10], random);
      const target = pick([0.1, 0.2, 0.5], random);
      const finalVolume = pick([100, 250, 500], random);
      const stockVolume = (target * finalVolume) / stock;
      return exercise(
        seed,
        difficulty,
        `Debes preparar ${finalVolume} mL de una solución ${target} M a partir de una solución madre ${stock} M. ¿Qué volumen de solución madre necesitas?`,
        "Volumen de solución madre",
        stockVolume,
        "mL",
        "M₁V₁ = M₂V₂",
        [
          `V₁ = (M₂ × V₂) / M₁`,
          `V₁ = (${target} × ${finalVolume}) / ${stock} = ${round(stockVolume)} mL`,
        ],
        0.05,
      );
    }

    if (template === "volume") {
      const molarity = pick([0.2, 0.5, 1], random);
      const moles = pick([0.05, 0.1, 0.25], random);
      const volume = moles / molarity;
      return exercise(
        seed,
        difficulty,
        `Dispones de ${round(moles)} mol de ${solute.name} y quieres preparar una solución de ${molarity} M. ¿Qué volumen final debes preparar?`,
        "Volumen final",
        volume * 1000,
        "mL",
        "V = n / M",
        [`V = ${round(moles)} / ${molarity} = ${round(volume)} L`, `V = ${round(volume * 1000)} mL`],
        0.05,
      );
    }

    const mass = pick([5, 10, 20, 29.22], random);
    const volume = pick([0.25, 0.5, 1], random);
    const moles = mass / solute.pm;
    const molarity = moles / volume;
    return exercise(
      seed,
      difficulty,
      `Se disuelven ${mass} g de ${solute.name} (PM = ${solute.pm} g/mol) y se completa hasta ${volume} L. ¿Cuál es la molaridad de la solución?`,
      "Molaridad",
      molarity,
      "mol/L",
      "M = (masa / PM) / V",
      [
        `n = ${mass} / ${solute.pm} = ${round(moles)} mol`,
        `M = ${round(moles)} / ${volume} = ${round(molarity)} mol/L`,
      ],
    );
  }

  const template = pick(["massPreparation", "serialDilution", "twoStep"] as const, random);

  if (template === "massPreparation") {
    const molarity = pick([0.25, 0.5, 0.75, 1], random);
    const volume = pick([0.2, 0.25, 0.5], random);
    const moles = molarity * volume;
    const mass = moles * solute.pm;
    return exercise(
      seed,
      difficulty,
      `En el laboratorio debes preparar ${volume * 1000} mL de una solución ${molarity} M de ${solute.name} (PM = ${solute.pm} g/mol). ¿Cuántos gramos debes pesar?`,
      "Masa de soluto",
      mass,
      "g",
      "masa = M × V × PM",
      [
        `n = ${molarity} × ${volume} = ${round(moles)} mol`,
        `masa = ${round(moles)} × ${solute.pm} = ${round(mass)} g`,
      ],
      0.05,
    );
  }

  if (template === "serialDilution") {
    const initial = pick([2, 4, 5], random);
    const factor1 = pick([2, 5, 10], random);
    const factor2 = pick([2, 5, 10], random);
    const finalM = initial / (factor1 * factor2);
    return exercise(
      seed,
      difficulty,
      `Una solución ${initial} M se diluye ${factor1} veces y luego ${factor2} veces. ¿Cuál es la molaridad final?`,
      "Molaridad final",
      finalM,
      "mol/L",
      "Mfinal = Minicial / (FD₁ × FD₂)",
      [
        `FDtotal = ${factor1} × ${factor2} = ${factor1 * factor2}`,
        `Mfinal = ${initial} / ${factor1 * factor2} = ${round(finalM)} mol/L`,
      ],
    );
  }

  const stock = pick([2, 5, 10], random);
  const final = pick([0.2, 0.5, 1], random);
  const targetVolume = pick([250, 500, 1000], random);
  const stockVolume = (final * targetVolume) / stock;
  const diluent = targetVolume - stockVolume;
  return exercise(
    seed,
    difficulty,
    `Para preparar ${targetVolume} mL de una solución ${final} M a partir de una solución madre ${stock} M, ¿cuántos mL de diluyente debes agregar después de medir la solución madre?`,
    "Volumen de diluyente",
    diluent,
    "mL",
    "M₁V₁ = M₂V₂; Diluyente = V₂ − V₁",
    [
      `V₁ = (${final} × ${targetVolume}) / ${stock} = ${round(stockVolume)} mL`,
      `Diluyente = ${targetVolume} − ${round(stockVolume)} = ${round(diluent)} mL`,
    ],
    0.05,
  );
}
