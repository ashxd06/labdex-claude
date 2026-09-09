/**
 * Tipos compartidos del Hub de Estudio (Fase 6.0).
 *
 * Igual que `lib/labdex-ai/types.ts`, estos tipos son usados por el
 * pipeline de procesamiento, el chat sobre el material y las rutas de API.
 * Mantenerlos en un solo archivo evita duplicar formas de datos entre esas
 * capas.
 */

export type StudyMaterialStatus = "subiendo" | "procesando" | "listo" | "error";

export const STUDY_MATERIAL_STATUSES: StudyMaterialStatus[] = [
  "subiendo",
  "procesando",
  "listo",
  "error",
];

/** Un apartado del resumen estructurado (Fase 6, §14). */
export interface SummarySection {
  heading: string;
  content: string;
}

/** Un concepto clave extraído del material (Fase 6, §15). */
export interface KeyConcept {
  term: string;
  definition: string;
  /** Referencia de páginas legible, p. ej. "12-14", o null si no se pudo determinar. */
  pages: string | null;
}

/** Un punto de "lo que debes recordar" (Fase 6, §16). */
export interface MustRememberItem {
  text: string;
  pages: string | null;
}

/** Texto condensado de una página, usado para citas y como base de
 * recuperación simple del chat sobre el material (Fase 6, §20). */
export interface MaterialPageEntry {
  page: number;
  /** Contenido textual aproximado de la página (extraído o interpretado
   * visualmente). Puede estar vacío si la página no pudo interpretarse. */
  text: string;
  /** true si esta página contenía contenido que no pudo interpretarse con
   * claridad (manuscrito ilegible, imagen de baja calidad, etc.). */
  unclear: boolean;
}

/** Contenido estructurado generado por el pipeline de análisis (Fase 6,
 * §11 "Comprensión"). Es lo que se persiste en `study_materials` y lo que
 * alimenta tanto el Espacio de Estudio como el chat sobre el material. */
export interface StudyMaterialContent {
  summary: SummarySection[];
  keyConcepts: KeyConcept[];
  mustRemember: MustRememberItem[];
  simpleExplanation: string;
  pageIndex: MaterialPageEntry[];
  /** Avisos para el estudiante sobre limitaciones del procesamiento (Fase
   * 6, §8, §10: nunca ocultar en silencio lo que no se pudo procesar). */
  processingNotes: string[];
}

export interface StudyMaterialRecord {
  id: string;
  user_id: string;
  title: string;
  original_filename: string;
  storage_path: string;
  file_size_bytes: number;
  status: StudyMaterialStatus;
  page_count: number | null;
  pages_processed: number | null;
  truncated: boolean;
  error_message: string | null;
  summary: SummarySection[] | null;
  key_concepts: KeyConcept[] | null;
  must_remember: MustRememberItem[] | null;
  simple_explanation: string | null;
  page_index: MaterialPageEntry[] | null;
  processing_notes: string[] | null;
  last_studied_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Forma "ligera" de un material, segura para listas (sin el índice de
 * páginas completo, que puede ser voluminoso). */
export interface StudyMaterialSummaryView {
  id: string;
  title: string;
  originalFilename: string;
  status: StudyMaterialStatus;
  pageCount: number | null;
  pagesProcessed: number | null;
  truncated: boolean;
  errorMessage: string | null;
  lastStudiedAt: string | null;
  createdAt: string;
}

export function toSummaryView(record: StudyMaterialRecord): StudyMaterialSummaryView {
  return {
    id: record.id,
    title: record.title,
    originalFilename: record.original_filename,
    status: record.status,
    pageCount: record.page_count,
    pagesProcessed: record.pages_processed,
    truncated: record.truncated,
    errorMessage: record.error_message,
    lastStudiedAt: record.last_studied_at,
    createdAt: record.created_at,
  };
}

export function toMaterialContent(record: StudyMaterialRecord): StudyMaterialContent | null {
  if (record.status !== "listo") return null;
  return {
    summary: record.summary ?? [],
    keyConcepts: record.key_concepts ?? [],
    mustRemember: record.must_remember ?? [],
    simpleExplanation: record.simple_explanation ?? "",
    pageIndex: record.page_index ?? [],
    processingNotes: record.processing_notes ?? [],
  };
}
