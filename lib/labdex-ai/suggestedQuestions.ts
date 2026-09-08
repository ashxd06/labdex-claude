import type { LabdexSourceType } from "@/lib/labdex-ai/types";

/**
 * Preguntas sugeridas por tipo de ficha (Fase 5, §11). Se generan a partir
 * del `sourceType`/título real de la ficha; no dependen de datos
 * inventados.
 */
export function buildFicheSuggestedQuestions(sourceType: LabdexSourceType, title: string): string[] {
  switch (sourceType) {
    case "microorganism":
      return [
        `¿Cuál es la morfología de ${title}?`,
        `¿Qué tinción presenta ${title}?`,
        `¿Qué medios de cultivo se utilizan para ${title}?`,
        `¿Qué pruebas permiten identificar ${title}?`,
        `¿Cuál es la importancia clínica de ${title}?`,
      ];
    case "analysis":
      return [
        `¿Cuál es el principio del método de ${title}?`,
        `¿Qué muestra se utiliza para ${title}?`,
        `¿Cómo se realiza el cálculo de ${title}?`,
        `¿Cómo se interpretan los resultados de ${title}?`,
      ];
    case "test":
      return [
        `¿Cuál es el principio de la prueba ${title}?`,
        `¿Qué muestra requiere ${title}?`,
        `¿Cómo se interpreta el resultado de ${title}?`,
      ];
    case "procedure":
      return [
        `¿Cuál es el objetivo del procedimiento ${title}?`,
        `¿Qué materiales se necesitan para ${title}?`,
        `¿Qué precauciones se deben tener al realizar ${title}?`,
      ];
    default:
      return [`Explícame ${title} usando la información oficial de LABDEX.`];
  }
}

/** Preguntas sugeridas por modo, cuando no se abre desde una ficha concreta. */
export const GENERAL_SUGGESTED_QUESTIONS: string[] = [
  "¿Qué medios de cultivo se usan para aislar Staphylococcus aureus?",
  "Explícame la diferencia entre una prueba de catalasa y una de coagulasa.",
  "¿Cómo se interpreta un antibiograma?",
  "¿Qué es la tinción de Gram y para qué sirve?",
];
