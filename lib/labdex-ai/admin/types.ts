/**
 * Asistente LABDEX de contenido (Admin Content Assistant).
 *
 * Extiende la arquitectura de LABDEX AI existente (Fase 5: adaptador
 * Gemini, manejo de errores) para un caso de uso distinto al chat: ayudar
 * a un administrador a generar, revisar, mejorar o verificar contenido
 * científico del CMS (categorías, microorganismos, medios de cultivo,
 * pruebas, procedimientos, análisis clínicos, documentos) — nunca datos
 * clínicos de Fase 4.
 *
 * Principio no negociable en todo este módulo: la IA nunca guarda nada en
 * Supabase. Solo propone; el administrador aplica al formulario y decide
 * cuándo pulsar "Guardar" (que sigue siendo `createRecord`/`updateRecord`
 * de `lib/content/actions.ts`, sin cambios).
 */

/** Los cuatro modos pedidos. "generar" no tiene "contenido actual" propio
 * (aunque puede tener campos ya parcialmente llenos en el formulario, que
 * se usan como contexto adicional). */
export type AssistantMode = "generar" | "revisar" | "mejorar" | "comparar";

/**
 * Estado de un campo dentro de una propuesta. "propuesta" se usa en modo
 * "generar" (no hay comparación posible contra un "actual"). Los demás
 * son los pedidos explícitamente para "revisar"/"mejorar".
 */
export type FieldStatus =
  | "correcto"
  | "posible_error"
  | "revisar"
  | "falta"
  | "inconsistencia"
  | "propuesta";

export const FIELD_STATUS_LABELS: Record<FieldStatus, string> = {
  correcto: "Correcto",
  posible_error: "Posible error",
  revisar: "Revisar",
  falta: "Información faltante",
  inconsistencia: "Posible inconsistencia",
  propuesta: "Propuesta",
};

export interface FieldProposal {
  key: string;
  label: string;
  status: FieldStatus;
  /** Valor actual en el formulario en el momento de la consulta (null si el
   * campo estaba vacío). Nunca lo escribe la IA: se copia del formulario. */
  current: string | null;
  /** Valor propuesto por la IA. Puede ser igual a `current` si la IA
   * decide que el campo ya está bien (típico en "mejorar"). */
  proposed: string | null;
  /** Explicación breve de por qué se propone el cambio o por qué se marcó
   * ese estado. Se muestra siempre con lenguaje prudente. */
  explanation: string;
}

export type FindingSeverity = "alta" | "media" | "baja";

/**
 * Un hallazgo de "Comparar/Verificar" (Fase Admin Content Assistant, §6):
 * no es necesariamente un único campo con un valor incorrecto, sino una
 * posible inconsistencia entre dos o más campos, o algo que requiere
 * verificación externa (método, fabricante, laboratorio).
 */
export interface ConsistencyFinding {
  severity: FindingSeverity;
  description: string;
  fieldsInvolved: string[];
  /** Si la IA tiene una corrección puntual y segura de aplicar para UN
   * campo concreto, se ofrece aquí — opcional, no todos los hallazgos
   * tienen una solución de un solo campo. */
  suggestedField?: string;
  suggestedFieldLabel?: string;
  suggestedValue?: string;
  /** true cuando el hallazgo depende de una fuente externa (inserto,
   * método, fabricante, laboratorio) que la IA no puede verificar por sí
   * misma (Fase, §6, §11). */
  requiresExternalVerification: boolean;
}

export interface AssistantResult {
  mode: AssistantMode;
  fields: FieldProposal[];
  findings: ConsistencyFinding[];
  /** Nota general de la IA, p. ej. una advertencia de confianza baja o un
   * recordatorio de verificación. Puede venir vacía. */
  overallNote: string | null;
}

export interface DuplicateMatch {
  id: string;
  title: string;
  adminPath: string;
}

/** Payload de entrada crudo que devuelve Gemini antes de validar — nunca se
 * usa directamente, siempre pasa por `lib/labdex-ai/admin/validation.ts`. */
export interface RawFieldProposal {
  key?: unknown;
  status?: unknown;
  proposed?: unknown;
  explanation?: unknown;
}

export interface RawFinding {
  severity?: unknown;
  description?: unknown;
  fields_involved?: unknown;
  suggested_field?: unknown;
  suggested_value?: unknown;
  requires_external_verification?: unknown;
}

export interface RawAssistantResponse {
  fields?: RawFieldProposal[];
  findings?: RawFinding[];
  overall_note?: unknown;
}
