/**
 * Lógica pura de intentos (Fase 6.1, §15, §21, §39, §46): aleatorización de
 * preguntas y armado de una sesión de "repasar errores" a partir de un
 * intento anterior. Se mantiene sin dependencias de Supabase para poder
 * probarse de forma aislada; las rutas de API son quienes conocen la base
 * de datos y llaman a estas funciones con los IDs ya cargados.
 */

/** Fisher-Yates determinista con una función de aleatoriedad inyectable
 * (por defecto Math.random) para poder probar el orden en tests. */
export function shuffle<T>(items: T[], random: () => number = Math.random): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** Elige hasta `count` ids de una lista disponible, en orden aleatorio, sin
 * repetir (Fase 6.1, §15: "no mostrar siempre exactamente el mismo orden"). */
export function pickRandomIds(availableIds: string[], count: number, random: () => number = Math.random): string[] {
  const shuffled = shuffle(availableIds, random);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

/**
 * Construye el conjunto de preguntas para una sesión de "repasar errores"
 * (Fase 6.1, §21, §46): únicamente las preguntas que el estudiante respondió
 * incorrectamente en un intento previo, en orden aleatorio.
 */
export function buildErrorReviewQuestionIds(
  answers: { question_id: string; is_correct: boolean }[],
  random: () => number = Math.random
): string[] {
  const incorrectIds = answers.filter((a) => !a.is_correct).map((a) => a.question_id);
  // Por si una pregunta aparece más de una vez (no debería, hay un unique
  // constraint por intento+pregunta, pero es defensivo).
  const unique = Array.from(new Set(incorrectIds));
  return shuffle(unique, random);
}
