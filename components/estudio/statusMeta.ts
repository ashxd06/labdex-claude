import type { StudyMaterialStatus } from "@/lib/estudio/types";

export const STATUS_LABELS: Record<StudyMaterialStatus, string> = {
  subiendo: "Subiendo",
  procesando: "Procesando",
  listo: "Procesado",
  error: "Error",
};

export const STATUS_TONES: Record<StudyMaterialStatus, "neutral" | "warning" | "success" | "danger"> = {
  subiendo: "neutral",
  procesando: "warning",
  listo: "success",
  error: "danger",
};
