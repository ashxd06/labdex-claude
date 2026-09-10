import {
  getGeminiAdapter,
  isGeminiConfigured,
  GeminiNotConfiguredError,
  GeminiRequestError,
  GeminiTimeoutError,
} from "@/lib/labdex-ai/gemini/client";
import { safeParseJson } from "@/lib/estudio/analysis/types";
import {
  buildFlashcardSystemPrompt,
  buildFlashcardUserMessage,
  buildQuestionSystemPrompt,
  buildQuestionUserMessage,
} from "@/lib/estudio/practice/prompts";
import {
  validateFlashcard,
  deduplicateFlashcards,
  validateQuestion,
  deduplicateQuestions,
  type ValidatedFlashcard,
  type ValidatedQuestion,
} from "@/lib/estudio/practice/validation";
import type { RawFlashcard, RawQuestion } from "@/lib/estudio/practice/types";
import type { StudyMaterialContent } from "@/lib/estudio/types";

/**
 * Generación de flashcards y preguntas de práctica (Fase 6.1, §7-9, §24,
 * §26-27, §42-44). Reutiliza el mismo adaptador de Gemini que el resto de
 * LABDEX AI (Fase 5) y el chat del material (Fase 6.0) — no se crea un
 * cliente ni una integración de IA independiente.
 */

export class PracticeGenerationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PracticeGenerationError";
  }
}

// Cantidades permitidas desde la interfaz (Fase 6.1, §8). El backend igual
// acepta cualquier entero razonable por si la UI cambia, pero se acota un
// máximo para no disparar generaciones enormes por error.
export const MIN_GENERATION_COUNT = 1;
export const MAX_GENERATION_COUNT = 30;

export function clampCount(count: number): number {
  if (!Number.isFinite(count)) return 10;
  return Math.min(MAX_GENERATION_COUNT, Math.max(MIN_GENERATION_COUNT, Math.round(count)));
}

interface RawFlashcardsResponse {
  flashcards?: RawFlashcard[];
}

interface RawQuestionsResponse {
  questions?: RawQuestion[];
}

export async function generateFlashcardsFromMaterial(params: {
  materialTitle: string;
  content: StudyMaterialContent;
  count: number;
}): Promise<ValidatedFlashcard[]> {
  if (!isGeminiConfigured()) {
    throw new GeminiNotConfiguredError();
  }

  const count = clampCount(params.count);
  let raw: string;
  try {
    raw = await getGeminiAdapter().generate({
      systemInstruction: buildFlashcardSystemPrompt(),
      history: [],
      userMessage: buildFlashcardUserMessage({ materialTitle: params.materialTitle, content: params.content, count }),
      expectJson: true,
      maxOutputTokens: 8192,
    });
  } catch (err) {
    if (err instanceof GeminiNotConfiguredError || err instanceof GeminiRequestError || err instanceof GeminiTimeoutError) {
      throw err;
    }
    throw new PracticeGenerationError("Ocurrió un error inesperado al generar las flashcards.");
  }

  const parsed = safeParseJson<RawFlashcardsResponse>(raw);
  if (!parsed || !Array.isArray(parsed.flashcards)) {
    throw new PracticeGenerationError("No se pudieron generar flashcards a partir de este material.");
  }

  const validated = parsed.flashcards
    .map((card) => validateFlashcard(card, params.content.pageIndex))
    .filter((c): c is ValidatedFlashcard => c !== null);

  return deduplicateFlashcards(validated).slice(0, count);
}

export async function generateQuestionsFromMaterial(params: {
  materialTitle: string;
  content: StudyMaterialContent;
  count: number;
  existingQuestions?: string[];
}): Promise<ValidatedQuestion[]> {
  if (!isGeminiConfigured()) {
    throw new GeminiNotConfiguredError();
  }

  const count = clampCount(params.count);
  let raw: string;
  try {
    raw = await getGeminiAdapter().generate({
      systemInstruction: buildQuestionSystemPrompt(),
      history: [],
      userMessage: buildQuestionUserMessage({
        materialTitle: params.materialTitle,
        content: params.content,
        count,
        existingQuestions: params.existingQuestions,
      }),
      expectJson: true,
      maxOutputTokens: 8192,
    });
  } catch (err) {
    if (err instanceof GeminiNotConfiguredError || err instanceof GeminiRequestError || err instanceof GeminiTimeoutError) {
      throw err;
    }
    throw new PracticeGenerationError("Ocurrió un error inesperado al generar las preguntas.");
  }

  const parsed = safeParseJson<RawQuestionsResponse>(raw);
  if (!parsed || !Array.isArray(parsed.questions)) {
    throw new PracticeGenerationError("No se pudieron generar preguntas a partir de este material.");
  }

  const validated = parsed.questions
    .map((q) => validateQuestion(q, params.content.pageIndex))
    .filter((q): q is ValidatedQuestion => q !== null);

  return deduplicateQuestions(validated).slice(0, count);
}

export { GeminiNotConfiguredError, GeminiRequestError, GeminiTimeoutError };
