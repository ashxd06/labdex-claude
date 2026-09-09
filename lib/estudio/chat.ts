import { buildSystemPrompt } from "@/lib/labdex-ai/prompts";
import {
  getGeminiAdapter,
  isGeminiConfigured,
  GeminiNotConfiguredError,
  GeminiRequestError,
  GeminiTimeoutError,
  type GeminiChatTurn,
} from "@/lib/labdex-ai/gemini/client";
import type { AiMessageRecord } from "@/lib/labdex-ai/types";
import type { MaterialPageEntry, StudyMaterialContent } from "@/lib/estudio/types";

/**
 * "Pregúntale a tu material" (Fase 6, §18-19, §27).
 *
 * Reutiliza el mismo adaptador de Gemini y el prompt base del modo
 * "estudio" de LABDEX AI (Fase 5) en vez de crear otro cliente o un modo
 * nuevo desde cero. La diferencia con el chat general es el contexto: en
 * vez del Context Engine público, aquí el contexto es el contenido ya
 * procesado del material del estudiante (resumen, conceptos clave y un
 * índice de páginas), nunca el PDF completo en cada pregunta (§27: evitar
 * reenviar todo el documento en cada mensaje).
 */

const MAX_HISTORY_TURNS = 8;
const MAX_MESSAGE_LENGTH = 4000;
const MAX_RELEVANT_PAGES = 6;
const MAX_CONCEPTS_IN_PROMPT = 25;

export class MaterialChatUserError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "MaterialChatUserError";
    this.status = status;
  }
}

const MATERIAL_ADDENDUM = `
Estás respondiendo dentro del Espacio de Estudio de un material específico que el estudiante subió (un PDF propio: apuntes, diapositivas, separata, etc.).

JERARQUÍA DE INFORMACIÓN QUE DEBES SEGUIR (Fase 6, §19):
1. El contenido del material del estudiante, que recibirás a continuación marcado como "CONTENIDO DEL MATERIAL". Es tu fuente principal.
2. Contexto adicional que el propio estudiante te dé en la conversación.
3. Tu conocimiento general, solo si lo anterior no alcanza.

Cuando tu respuesta se base directamente en el material, dilo explícitamente (por ejemplo "Según el material que subiste…") y, si puedes, indica la página o rango de páginas de donde proviene (usa el texto entre corchetes como [p. 12] cuando el contenido del material incluya esa página). Nunca inventes números de página.

Si la pregunta no puede responderse con el material y necesitas usar conocimiento general, dilo claramente antes de responder (por ejemplo "Esto no aparece explícitamente en tu material; te lo explico con conocimiento general…"). No presentes conocimiento general como si estuviera escrito en el material del estudiante.`;

function buildMaterialSystemPrompt(): string {
  return `${buildSystemPrompt("estudio")}\n${MATERIAL_ADDENDUM}`;
}

/**
 * Selección simple por coincidencia de palabras entre la pregunta y el
 * texto condensado de cada página (mismo espíritu que el Context Engine de
 * LABDEX AI: recuperación estructurada, no búsqueda vectorial, suficiente
 * para esta fase). Se usa para no mandar el índice de páginas completo en
 * cada pregunta cuando el material es largo.
 */
export function selectRelevantPages(
  pageIndex: MaterialPageEntry[],
  query: string,
  maxPages: number = MAX_RELEVANT_PAGES
): MaterialPageEntry[] {
  const words = query
    .toLowerCase()
    .split(/[^a-záéíóúñü0-9]+/i)
    .filter((w) => w.length >= 4);

  if (words.length === 0 || pageIndex.length === 0) {
    return pageIndex.slice(0, maxPages);
  }

  const scored = pageIndex
    .map((entry) => {
      const haystack = entry.text.toLowerCase();
      const score = words.reduce((acc, w) => (haystack.includes(w) ? acc + 1 : acc), 0);
      return { entry, score };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) {
    return pageIndex.slice(0, maxPages);
  }

  return scored.slice(0, maxPages).map((s) => s.entry);
}

function formatMaterialContext(content: StudyMaterialContent, relevantPages: MaterialPageEntry[]): string {
  const summaryText = content.summary.map((s) => `${s.heading}: ${s.content}`).join("\n");
  const conceptsText = content.keyConcepts
    .slice(0, MAX_CONCEPTS_IN_PROMPT)
    .map((c) => `- ${c.term}${c.pages ? ` (p. ${c.pages})` : ""}: ${c.definition}`)
    .join("\n");
  const pagesText = relevantPages
    .filter((p) => p.text.trim().length > 0)
    .map((p) => `[p. ${p.page}] ${p.text}`)
    .join("\n");

  return `CONTENIDO DEL MATERIAL:

Resumen:
${summaryText || "(sin resumen disponible)"}

Conceptos clave:
${conceptsText || "(sin conceptos disponibles)"}

Fragmentos de páginas relevantes para esta pregunta:
${pagesText || "(sin fragmentos de página relevantes; usa el resumen y los conceptos clave anteriores)"}`;
}

function toGeminiHistory(messages: AiMessageRecord[]): GeminiChatTurn[] {
  return messages.slice(-MAX_HISTORY_TURNS).map((m) => ({
    role: m.role === "assistant" ? ("model" as const) : ("user" as const),
    text: m.content,
  }));
}

export interface GenerateMaterialAnswerParams {
  message: string;
  history: AiMessageRecord[];
  materialTitle: string;
  materialContent: StudyMaterialContent;
}

export interface MaterialAnswer {
  content: string;
  citedPages: number[];
}

export async function generateMaterialAnswer(params: GenerateMaterialAnswerParams): Promise<MaterialAnswer> {
  const message = params.message.trim();
  if (!message) {
    throw new MaterialChatUserError("El mensaje no puede estar vacío.");
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    throw new MaterialChatUserError(`El mensaje es demasiado largo (máximo ${MAX_MESSAGE_LENGTH} caracteres).`);
  }

  if (!isGeminiConfigured()) {
    throw new GeminiNotConfiguredError();
  }

  const relevantPages = selectRelevantPages(params.materialContent.pageIndex, message);
  const context = formatMaterialContext(params.materialContent, relevantPages);
  const userTurn = `${context}\n\nPREGUNTA DEL ESTUDIANTE SOBRE "${params.materialTitle}":\n${message}`;

  let rawText: string;
  try {
    rawText = await getGeminiAdapter().generate({
      systemInstruction: buildMaterialSystemPrompt(),
      history: toGeminiHistory(params.history),
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

  const content = rawText.trim();
  if (!content) {
    throw new GeminiRequestError("Gemini devolvió una respuesta vacía.");
  }

  const citedPages = Array.from(new Set(relevantPages.map((p) => p.page))).sort((a, b) => a - b);

  return { content, citedPages };
}
