import type { PracticeCategory, PracticeDifficulty, PracticeExercise } from "./types";

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

function id(seed: number, category: PracticeCategory): string {
  return `${category}-${seed.toString(36)}`;
}

function dilution(seed: number, difficulty: PracticeDifficulty): PracticeExercise {
  const random = rng(seed);
  const templates = ["c1v1", "factor", "ratio"] as const;
  const template = pick(templates, random);
  const stock = pick(difficulty === "basico" ? [20, 25, 40, 50] : [25, 40, 50, 80], random);
  const finalVolume = pick(difficulty === "basico" ? [25, 50, 100, 200] : [50, 75, 100, 250], random);

  if (template === "factor") {
    const factor = pick(difficulty === "basico" ? [2, 5, 10] : [2, 4, 5, 8, 10], random);
    const sampleVolume = pick([5, 10, 20, 25, 50], random);
    const totalVolume = sampleVolume * factor;
    const diluent = totalVolume - sampleVolume;
    return {
      id: id(seed, "diluciones"), category: "diluciones", difficulty,
      statement: `Realizas una dilución con un factor de ${factor}. Si tomas ${sampleVolume} mL de muestra, ¿qué volumen final debes obtener y cuánto diluyente agregarás?`,
      answerLabel: "Volumen de diluyente",
      answer: { value: diluent, unit: "mL", tolerance: 0.05 },
      formula: "FD = Vfinal / Vmuestra",
      procedure: [`Vfinal = FD × Vmuestra`, `Vfinal = ${factor} × ${sampleVolume} = ${totalVolume} mL`, `Diluyente = ${totalVolume} − ${sampleVolume} = ${diluent} mL`],
    };
  }

  if (template === "ratio") {
    const ratio = pick([2, 5, 10], random);
    const sample = pick([2, 5, 10, 20], random);
    const diluent = sample * (ratio - 1);
    return {
      id: id(seed, "diluciones"), category: "diluciones", difficulty,
      statement: `Prepara una dilución ${ratio}:1 usando ${sample} mL de muestra. ¿Cuántos mL de diluyente necesitas agregar?`,
      answerLabel: "Volumen de diluyente",
      answer: { value: diluent, unit: "mL", tolerance: 0.05 },
      formula: "Diluyente = muestra × (factor − 1)",
      procedure: [`Diluyente = ${sample} × (${ratio} − 1)`, `Diluyente = ${diluent} mL`],
    };
  }

  const ratios = difficulty === "basico" ? [2, 4, 5, 10] : [2.5, 4, 5, 8, 10];
  const ratio = pick(ratios, random);
  const finalConcentration = round(stock / ratio);
  const stockVolume = round((finalConcentration * finalVolume) / stock);
  const diluent = round(finalVolume - stockVolume);
  return {
    id: id(seed, "diluciones"), category: "diluciones", difficulty,
    statement: `Necesitas preparar ${finalVolume} mL de una solución al ${finalConcentration}% a partir de una solución madre al ${stock}%. ¿Qué volumen de solución madre debes tomar?`,
    answerLabel: "Volumen de solución madre",
    answer: { value: stockVolume, unit: "mL", tolerance: 0.05 },
    formula: "C₁ × V₁ = C₂ × V₂",
    procedure: [`V₁ = (C₂ × V₂) / C₁`, `V₁ = (${finalConcentration} × ${finalVolume}) / ${stock}`, `V₁ = ${stockVolume} mL`, `Diluyente = ${finalVolume} − ${stockVolume} = ${diluent} mL`],
  };
}

function concentration(seed: number, difficulty: PracticeDifficulty): PracticeExercise {
  const random = rng(seed);
  const templates = ["mass", "concentration", "gL", "mgdl"] as const;
  const template = pick(templates, random);
  if (template === "gL") {
    const grams = pick([1, 2, 5, 10, 20], random);
    const liters = pick([0.5, 1, 2, 5], random);
    const result = round(grams / liters);
    return { id: id(seed, "concentraciones"), category: "concentraciones", difficulty, statement: `Una solución contiene ${grams} g de soluto en ${liters} L. ¿Cuál es su concentración en g/L?`, answerLabel: "Concentración", answer: { value: result, unit: "g/L", tolerance: 0.01 }, formula: "C = masa / volumen", procedure: [`C = ${grams} / ${liters}`, `C = ${result} g/L`] };
  }
  if (template === "mgdl") {
    const mgMl = pick([0.5, 1, 1.5, 2], random);
    const result = round(mgMl * 100);
    return { id: id(seed, "concentraciones"), category: "concentraciones", difficulty, statement: `Una muestra presenta ${mgMl} mg/mL de analito. ¿A cuánto equivale en mg/dL?`, answerLabel: "Concentración", answer: { value: result, unit: "mg/dL", tolerance: 0.01 }, formula: "1 mg/mL = 100 mg/dL", procedure: [`${mgMl} × 100 = ${result} mg/dL`] };
  }
  const volume = pick(difficulty === "basico" ? [50, 100, 200, 250] : [25, 50, 75, 150, 250], random);
  const percent = pick(difficulty === "basico" ? [2, 4, 5, 8] : [1.5, 2.5, 4, 6, 8], random);
  if (template === "concentration") {
    const mass = pick([1, 2, 4, 5, 8], random);
    const result = round((mass / volume) * 100);
    return { id: id(seed, "concentraciones"), category: "concentraciones", difficulty, statement: `Se disuelven ${mass} g de soluto hasta completar ${volume} mL. ¿Cuál es la concentración % m/v?`, answerLabel: "Concentración", answer: { value: result, unit: "% m/v", tolerance: 0.01 }, formula: "% m/v = (masa / volumen) × 100", procedure: [`(${mass} / ${volume}) × 100`, `= ${result}% m/v`] };
  }
  const mass = round((percent * volume) / 100);
  return { id: id(seed, "concentraciones"), category: "concentraciones", difficulty, statement: `Debes preparar ${volume} mL de una solución al ${percent}% m/v. ¿Cuántos gramos de soluto necesitas pesar?`, answerLabel: "Masa de soluto", answer: { value: mass, unit: "g", tolerance: 0.01 }, formula: "% m/v = (masa / volumen) × 100", procedure: [`Masa = (${percent} × ${volume}) / 100`, `Masa = ${mass} g`] };
}

export function generateExercise(category: PracticeCategory, difficulty: PracticeDifficulty, seed = Math.floor(Math.random() * 2 ** 31)): PracticeExercise {
  return category === "diluciones" ? dilution(seed, difficulty) : concentration(seed, difficulty);
}
