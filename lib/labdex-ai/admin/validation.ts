import type { FieldConfig } from "@/lib/content/resourceConfigs";
import type {
  ConsistencyFinding,
  FieldProposal,
  FieldStatus,
  FindingSeverity,
  RawAssistantResponse,
  RawFieldProposal,
  RawFinding,
} from "@/lib/labdex-ai/admin/types";

/**
 * Validación de todo lo que devuelve Gemini antes de que el administrador
 * lo vea como propuesta (§16: "no confiar ciegamente en JSON generado por
 * la IA"; nunca aplicar automáticamente algo inválido).
 *
 * Reglas:
 * - Solo se aceptan claves de campo que existan en el `ResourceConfig` del
 *   recurso. Cualquier clave desconocida se descarta silenciosamente (la
 *   IA a veces inventa nombres de campo parecidos).
 * - Los campos de tipo "file" nunca forman parte del esquema permitido: la
 *   IA no genera ni propone archivos.
 * - `slug` y `category_id` tampoco forman parte del esquema permitido: el
 *   slug se deriva de forma determinista (`slugify`, §20) y la categoría es
 *   una relación por id que la IA no puede inventar seleccionar de forma
 *   fiable.
 * - Para campos "select" con `options`, el valor propuesto debe coincidir
 *   exactamente con uno de los valores permitidos; si no, el campo se
 *   descarta (no se ofrece para aplicar) en vez de aplicar un valor fuera
 *   de rango.
 * - Longitudes acotadas por tipo, para evitar respuestas desproporcionadas.
 */

const MAX_TEXT_LENGTH = 400;
const MAX_TEXTAREA_LENGTH = 6000;
const MAX_EXPLANATION_LENGTH = 600;

const VALID_STATUSES: FieldStatus[] = [
  "correcto",
  "posible_error",
  "revisar",
  "falta",
  "inconsistencia",
  "propuesta",
];

const VALID_SEVERITIES: FindingSeverity[] = ["alta", "media", "baja"];

/** Claves que la IA nunca debe proponer, para cualquier recurso (§20: son
 * determinísticas o no aplicables de forma fiable por IA). */
const EXCLUDED_FIELD_KEYS = new Set(["slug", "category_id"]);

/**
 * Campos elegibles para el asistente de un recurso: todos los del
 * `ResourceConfig` salvo archivos y las claves excluidas de arriba. Se usa
 * tanto para construir el prompt (qué campos pedirle a la IA) como para
 * validar la respuesta (qué claves aceptar).
 */
export function getAssistableFields(fields: FieldConfig[]): FieldConfig[] {
  return fields.filter((f) => f.type !== "file" && !EXCLUDED_FIELD_KEYS.has(f.key));
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function maxLengthFor(field: FieldConfig): number {
  return field.type === "textarea" ? MAX_TEXTAREA_LENGTH : MAX_TEXT_LENGTH;
}

/**
 * Valida un único campo propuesto. Devuelve `null` si debe descartarse
 * (clave desconocida/excluida, estado inválido, valor fuera de las
 * opciones permitidas, explicación vacía, o demasiado largo) — nunca lanza,
 * para que un campo inválido no tumbe el resto de la propuesta.
 */
export function validateFieldProposal(
  raw: RawFieldProposal,
  assistableFields: FieldConfig[],
  currentValues: Record<string, string | null>
): FieldProposal | null {
  if (!isNonEmptyString(raw.key)) return null;
  const field = assistableFields.find((f) => f.key === raw.key);
  if (!field) return null;

  if (!VALID_STATUSES.includes(raw.status as FieldStatus)) return null;
  const status = raw.status as FieldStatus;

  if (!isNonEmptyString(raw.explanation)) return null;
  const explanation = raw.explanation.trim().slice(0, MAX_EXPLANATION_LENGTH);

  let proposed: string | null = null;
  if (raw.proposed !== null && raw.proposed !== undefined) {
    if (typeof raw.proposed !== "string") return null;
    const trimmed = raw.proposed.trim();
    if (trimmed.length > maxLengthFor(field)) return null;

    if (field.type === "select" && field.options) {
      const validValues = field.options.map((o) => o.value);
      if (trimmed && !validValues.includes(trimmed)) return null;
    }
    if (field.type === "checkbox" && trimmed && !["true", "false"].includes(trimmed.toLowerCase())) {
      return null;
    }

    proposed = trimmed || null;
  }

  const current = currentValues[field.key] ?? null;

  return { key: field.key, label: field.label, status, current, proposed, explanation };
}

export function validateFinding(raw: RawFinding, assistableFields: FieldConfig[]): ConsistencyFinding | null {
  if (!isNonEmptyString(raw.description)) return null;
  if (!VALID_SEVERITIES.includes(raw.severity as FindingSeverity)) return null;

  const knownKeys = new Set(assistableFields.map((f) => f.key));
  const fieldsInvolved = Array.isArray(raw.fields_involved)
    ? raw.fields_involved.filter((k): k is string => typeof k === "string" && knownKeys.has(k))
    : [];

  let suggestedField: string | undefined;
  let suggestedFieldLabel: string | undefined;
  let suggestedValue: string | undefined;

  if (isNonEmptyString(raw.suggested_field) && knownKeys.has(raw.suggested_field)) {
    const field = assistableFields.find((f) => f.key === raw.suggested_field);
    if (field && isNonEmptyString(raw.suggested_value)) {
      const trimmed = raw.suggested_value.trim();
      const withinLength = trimmed.length <= maxLengthFor(field);
      const validOption = field.type !== "select" || !field.options || field.options.some((o) => o.value === trimmed);
      if (withinLength && validOption) {
        suggestedField = field.key;
        suggestedFieldLabel = field.label;
        suggestedValue = trimmed;
      }
    }
  }

  return {
    severity: raw.severity as FindingSeverity,
    description: raw.description.trim().slice(0, MAX_EXPLANATION_LENGTH),
    fieldsInvolved,
    suggestedField,
    suggestedFieldLabel,
    suggestedValue,
    requiresExternalVerification: raw.requires_external_verification === true,
  };
}

export interface ValidatedAssistantResponse {
  fields: FieldProposal[];
  findings: ConsistencyFinding[];
  overallNote: string | null;
}

/**
 * Valida la respuesta completa de Gemini. Nunca lanza: los elementos
 * inválidos simplemente se excluyen. Si el resultado queda totalmente
 * vacío (ni campos ni hallazgos válidos), el llamador decide mostrar un
 * error y permitir regenerar (§16) — esta función no lo decide por sí
 * sola, solo filtra.
 */
export function validateAssistantResponse(
  raw: RawAssistantResponse,
  assistableFields: FieldConfig[],
  currentValues: Record<string, string | null>
): ValidatedAssistantResponse {
  const fields = Array.isArray(raw.fields)
    ? raw.fields
        .map((f) => validateFieldProposal(f, assistableFields, currentValues))
        .filter((f): f is FieldProposal => f !== null)
    : [];

  const findings = Array.isArray(raw.findings)
    ? raw.findings.map((f) => validateFinding(f, assistableFields)).filter((f): f is ConsistencyFinding => f !== null)
    : [];

  const overallNote = isNonEmptyString(raw.overall_note) ? raw.overall_note.trim().slice(0, 800) : null;

  return { fields, findings, overallNote };
}
