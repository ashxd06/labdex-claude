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

function exercise(
  seed: number,
  category: PracticeCategory,
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
    id: id(seed, category),
    category,
    difficulty,
    statement,
    answerLabel,
    answer: { value: round(value), unit, tolerance },
    formula,
    procedure,
  };
}

function dilution(seed: number, difficulty: PracticeDifficulty): PracticeExercise {
  const random = rng(seed);

  if (difficulty === "basico") {
    const template = pick(["c1v1", "factor", "ratio"] as const, random);

    if (template === "factor") {
      const factor = pick([2, 5, 10], random);
      const sample = pick([5, 10, 20, 25], random);
      const finalVolume = sample * factor;
      const diluent = finalVolume - sample;
      return exercise(
        seed,
        "diluciones",
        difficulty,
        `Realizas una dilución con un factor de ${factor}. Si tomas ${sample} mL de muestra, ¿cuántos mL de diluyente debes agregar?`,
        "Volumen de diluyente",
        diluent,
        "mL",
        "FD = Vfinal / Vmuestra",
        [`Vfinal = ${factor} × ${sample} = ${finalVolume} mL`, `Diluyente = ${finalVolume} − ${sample} = ${diluent} mL`],
      );
    }

    if (template === "ratio") {
      const factor = pick([2, 5, 10], random);
      const sample = pick([2, 5, 10, 20], random);
      const diluent = sample * (factor - 1);
      return exercise(
        seed,
        "diluciones",
        difficulty,
        `Prepara una dilución 1:${factor} (1 parte de muestra + ${factor - 1} partes de diluyente) usando ${sample} mL de muestra. ¿Cuántos mL de diluyente necesitas?`,
        "Volumen de diluyente",
        diluent,
        "mL",
        "Diluyente = muestra × (factor − 1)",
        [`Diluyente = ${sample} × (${factor} − 1)`, `Diluyente = ${diluent} mL`],
      );
    }

    const stock = pick([20, 25, 40, 50], random);
    const ratio = pick([2, 4, 5, 10], random);
    const target = round(stock / ratio);
    const finalVolume = pick([50, 100, 200], random);
    const stockVolume = (target * finalVolume) / stock;
    return exercise(
      seed,
      "diluciones",
      difficulty,
      `Necesitas preparar ${finalVolume} mL de una solución al ${target}% a partir de una solución madre al ${stock}%. ¿Qué volumen de solución madre debes tomar?`,
      "Volumen de solución madre",
      stockVolume,
      "mL",
      "C₁ × V₁ = C₂ × V₂",
      [`V₁ = (C₂ × V₂) / C₁`, `V₁ = (${target} × ${finalVolume}) / ${stock}`, `V₁ = ${round(stockVolume)} mL`],
      0.05,
    );
  }

  if (difficulty === "tecnico") {
    const template = pick(["findC2", "findV2", "findFactor", "prepare"] as const, random);
    const c1 = pick([20, 25, 40, 50, 80], random);
    const v1 = pick([5, 10, 20, 25], random);

    if (template === "findC2") {
      const v2 = pick([25, 50, 100, 200], random);
      const c2 = (c1 * v1) / v2;
      return exercise(seed, "diluciones", difficulty, `Tomas ${v1} mL de una solución al ${c1}% y completas con diluyente hasta ${v2} mL. ¿Cuál será la concentración final?`, "Concentración final", c2, "%", "C₂ = (C₁ × V₁) / V₂", [`C₂ = (${c1} × ${v1}) / ${v2}`, `C₂ = ${round(c2)}%`]);
    }

    if (template === "findV2") {
      const c2 = pick([2, 4, 5, 8, 10], random);
      const v2 = (c1 * v1) / c2;
      return exercise(seed, "diluciones", difficulty, `Tomas ${v1} mL de una solución al ${c1}% y quieres obtener una concentración final de ${c2}%. ¿A qué volumen final debes completar?`, "Volumen final", v2, "mL", "V₂ = (C₁ × V₁) / C₂", [`V₂ = (${c1} × ${v1}) / ${c2}`, `V₂ = ${round(v2)} mL`]);
    }

    if (template === "findFactor") {
      const v2 = pick([25, 50, 100, 200], random);
      const factor = v2 / v1;
      return exercise(seed, "diluciones", difficulty, `Una muestra de ${v1} mL se lleva hasta un volumen final de ${v2} mL. ¿Cuál es el factor de dilución?`, "Factor de dilución", factor, "FD", "FD = Vfinal / Vmuestra", [`FD = ${v2} / ${v1}`, `FD = ${round(factor)}`]);
    }

    const target = pick([2, 4, 5, 8, 10], random);
    const finalVolume = pick([50, 100, 200], random);
    const stockVolume = (target * finalVolume) / c1;
    const diluent = finalVolume - stockVolume;
    return exercise(seed, "diluciones", difficulty, `Debes preparar ${finalVolume} mL al ${target}% usando una solución madre al ${c1}%. ¿Cuántos mL de diluyente debes agregar después de medir la solución madre?`, "Volumen de diluyente", diluent, "mL", "V₁ = (C₂ × V₂) / C₁; Diluyente = V₂ − V₁", [`V₁ = (${target} × ${finalVolume}) / ${c1} = ${round(stockVolume)} mL`, `Diluyente = ${finalVolume} − ${round(stockVolume)} = ${round(diluent)} mL`], 0.05);
  }

  const template = pick(["serial", "reverse", "finalConcentration"] as const, random);
  const stock = pick([40, 50, 80, 100], random);

  if (template === "serial") {
    const factor1 = pick([2, 5, 10], random);
    const factor2 = pick([2, 5, 10], random);
    const totalFactor = factor1 * factor2;
    const finalConcentration = stock / totalFactor;
    return exercise(seed, "diluciones", difficulty, `Una solución al ${stock}% se diluye primero ${factor1} veces y luego ${factor2} veces. ¿Cuál es la concentración final?`, "Concentración final", finalConcentration, "%", "FDtotal = FD₁ × FD₂; Cfinal = Cinicial / FDtotal", [`FDtotal = ${factor1} × ${factor2} = ${totalFactor}`, `Cfinal = ${stock} / ${totalFactor} = ${round(finalConcentration)}%`]);
  }

  if (template === "reverse") {
    const finalVolume = pick([100, 200, 250], random);
    const target = pick([2, 4, 5, 8], random);
    const stockVolume = (target * finalVolume) / stock;
    const diluent = finalVolume - stockVolume;
    return exercise(seed, "diluciones", difficulty, `En el laboratorio debes preparar ${finalVolume} mL al ${target}% desde una solución madre al ${stock}%. ¿Cuántos mL de diluyente necesitas si ya mediste el volumen correcto de solución madre?`, "Volumen de diluyente", diluent, "mL", "C₁ × V₁ = C₂ × V₂; Diluyente = V₂ − V₁", [`V₁ = (${target} × ${finalVolume}) / ${stock} = ${round(stockVolume)} mL`, `Diluyente = ${finalVolume} − ${round(stockVolume)} = ${round(diluent)} mL`], 0.05);
  }

  const sample = pick([5, 10, 20], random);
  const finalVolume = pick([50, 100, 200], random);
  const finalConcentration = (stock * sample) / finalVolume;
  return exercise(seed, "diluciones", difficulty, `Una muestra de ${sample} mL de una solución al ${stock}% se diluye hasta ${finalVolume} mL. ¿Qué concentración final se obtiene?`, "Concentración final", finalConcentration, "%", "C₂ = (C₁ × V₁) / V₂", [`C₂ = (${stock} × ${sample}) / ${finalVolume}`, `C₂ = ${round(finalConcentration)}%`]);
}

