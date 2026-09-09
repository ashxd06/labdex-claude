/**
 * Planificación de lotes/chunks para PDFs grandes (Fase 6, §8, §28).
 *
 * Esta lógica es intencionalmente pura (no toca pdf-lib ni E/S) para poder
 * probarla de forma aislada. `lib/estudio/pdf/pdfDocument.ts` la usa junto
 * con pdf-lib para partir el PDF real en sub-documentos.
 */

/** Páginas por lote enviado a Gemini. 15 páginas mantiene cada petición
 * dentro de un tamaño razonable (Fase 6, §29: costo/eficiencia) y coincide
 * con el orden de magnitud del ejemplo de la especificación (lotes de 20). */
export const PAGES_PER_CHUNK = 15;

/**
 * Límite técnico de páginas procesadas por documento en esta fase. No es un
 * límite arbitrario de "solo las primeras páginas" (Fase 6, §8): es un tope
 * explícito, comunicado siempre al estudiante cuando se alcanza (§8, §10),
 * elegido para que el procesamiento completo de un documento quepa en el
 * tiempo de ejecución de una función serverless sin necesitar todavía una
 * cola de trabajo en segundo plano (dejado preparado para Fase 6.x).
 */
export const MAX_PAGES_PROCESSED = 90;

export interface PageChunkRange {
  /** Número de página inicial, 1-indexado, inclusive. */
  startPage: number;
  /** Número de página final, 1-indexado, inclusive. */
  endPage: number;
}

export interface ChunkPlan {
  /** Total de páginas del documento original. */
  pageCount: number;
  /** Cuántas páginas se van a procesar realmente (puede ser menor que
   * `pageCount` si se superó `MAX_PAGES_PROCESSED`). */
  pagesToProcess: number;
  /** true si el documento tiene más páginas de las que se procesarán. */
  truncated: boolean;
  ranges: PageChunkRange[];
}

/** Calcula los rangos de páginas a procesar para un documento con
 * `pageCount` páginas. No lanza errores: un `pageCount` de 0 produce un
 * plan sin rangos (el llamador decide qué hacer con un PDF vacío). */
export function planPageChunks(
  pageCount: number,
  pagesPerChunk: number = PAGES_PER_CHUNK,
  maxPagesProcessed: number = MAX_PAGES_PROCESSED
): ChunkPlan {
  const safePageCount = Math.max(0, Math.floor(pageCount));
  const pagesToProcess = Math.min(safePageCount, maxPagesProcessed);
  const truncated = safePageCount > pagesToProcess;

  const ranges: PageChunkRange[] = [];
  for (let start = 1; start <= pagesToProcess; start += pagesPerChunk) {
    const end = Math.min(start + pagesPerChunk - 1, pagesToProcess);
    ranges.push({ startPage: start, endPage: end });
  }

  return { pageCount: safePageCount, pagesToProcess, truncated, ranges };
}
