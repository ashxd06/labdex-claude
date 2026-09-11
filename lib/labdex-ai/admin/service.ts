import type { ResourceConfig } from "@/lib/content/resourceConfigs";
import {
  getGeminiAdapter,
  isGeminiConfigured,
  GeminiNotConfiguredError,
  GeminiRequestError,
  GeminiTimeoutError,
  type GeminiAdapter,
} from "@/lib/labdex-ai/gemini/client";
import { safeParseJson } from "@/lib/estudio/analysis/types";
import { buildAssistantSystemPrompt, buildAssistantUserMessage } from "@/lib/labdex-ai/admin/prompts";
import { getAssistableFields, validateAssistantResponse } from "@/lib/labdex-ai/admin/validation";
import type { AssistantMode, AssistantResult, RawAssistantResponse } from "@/lib/labdex-ai/admin/types";

/**
 * Orquestación del Asistente LABDEX de contenido (Admin Content
 * Assistant). Deliberadamente NO crea un cliente de IA nuevo: depende de
 * `GeminiAdapter` (la misma interfaz de Fase 5/6.1), inyectable por
 * parámetro para poder probar esta función con un adaptador falso sin red.
 * Esa es también la pieza clave para el AI Router futuro (§15): el día que
 * exista un router que pueda devolver un adaptador para un modelo médico
 * especializado (p. ej. MedGemma) en vez de Gemini, esta función no
 * cambia — solo cambia qué instancia devuelve `getGeminiAdapter()` (o de
 * dónde se obtiene el adaptador).
 *
 * Se reutiliza `safeParseJson` de `lib/estudio/analysis/types.ts` (Fase 6)
 * para el parseo tolerante de JSON, en vez de escribir un segundo parser.
 */

export class AssistantEmptyResultError extends Error {
  constructor() {
    super("La IA no devolvió ninguna propuesta válida para este contenido. Intenta regenerar.");
    this.name = "AssistantEmptyResultError";
  }
}

export interface RunAssistantParams {
  mode: AssistantMode;
  config: ResourceConfig;
  currentValues: Record<string, string | null>;
  seed?: string;
  /** Inyectable para tests; en producción siempre `getGeminiAdapter()`. */
  adapter?: GeminiAdapter;
}

export async function runContentAssistant(params: RunAssistantParams): Promise<AssistantResult> {
  if (!isGeminiConfigured() && !params.adapter) {
    throw new GeminiNotConfiguredError();
  }

  const adapter = params.adapter ?? getGeminiAdapter();
  const systemInstruction = buildAssistantSystemPrompt(params.mode, params.config);
  const userMessage = buildAssistantUserMessage({
    mode: params.mode,
    config: params.config,
    currentValues: params.currentValues,
    seed: params.seed,
  });

  let raw: string;
  try {
    raw = await adapter.generate({
      systemInstruction,
      history: [],
      userMessage,
      expectJson: true,
      maxOutputTokens: 4096,
    });
  } catch (err) {
    if (err instanceof GeminiNotConfiguredError || err instanceof GeminiRequestError || err instanceof GeminiTimeoutError) {
      throw err;
    }
    throw new GeminiRequestError("Ocurrió un error inesperado al consultar al Asistente LABDEX.");
  }

  const parsed = safeParseJson<RawAssistantResponse>(raw);
  if (!parsed) {
    throw new AssistantEmptyResultError();
  }

  const assistableFields = getAssistableFields(params.config.fields);
  const validated = validateAssistantResponse(parsed, assistableFields, params.currentValues);

  if (validated.fields.length === 0 && validated.findings.length === 0) {
    throw new AssistantEmptyResultError();
  }

  return {
    mode: params.mode,
    fields: validated.fields,
    findings: validated.findings,
    overallNote: validated.overallNote,
  };
}

export { GeminiNotConfiguredError, GeminiRequestError, GeminiTimeoutError };
