export type PracticeCategory = "diluciones" | "concentraciones";
export type PracticeDifficulty = "basico" | "tecnico" | "examen";

export interface PracticeAnswer {
  value: number;
  unit: string;
  tolerance: number;
}

export interface PracticeExercise {
  id: string;
  category: PracticeCategory;
  difficulty: PracticeDifficulty;
  statement: string;
  answerLabel: string;
  answer: PracticeAnswer;
  formula: string;
  procedure: string[];
}

export const CATEGORY_LABELS: Record<PracticeCategory, string> = {
  diluciones: "Diluciones",
  concentraciones: "Concentraciones",
};

export const DIFFICULTY_LABELS: Record<PracticeDifficulty, string> = {
  basico: "Básico",
  tecnico: "Técnico",
  examen: "Examen",
};
