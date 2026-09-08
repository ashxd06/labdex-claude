/**
 * Tipos compartidos de LABDEX AI (Fase 5).
 *
 * Estos tipos son usados por el Context Engine, el adaptador de Gemini, la
 * capa de citas/validación y la API route. Mantenerlos en un solo archivo
 * evita duplicar formas de datos entre esas capas (mismo principio que
 * `lib/content/resourceConfigs.ts` para el contenido).
 */

/** Tablas de contenido oficial de LABDEX que el Context Engine puede citar. */
export type LabdexSourceType =
  | "microorganism"
  | "culture_media"
  | "test"
  | "procedure"
  | "analysis"
  | "document";

/**
 * Un fragmento de contenido oficial de LABDEX recuperado por el Context
 * Engine. Nunca se construye a partir de texto generado por Gemini: siempre
 * proviene directamente de una fila real de Supabase.
 */
export interface ContextSource {
  sourceType: LabdexSourceType;
  sourceId: string;
  title: string;
  slug: string;
  category: string | null;
  content: string;
  relevance: number;
  url: string;
}

/** Modos de LABDEX AI (Fase 5, §9). */
export type AiMode = "general" | "estudio" | "microbiologia" | "laboratorio";

export const AI_MODES: AiMode[] = ["general", "estudio", "microbiologia", "laboratorio"];

export function isAiMode(value: unknown): value is AiMode {
  return typeof value === "string" && (AI_MODES as string[]).includes(value);
}

/** Rol de un mensaje persistido en `ai_messages`. */
export type AiMessageRole = "user" | "assistant";

export interface AiMessageRecord {
  id: string;
  conversation_id: string;
  role: AiMessageRole;
  content: string;
  sources: ContextSource[];
  used_general_knowledge: boolean;
  created_at: string;
}

export interface AiConversationRecord {
  id: string;
  user_id: string;
  title: string;
  mode: AiMode;
  created_at: string;
  updated_at: string;
}

/** Referencia opcional a una ficha de LABDEX desde la que se abrió el chat. */
export interface FicheContext {
  sourceType: LabdexSourceType;
  slug: string;
}

/** Cuerpo esperado por POST /api/labdex-ai/chat. */
export interface ChatRequestBody {
  conversationId?: string | null;
  mode: AiMode;
  message: string;
  ficheContext?: FicheContext | null;
}

/** Resultado de generar una respuesta de LABDEX AI (antes de persistir). */
export interface LabdexAiAnswer {
  content: string;
  sources: ContextSource[];
  usedGeneralKnowledge: boolean;
}
