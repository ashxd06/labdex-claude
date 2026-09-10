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

const DEFAULT_MODEL = "gemini-3.5-flash-lite";
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
  /** Si es true, pide a Gemini que la respuesta sea JSON puro (usa
   * responseMimeType: application/json). Usado por la generación de
   * flashcards/preguntas de Fase 6.1; el chat conversacional (Fase 5, 6.0)
   * nunca pasa esto y sigue recibiendo texto libre en Markdown, exactamente
   * como antes. */
  expectJson?: boolean;
  /** Límite de tokens de salida; por defecto 2048 (el mismo valor que usaba
   * `generate()` antes de añadir este campo), para no cambiar el
   * comportamiento del chat existente. */
  maxOutputTokens?: number;
}

/**
 * Entrada multimodal para el pipeline de documentos de Fase 6 (Hub de
 * Estudio). Es un tipo aparte de `GenerateInput` (que solo admite texto)
 * para no tocar el contrato usado por LABDEX AI (Fase 5) y sus tests: el
 * chat general de LABDEX AI sigue llamando a `generate()` exactamente
 * igual que antes.
 */
export interface GeminiFilePart {
  /** Tipo MIME del archivo, p. ej. "application/pdf". */
  mimeType: string;
  /** Contenido en base64 (sin el prefijo "data:...;base64,"). */
  data: string;
}

export interface GenerateWithFileInput {
  systemInstruction: string;
  /** Instrucción/pregunta que acompaña al archivo. */
  userMessage: string;
  file: GeminiFilePart;
  /** Si es true, se pide a Gemini que la respuesta sea JSON puro (usa
   * responseMimeType: application/json en la config de generación). */
  expectJson?: boolean;
  /** Límite de tokens de salida; por defecto se usa uno mayor que el del
   * chat conversacional porque el análisis de documentos produce
   * respuestas estructuradas más largas. */
  maxOutputTokens?: number;
}

export interface GeminiAdapter {
  generate(input: GenerateInput): Promise<string>;
  /** Analiza un archivo (p. ej. una porción de un PDF) enviándolo como
   * contenido inline a Gemini, que interpreta nativamente texto digital,
   * páginas escaneadas, imágenes, tablas y esquemas dentro del documento
   * (Fase 6, §7-10) sin necesitar un motor de OCR separado. */
  generateWithFile(input: GenerateWithFileInput): Promise<string>;
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
interface RawGenerateContentRequest {
  systemInstruction: string;
  contents: unknown[];
  generationConfig: Record<string, unknown>;
}

/** Llamada HTTP compartida a `generateContent`, usada tanto por el chat de
 * texto (`generate`) como por el análisis de documentos (`generateWithFile`).
 * Centralizar esto evita duplicar el manejo de timeout/errores/logging. */
async function callGenerateContent(request: RawGenerateContentRequest): Promise<string> {
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
        systemInstruction: {
          parts: [{ text: request.systemInstruction }],
        },
        contents: request.contents,
        generationConfig: request.generationConfig,
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
    // Se lee el cuerpo de error de Gemini para poder diagnosticar 400/401/
    // 403/404/429/5xx en los logs de Vercel, pero nunca se reenvía al
    // cliente (podría incluir detalles internos) ni se registra la API key.
    const errorBody = await response.text().catch(() => "");

    console.error("[labdex-ai:gemini] request failed", {
      status: response.status,
      statusText: response.statusText,
      model,
      body: errorBody.slice(0, 2000),
    });

    throw new GeminiRequestError("Gemini respondió con un error.", response.status);
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

class RestGeminiAdapter implements GeminiAdapter {
  async generate(input: GenerateInput): Promise<string> {
    return callGenerateContent({
      systemInstruction: input.systemInstruction,
      contents: toGeminiContents(input),
      generationConfig: {
        temperature: input.expectJson ? 0.2 : 0.4,
        maxOutputTokens: input.maxOutputTokens ?? 2048,
        ...(input.expectJson ? { responseMimeType: "application/json" } : {}),
      },
    });
  }

  async generateWithFile(input: GenerateWithFileInput): Promise<string> {
    return callGenerateContent({
      systemInstruction: input.systemInstruction,
      contents: [
        {
          role: "user" as const,
          parts: [
            { inlineData: { mimeType: input.file.mimeType, data: input.file.data } },
            { text: input.userMessage },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: input.maxOutputTokens ?? 8192,
        ...(input.expectJson ? { responseMimeType: "application/json" } : {}),
      },
    });
  }
}

let cachedAdapter: GeminiAdapter | null = null;

export function getGeminiAdapter(): GeminiAdapter {
  if (!cachedAdapter) {
    cachedAdapter = new RestGeminiAdapter();
  }
  return cachedAdapter;
}
