import type { PracticeCategory, PracticeDifficulty, PracticeExercise } from "./types";

const pick = <T,>(items: T[], random: () => number): T => items[Math.floor(random() * items.length)];

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

function id(seed: number, category: PracticeCategory): string {
  return `${category}-${seed.toString(36)}`;
}

function dilution(seed: number, difficulty: PracticeDifficulty): PracticeExercise {
  const random = rng(seed);
  const stock = pick(difficulty === "basico" ? [20, 25, 40, 50] : [25, 40, 50, 80], random);
  const finalVolume = pick(difficulty === "basico" ? [25, 50, 100, 200] : [50, 75, 100, 250], random);
  const ratios = difficulty === "basico" ? [2, 4, 5, 10] : [2.5, 4, 5, 8, 10];
  const ratio = pick(ratios, random);
  const finalConcentration = round(stock / ratio);
  const stockVolume = round((finalConcentration * finalVolume) / stock);
  const diluent = round(finalVolume - stockVolume);

  return {
    id: id(seed, "diluciones"),
    category: "diluciones",
    difficulty,
    statement: `Necesitas preparar ${finalVolume} mL de una solución al ${finalConcentration}% a partir de una solución madre al ${stock}%. ¿Qué volumen de solución madre debes tomar?`,
    answerLabel: "Volumen de solución madre",
    answer: { value: stockVolume, unit: "mL", tolerance: 0.05 },
    formula: "C₁ × V₁ = C₂ × V₂",
    procedure: [
      `V₁ = (C₂ × V₂) / C₁`,
      `V₁ = (${finalConcentration} × ${finalVolume}) / ${stock}`,
      `V₁ = ${stockVolume} mL`,
      `Diluyente = ${finalVolume} − ${stockVolume} = ${diluent} mL`,
    ],
  };
}

function concentration(seed: number, difficulty: PracticeDifficulty): PracticeExercise {
  const random = rng(seed);
  const volume = pick(difficulty === "basico" ? [50, 100, 200, 250] : [25, 50, 75, 150, 250], random);
  const percent = pick(difficulty === "basico" ? [2, 4, 5, 8] : [1.5, 2.5, 4, 6, 8], random);
  const mass = round((percent * volume) / 100);

  return {
    id: id(seed, "concentraciones"),
    category: "concentraciones",
    difficulty,
    statement: `Debes preparar ${volume} mL de una solución al ${percent}% m/v. ¿Cuántos gramos de soluto necesitas pesar?`,
    answerLabel: "Masa de soluto",
    answer: { value: mass, unit: "g", tolerance: 0.01 },
    formula: "% m/v = (masa (g) / volumen (mL)) × 100",
    procedure: [
      `Masa = (% × volumen) / 100`,
      `Masa = (${percent} × ${volume}) / 100`,
      `Masa = ${mass} g`,
    ],
  };
}

export function generateExercise(
  category: PracticeCategory,
  difficulty: PracticeDifficulty,
  seed = Math.floor(Math.random() * 2 ** 31)
): PracticeExercise {
  return category === "diluciones" ? dilution(seed, difficulty) : concentration(seed, difficulty);
}
