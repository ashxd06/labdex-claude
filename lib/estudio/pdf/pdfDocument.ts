import { PDFDocument } from "pdf-lib";
import { planPageChunks, type ChunkPlan } from "@/lib/estudio/pdf/chunkPlan";

/**
 * Carga, inspección y fragmentación de PDFs con pdf-lib (Fase 6, §7-8,
 * §28, §32).
 *
 * Se usa pdf-lib (dependencia pura de JS, sin binarios nativos ni
 * navegador headless, en línea con el principio ya usado por
 * `@react-pdf/renderer`) solo para:
 *   1. detectar PDFs corruptos o protegidos con contraseña antes de
 *      enviarlos a Gemini;
 *   2. conocer el número de páginas;
 *   3. partir el documento en sub-PDFs por rango de páginas para el
 *      procesamiento por lotes.
 * pdf-lib NO se usa para extraer texto ni interpretar imágenes: esa parte
 * (Fase 6, §7-10) la hace Gemini de forma nativa y multimodal sobre cada
 * sub-PDF (ver lib/estudio/analysis/pipeline.ts), evitando así añadir un
 * motor de OCR o parsing de texto independiente.
 */

export type PdfProcessingErrorReason = "corrupt" | "encrypted" | "empty";

export class PdfProcessingError extends Error {
  reason: PdfProcessingErrorReason;
  constructor(reason: PdfProcessingErrorReason, message: string) {
    super(message);
    this.name = "PdfProcessingError";
    this.reason = reason;
  }
}

export interface PdfChunkFile {
  startPage: number;
  endPage: number;
  /** Contenido del sub-PDF en base64, listo para enviarse a Gemini como
   * `inlineData`. */
  base64: string;
}

export interface InspectedPdf {
  plan: ChunkPlan;
  chunks: PdfChunkFile[];
}

/**
 * Carga un PDF, detecta que no esté vacío/corrupto/protegido, calcula el
 * plan de lotes y devuelve cada lote ya como un sub-PDF independiente en
 * base64. Nunca trunca en silencio: `plan.truncated` indica si el
 * documento tenía más páginas de las procesadas (Fase 6, §8).
 */
export async function inspectAndChunkPdf(bytes: Uint8Array): Promise<InspectedPdf> {
  if (!bytes || bytes.byteLength === 0) {
    throw new PdfProcessingError("empty", "El archivo está vacío.");
  }

  let source: PDFDocument;
  try {
    source = await PDFDocument.load(bytes, { ignoreEncryption: false });
  } catch (err) {
    const message = err instanceof Error ? err.message.toLowerCase() : "";
    if (message.includes("encrypt")) {
      throw new PdfProcessingError(
        "encrypted",
        "El PDF está protegido con contraseña y no se puede procesar."
      );
    }
    throw new PdfProcessingError("corrupt", "El PDF parece estar dañado o no es un PDF válido.");
  }

  const pageCount = source.getPageCount();
  if (pageCount === 0) {
    throw new PdfProcessingError("empty", "El PDF no contiene páginas.");
  }

  const plan = planPageChunks(pageCount);
  const chunks: PdfChunkFile[] = [];

  for (const range of plan.ranges) {
    const chunkDoc = await PDFDocument.create();
    const indices: number[] = [];
    for (let p = range.startPage; p <= range.endPage; p += 1) {
      indices.push(p - 1); // pdf-lib usa índices 0-based
    }
    const copiedPages = await chunkDoc.copyPages(source, indices);
    copiedPages.forEach((page) => chunkDoc.addPage(page));

    const chunkBytes = await chunkDoc.save();
    chunks.push({
      startPage: range.startPage,
      endPage: range.endPage,
      base64: Buffer.from(chunkBytes).toString("base64"),
    });
  }

  return { plan, chunks };
}
