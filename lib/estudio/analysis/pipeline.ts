import { inspectAndChunkPdf } from "@/lib/estudio/pdf/pdfDocument";
import {
  buildChunkSystemPrompt,
  buildChunkUserMessage,
  buildSynthesisSystemPrompt,
  buildSynthesisUserMessage,
} from "@/lib/estudio/analysis/prompts";
import { safeParseJson, type ChunkAnalysisResult, type SynthesisResult } from "@/lib/estudio/analysis/types";
import {
  getGeminiAdapter,
  isGeminiConfigured,
  GeminiNotConfiguredError,
  GeminiRequestError,
  GeminiTimeoutError,
} from "@/lib/labdex-ai/gemini/client";
import type { StudyMaterialContent } from "@/lib/estudio/types";

/**
 * Orquestación del pipeline de análisis de un PDF completo (Fase 6, §11,
 * §27-29): fragmenta el documento, analiza cada lote con Gemini
 * (multimodal, un solo modelo — se reutiliza la integración de Fase 5, sin
 * crear otro cliente) y combina todo en una única síntesis estructurada.
 *
 * Se mantiene como una función pura sobre bytes en memoria (sin tocar
 * Supabase) para poder probarse por partes; la ruta de API es quien
 * conoce al usuario autenticado y persiste el resultado.
 */

export { PdfProcessingError } from "@/lib/estudio/pdf/pdfDocument";

export class StudyMaterialAnalysisError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StudyMaterialAnalysisError";
  }
}

export interface AnalyzeStudyMaterialResult {
  content: StudyMaterialContent;
  pageCount: number;
  pagesProcessed: number;
  truncated: boolean;
}

async function analyzeChunk(
  materialTitle: string,
  totalPages: number,
  chunk: { startPage: number; endPage: number; base64: string }
): Promise<ChunkAnalysisResult | null> {
  const adapter = getGeminiAdapter();
  const raw = await adapter.generateWithFile({
    systemInstruction: buildChunkSystemPrompt(),
    userMessage: buildChunkUserMessage(
      { startPage: chunk.startPage, endPage: chunk.endPage },
      totalPages,
      materialTitle
    ),
    file: { mimeType: "application/pdf", data: chunk.base64 },
    expectJson: true,
    maxOutputTokens: 8192,
  });

  return safeParseJson<ChunkAnalysisResult>(raw);
}

/**
 * Analiza un PDF completo (ya cargado en memoria) y devuelve el contenido
 * estructurado del material de estudio. Lanza `PdfProcessingError` si el
 * archivo está vacío/corrupto/protegido, `GeminiNotConfiguredError` si no
 * hay `GEMINI_API_KEY`, o `StudyMaterialAnalysisError` si la síntesis final
 * no pudo generarse (fallo "duro": sin síntesis no hay material utilizable).
 * Los fallos de lotes individuales, en cambio, se degradan de forma
 * controlada: se reportan en `processingNotes` en vez de abortar todo el
 * pipeline (Fase 6, §30).
 */
export async function analyzeStudyMaterial(params: {
  title: string;
  pdfBytes: Uint8Array;
}): Promise<AnalyzeStudyMaterialResult> {
  if (!isGeminiConfigured()) {
    throw new GeminiNotConfiguredError();
  }

  const { plan, chunks } = await inspectAndChunkPdf(params.pdfBytes);

  const chunkResults: ChunkAnalysisResult[] = [];
  const chunkFailures: { startPage: number; endPage: number }[] = [];

  for (const chunk of chunks) {
    try {
      const result = await analyzeChunk(params.title, plan.pageCount, chunk);
      if (result && Array.isArray(result.pages)) {
        chunkResults.push(result);
      } else {
        chunkFailures.push({ startPage: chunk.startPage, endPage: chunk.endPage });
      }
    } catch (err) {
      // Un lote individual puede fallar (timeout, error transitorio de
      // Gemini) sin que se pierda todo el documento: se reporta la
      // limitación al estudiante en vez de ocultarla (Fase 6, §8, §30).
      if (err instanceof GeminiNotConfiguredError) throw err;
      chunkFailures.push({ startPage: chunk.startPage, endPage: chunk.endPage });
    }
  }

  if (chunkResults.length === 0) {
    throw new StudyMaterialAnalysisError(
      "No se pudo analizar ninguna parte del documento. Puede que el archivo esté dañado o que el servicio de IA no esté disponible en este momento."
    );
  }

  const synthesisRaw = await getGeminiAdapter().generate({
    systemInstruction: buildSynthesisSystemPrompt(),
    history: [],
    userMessage: buildSynthesisUserMessage({
      materialTitle: params.title,
      pageCount: plan.pageCount,
      pagesProcessed: plan.pagesToProcess,
      truncated: plan.truncated,
      chunkResults,
      chunkFailures,
    }),
  });

  const synthesis = safeParseJson<SynthesisResult>(synthesisRaw);
  if (!synthesis) {
    throw new StudyMaterialAnalysisError(
      "No se pudo generar el material de estudio a partir del documento analizado."
    );
  }

  const pageIndex = chunkResults
    .flatMap((chunk) => chunk.pages)
    .sort((a, b) => a.page - b.page)
    .map((p) => ({ page: p.page, text: p.text ?? "", unclear: Boolean(p.unclear) }));

  const processingNotes = [...(synthesis.notes ?? [])];
  if (plan.truncated && !processingNotes.some((n) => n.includes(String(plan.pagesToProcess)))) {
    processingNotes.push(
      `Este documento tiene ${plan.pageCount} páginas. Por un límite técnico de esta fase, solo se procesaron las primeras ${plan.pagesToProcess}.`
    );
  }
  if (chunkFailures.length > 0) {
    const ranges = chunkFailures.map((f) => `${f.startPage}-${f.endPage}`).join(", ");
    processingNotes.push(`No se pudieron analizar las páginas ${ranges} por un error técnico. Puedes volver a subir el archivo para intentarlo de nuevo.`);
  }

  const pagesActuallyProcessed = chunkResults.reduce((sum, c) => sum + c.pages.length, 0);

  return {
    content: {
      summary: synthesis.summary ?? [],
      keyConcepts: synthesis.keyConcepts ?? [],
      mustRemember: synthesis.mustRemember ?? [],
      simpleExplanation: synthesis.simpleExplanation ?? "",
      pageIndex,
      processingNotes,
    },
    pageCount: plan.pageCount,
    pagesProcessed: pagesActuallyProcessed,
    truncated: plan.truncated || chunkFailures.length > 0,
  };
}

export { GeminiNotConfiguredError, GeminiRequestError, GeminiTimeoutError };
