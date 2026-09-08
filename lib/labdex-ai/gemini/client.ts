/**
 * Adaptador de Gemini para LABDEX AI (Fase 5, §3).
 *
 * REGLAS DE SEGURIDAD (no negociables):
 *   - `GEMINI_API_KEY` se lee EXCLUSIVAMENTE aquí, y este módulo SOLO se
 *     importa desde código de servidor (Route Handlers). El proyecto no
 *     tiene instalado el paquete `server-only`, así que la protección se
 *     mantiene, como en el resto de LABDEX, por convención de dónde se
 *     importa cada módulo (igual que `lib/supabase/server.ts`).
 *   - Nunca se expone la key al cliente, en logs, en errores ni en commits.
 *     Nunca crear `NEXT_PUBLIC_GEMINI_API_KEY`.
 *
 * Este archivo encapsula la llamada HTTP a la API REST oficial de Gemini
 * (`generativelanguage.googleapis.com`) detrás de una interfaz pequeña
 * (`GeminiAdapter`). Si en el futuro se migra al SDK oficial de Google o a
 * la Interactions API, solo se reescribe este archivo: el resto de LABDEX
 * AI (Context Engine, prompts, API route) no conoce los detalles de
 * transporte de Gemini.
 */

const DEFAULT_MODEL = "gemini-2.5-flash-lite";
const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";
const REQUEST_TIMEOUT_MS = 30_000;

export function getGeminiModel(): string {
  return process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;
}

export function isGeminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

function getApiKeyOrThrow(): string {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) {
    throw new GeminiNotConfiguredError();
  }
  return key;
}

export class GeminiNotConfiguredError extends Error {
  constructor() {
    super("GEMINI_API_KEY no está configurada.");
    this.name = "GeminiNotConfiguredError";
  }
}

export class GeminiRequestError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "GeminiRequestError";
    this.status = status;
  }
}

export class GeminiTimeoutError extends Error {
  constructor() {
    super("Gemini tardó demasiado en responder.");
    this.name = "GeminiTimeoutError";
  }
}

export interface GeminiChatTurn {
  role: "user" | "model";
  text: string;
}

export interface GenerateInput {
  systemInstruction: string;
  history: GeminiChatTurn[];
  userMessage: string;
}

export interface GeminiAdapter {
  generate(input: GenerateInput): Promise<string>;
}

interface GeminiGenerateContentResponse {
  candidates?: {
    content?: {
      parts?: { text?: string }[];
    };
    finishReason?: string;
  }[];
  promptFeedback?: {
    blockReason?: string;
  };
}

function toGeminiContents(input: GenerateInput) {
  return [
    ...input.history.map((turn) => ({
      role: turn.role,
      parts: [{ text: turn.text }],
    })),
    { role: "user" as const, parts: [{ text: input.userMessage }] },
  ];
}

/**
 * Implementación REST del adaptador. No se usa el SDK `@google/genai`
 * porque el proyecto no lo tiene instalado todavía y una llamada `fetch`
 * simple cubre lo necesario para esta fase sin añadir una dependencia
 * nueva (Fase 5, §28: evitar dependencias innecesarias).
 */
class RestGeminiAdapter implements GeminiAdapter {
  async generate(input: GenerateInput): Promise<string> {
    const apiKey = getApiKeyOrThrow();
    const model = getGeminiModel();
    const url = `${GEMINI_API_BASE}/models/${encodeURIComponent(model)}:generateContent`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: input.systemInstruction }] },
          contents: toGeminiContents(input),
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 2048,
          },
        }),
        signal: controller.signal,
      });
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new GeminiTimeoutError();
      }
      throw new GeminiRequestError("No se pudo contactar a Gemini.");
    } finally {
      clearTimeout(timeout);
    }

if (!response.ok) {
  const errorBody = await response.text();

  console.error("[labdex-ai:gemini] request failed", {
    status: response.status,
    statusText: response.statusText,
    model,
    body: errorBody.slice(0, 2000),
  });

  throw new GeminiRequestError(
    "Gemini respondió con un error.",
    response.status
  );
}
    }

    const data = (await response.json()) as GeminiGenerateContentResponse;

    if (data.promptFeedback?.blockReason) {
      throw new GeminiRequestError("La respuesta fue bloqueada por los filtros de seguridad de Gemini.");
    }

    const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
    if (!text.trim()) {
      throw new GeminiRequestError("Gemini devolvió una respuesta vacía.");
    }

    return text.trim();
  }
}

let cachedAdapter: GeminiAdapter | null = null;

export function getGeminiAdapter(): GeminiAdapter {
  if (!cachedAdapter) {
    cachedAdapter = new RestGeminiAdapter();
  }
  return cachedAdapter;
}
