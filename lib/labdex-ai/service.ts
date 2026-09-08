import { retrieveContext, retrieveFicheContext } from "@/lib/labdex-ai/context/engine";
import { buildSystemPrompt, buildUserTurn } from "@/lib/labdex-ai/prompts";
import {
  getGeminiAdapter,
  isGeminiConfigured,
  GeminiNotConfiguredError,
  GeminiRequestError,
  GeminiTimeoutError,
  type GeminiChatTurn,
} from "@/lib/labdex-ai/gemini/client";
import { sanitizeSources, validateResponseText } from "@/lib/labdex-ai/validation";
import type { AiMessageRecord, AiMode, ContextSource, FicheContext, LabdexAiAnswer } from "@/lib/labdex-ai/types";

const MAX_HISTORY_TURNS = 8;
const MAX_MESSAGE_LENGTH = 4000;

export class LabdexAiUserError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "LabdexAiUserError";
    this.status = status;
  }
}

/** Convierte los últimos mensajes persistidos en turnos para Gemini. */
function toGeminiHistory(messages: AiMessageRecord[]): GeminiChatTurn[] {
  return messages.slice(-MAX_HISTORY_TURNS).map((m) => ({
    role: m.role === "assistant" ? ("model" as const) : ("user" as const),
    text: m.content,
  }));
}

export interface GenerateAnswerParams {
  mode: AiMode;
  message: string;
  history: AiMessageRecord[];
  ficheContext?: FicheContext | null;
}

/**
 * Orquesta una respuesta de LABDEX AI: valida la entrada, recupera
 * contexto (Context Engine + ficha si corresponde), construye el prompt,
 * llama a Gemini y valida el resultado. No toca Supabase para persistir
 * nada: eso lo hace la API route, que es quien conoce al usuario
 * autenticado y el `conversationId`.
 *
 * Se mantiene como una función pura (sin `NextRequest`/`NextResponse`) para
 * poder probarla directamente en tests unitarios (Fase 5, §30).
 */
export async function generateLabdexAiAnswer(params: GenerateAnswerParams): Promise<LabdexAiAnswer> {
  const message = params.message.trim();
  if (!message) {
    throw new LabdexAiUserError("El mensaje no puede estar vacío.");
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    throw new LabdexAiUserError(`El mensaje es demasiado largo (máximo ${MAX_MESSAGE_LENGTH} caracteres).`);
  }

  if (!isGeminiConfigured()) {
    throw new GeminiNotConfiguredError();
  }

  const [searchSources, ficheSource] = await Promise.all([
    retrieveContext(message),
    params.ficheContext ? retrieveFicheContext(params.ficheContext) : Promise.resolve(null),
  ]);

  const combined: ContextSource[] = ficheSource
    ? [ficheSource, ...searchSources.filter((s) => s.sourceId !== ficheSource.sourceId)]
    : searchSources;

  const allowedIds = new Set(combined.map((s) => s.sourceId));
  const sources = sanitizeSources(combined, allowedIds);

  const systemInstruction = buildSystemPrompt(params.mode);
  const userTurn = buildUserTurn(message, sources);
  const history = toGeminiHistory(params.history);

  let rawText: string;
  try {
    rawText = await getGeminiAdapter().generate({
      systemInstruction,
      history,
      userMessage: userTurn,
    });
  } catch (err) {
    if (
      err instanceof GeminiNotConfiguredError ||
      err instanceof GeminiRequestError ||
      err instanceof GeminiTimeoutError
    ) {
      throw err;
    }
    throw new GeminiRequestError("Ocurrió un error inesperado al generar la respuesta.");
  }

  const content = validateResponseText(rawText);

  return {
    content,
    sources,
    usedGeneralKnowledge: sources.length === 0,
  };
}