function concentration(seed: number, difficulty: PracticeDifficulty): PracticeExercise {
  const random = rng(seed);

  if (difficulty === "basico") {
    const template = pick(["mass", "percent", "gL", "mgdl"] as const, random);
    if (template === "mass") {
      const volume = pick([50, 100, 200, 250], random);
      const percent = pick([2, 4, 5, 8], random);
      const mass = (percent * volume) / 100;
      return exercise(seed, "concentraciones", difficulty, `Debes preparar ${volume} mL de una solución al ${percent}% m/v. ¿Cuántos gramos de soluto necesitas pesar?`, "Masa de soluto", mass, "g", "% m/v = (masa / volumen) × 100", [`Masa = (${percent} × ${volume}) / 100`, `Masa = ${round(mass)} g`]);
    }
    if (template === "percent") {
      const volume = pick([50, 100, 200, 250], random);
      const mass = pick([1, 2, 4, 5, 10], random);
      const percent = (mass / volume) * 100;
      return exercise(seed, "concentraciones", difficulty, `Se disuelven ${mass} g de soluto hasta completar ${volume} mL. ¿Cuál es la concentración % m/v?`, "Concentración", percent, "% m/v", "% m/v = (masa / volumen) × 100", [`(${mass} / ${volume}) × 100`, `= ${round(percent)}% m/v`]);
    }
    if (template === "gL") {
      const grams = pick([1, 2, 5, 10, 20], random);
      const liters = pick([0.5, 1, 2, 5], random);
      const result = grams / liters;
      return exercise(seed, "concentraciones", difficulty, `Una solución contiene ${grams} g de soluto en ${liters} L. ¿Cuál es su concentración en g/L?`, "Concentración", result, "g/L", "C = masa / volumen", [`C = ${grams} / ${liters}`, `C = ${round(result)} g/L`]);
    }
    const mgMl = pick([0.5, 1, 1.5, 2], random);
    return exercise(seed, "concentraciones", difficulty, `Una muestra presenta ${mgMl} mg/mL de analito. ¿A cuánto equivale en mg/dL?`, "Concentración", mgMl * 100, "mg/dL", "1 mg/mL = 100 mg/dL", [`${mgMl} × 100 = ${mgMl * 100} mg/dL`]);
  }

  if (difficulty === "tecnico") {
    const template = pick(["vv", "ppm", "reverseMass", "reverseVolume"] as const, random);
    if (template === "vv") {
      const solute = pick([5, 10, 15, 20], random);
      const finalVolume = pick([50, 100, 200], random);
      return exercise(seed, "concentraciones", difficulty, `Se utilizan ${solute} mL de reactivo y se completa hasta ${finalVolume} mL de solución. ¿Cuál es la concentración % v/v?`, "Concentración", (solute / finalVolume) * 100, "% v/v", "% v/v = (volumen de soluto / volumen final) × 100", [`(${solute} / ${finalVolume}) × 100`, `= ${round((solute / finalVolume) * 100)}% v/v`]);
    }
    if (template === "ppm") {
      const mg = pick([1, 2, 5, 10, 20], random);
      const liters = pick([1, 2, 5, 10], random);
      const ppm = mg / liters;
      return exercise(seed, "concentraciones", difficulty, `Una solución contiene ${mg} mg de soluto en ${liters} L. ¿Cuál es la concentración aproximada en ppm?`, "Concentración", ppm, "ppm", "ppm ≈ mg/L", [`${mg} / ${liters} = ${round(ppm)} mg/L`, `Por definición práctica para soluciones acuosas: ${round(ppm)} ppm`]);
    }
    if (template === "reverseMass") {
      const percent = pick([1, 2, 4, 5, 8], random);
      const mass = pick([2, 4, 5, 10], random);
      const volume = (mass * 100) / percent;
      return exercise(seed, "concentraciones", difficulty, `Una solución debe quedar al ${percent}% m/v y dispones de ${mass} g de soluto. ¿Qué volumen final debes preparar?`, "Volumen final", volume, "mL", "Volumen = (masa × 100) / %", [`V = (${mass} × 100) / ${percent}`, `V = ${round(volume)} mL`]);
    }
    const percent = pick([2, 4, 5, 8], random);
    const volume = pick([50, 100, 200], random);
    const mass = (percent * volume) / 100;
    return exercise(seed, "concentraciones", difficulty, `Para preparar ${volume} mL al ${percent}% m/v, ¿cuántos gramos de soluto necesitas?`, "Masa de soluto", mass, "g", "Masa = (% × volumen) / 100", [`Masa = (${percent} × ${volume}) / 100`, `Masa = ${round(mass)} g`]);
  }

  const template = pick(["dilute", "combined", "convert"] as const, random);
  if (template === "dilute") {
    const initial = pick([2, 4, 5, 8], random);
    const sample = pick([10, 20, 25], random);
    const finalVolume = pick([50, 100, 200], random);
    const finalPercent = (initial * sample) / finalVolume;
    return exercise(seed, "concentraciones", difficulty, `Tienes una solución al ${initial}% m/v. Tomas ${sample} mL y completas con diluyente hasta ${finalVolume} mL. ¿Cuál es la concentración final?`, "Concentración final", finalPercent, "% m/v", "C₁V₁ = C₂V₂", [`C₂ = (${initial} × ${sample}) / ${finalVolume}`, `C₂ = ${round(finalPercent)}% m/v`]);
  }
  if (template === "combined") {
    const percent = pick([2, 4, 5, 8], random);
    const firstVolume = pick([50, 100, 200], random);
    const secondVolume = pick([100, 200, 250, 500], random);
    const mass = (percent * firstVolume) / 100;
    const finalPercent = (mass / secondVolume) * 100;
    return exercise(seed, "concentraciones", difficulty, `Una solución al ${percent}% m/v ocupa inicialmente ${firstVolume} mL. Se transfiere todo el soluto a un volumen final de ${secondVolume} mL. ¿Cuál es la nueva concentración % m/v?`, "Concentración final", finalPercent, "% m/v", "% m/v = (masa / volumen) × 100", [`Masa de soluto = (${percent} × ${firstVolume}) / 100 = ${round(mass)} g`, `Cfinal = (${round(mass)} / ${secondVolume}) × 100 = ${round(finalPercent)}% m/v`]);
  }
  const mgMl = pick([0.5, 1, 1.5, 2], random);
  const ml = pick([10, 20, 50], random);
  const totalMg = mgMl * ml;
  return exercise(seed, "concentraciones", difficulty, `Un analito tiene ${mgMl} mg/mL. Si se toman ${ml} mL, ¿cuántos mg de analito hay en la alícuota?`, "Masa de analito", totalMg, "mg", "Masa = concentración × volumen", [`Masa = ${mgMl} × ${ml}`, `Masa = ${round(totalMg)} mg`]);
}

export function generateExercise(
  category: PracticeCategory,
  difficulty: PracticeDifficulty,
  seed = Math.floor(Math.random() * 2 ** 31),
): PracticeExercise {
  return category === "diluciones" ? dilution(seed, difficulty) : concentration(seed, difficulty);
}
