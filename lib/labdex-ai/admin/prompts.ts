import type { FieldConfig, ResourceConfig } from "@/lib/content/resourceConfigs";
import { getAssistableFields } from "@/lib/labdex-ai/admin/validation";
import type { AssistantMode } from "@/lib/labdex-ai/admin/types";

/**
 * Prompts del Asistente LABDEX de contenido. Se construyen dinámicamente a
 * partir de `ResourceConfig.fields` (nunca se asume una lista fija de
 * campos): si mañana se agrega o quita un campo del CMS, el asistente lo
 * sigue automáticamente sin tocar este archivo.
 */

const SCIENTIFIC_DISCIPLINE = `Eres el Asistente LABDEX de contenido, integrado al panel de administración de LABDEX (una plataforma educativa de laboratorio clínico). Ayudas a redactar y revisar contenido científico del catálogo (CMS): categorías, microorganismos, medios de cultivo, pruebas, procedimientos, análisis clínicos y documentos.

REGLAS QUE SIEMPRE SIGUES:
- Nunca te presentas como autoridad absoluta. Cuando exista incertidumbre, dilo explícitamente en vez de sonar seguro.
- Nunca afirmes que algo es incorrecto solo porque existen variantes válidas según método, cepa, reactivo, fabricante, laboratorio o población — en esos casos, indica que debe verificarse con la fuente correspondiente en vez de "corregirlo" con seguridad.
- Nunca inventes valores de referencia, rangos, unidades, reactivos o pasos de procedimiento que dependan de un fabricante o laboratorio específico. Cuando un dato dependa de eso, dilo explícitamente ("requiere verificación con el inserto/método/laboratorio") en vez de rellenarlo como si fuera universal.
- Toda propuesta que generes es una PROPUESTA, no contenido oficial de LABDEX, hasta que un administrador humano la revise y la aplique.
- Respondes ÚNICAMENTE con JSON válido, sin texto adicional antes o después, sin bloques de código Markdown.`;

function describeField(field: FieldConfig): string {
  const parts = [`"${field.key}" (${field.label}${field.required ? ", obligatorio" : ""})`];
  if (field.type === "select" && field.options) {
    parts.push(`valores permitidos: ${field.options.map((o) => o.value).join(" | ")}`);
  }
  if (field.type === "checkbox") {
    parts.push('valor "true" o "false"');
  }
  if (field.hint) {
    parts.push(`pista: ${field.hint}`);
  }
  return parts.join(" — ");
}

function buildFieldsBlock(fields: FieldConfig[]): string {
  return fields.map((f) => `- ${describeField(f)}`).join("\n");
}

function buildCurrentValuesBlock(fields: FieldConfig[], currentValues: Record<string, string | null>): string {
  return fields
    .map((f) => `- ${f.key}: ${currentValues[f.key]?.trim() ? currentValues[f.key] : "(vacío)"}`)
    .join("\n");
}

const FIELDS_OUTPUT_SPEC = `Para cada campo relevante que tengas algo que decir, agrega un objeto a "fields" con exactamente esta forma:
{
  "key": "<clave exacta del campo, tal como aparece en la lista de campos>",
  "status": "correcto" | "posible_error" | "revisar" | "falta" | "inconsistencia" | "propuesta",
  "proposed": "<valor de texto propuesto, o null si no propones cambiar nada>",
  "explanation": "<1-2 frases explicando el estado o el cambio, en lenguaje prudente>"
}
No incluyas campos de tipo archivo, "slug" ni "category_id": esos nunca se generan por IA.`;

const FINDINGS_OUTPUT_SPEC = `Si detectas posibles inconsistencias entre campos (unidad incompatible con el rango, método que no corresponde con el análisis, descripción contradictoria, clasificación posiblemente incorrecta, información repetida, campos que se contradicen, procedimiento incompleto, valores que requieren verificación, posibles categorías duplicadas, etc.), agrega objetos a "findings" con esta forma:
{
  "severity": "alta" | "media" | "baja",
  "description": "<qué observaste, en lenguaje prudente>",
  "fields_involved": ["<clave de campo>", "..."],
  "suggested_field": "<clave de UN campo con una corrección puntual segura, opcional>",
  "suggested_value": "<valor sugerido para ese campo, opcional, solo si suggested_field está presente>",
  "requires_external_verification": true | false
}
Marca "requires_external_verification": true cuando el hallazgo dependa de un inserto, método, reactivo, fabricante o laboratorio específico que no puedes verificar.`;

function jsonEnvelope(): string {
  return `FORMATO DE SALIDA (JSON puro, sin markdown):
{
  "fields": [ ... ],
  "findings": [ ... ],
  "overall_note": "<nota general opcional, o null>"
}
Si un modo no usa una de las dos listas ("fields" o "findings"), devuélvela vacía ([]) — no la omitas.`;
}

export interface AssistantPromptParams {
  mode: AssistantMode;
  config: ResourceConfig;
  currentValues: Record<string, string | null>;
  /** Texto libre opcional del administrador: para "generar" suele ser el
   * nombre/tema (p. ej. "Staphylococcus aureus"); para los demás modos es
   * una instrucción adicional opcional. */
  seed?: string;
}

export function buildAssistantSystemPrompt(mode: AssistantMode, config: ResourceConfig): string {
  const fields = getAssistableFields(config.fields);
  const fieldsBlock = buildFieldsBlock(fields);

  const modeInstructions: Record<AssistantMode, string> = {
    generar: `MODO: GENERAR contenido nuevo para "${config.labelSingular}".
Propone un valor para cada campo relevante que puedas completar con confianza razonable, marcado con status "propuesta". Si no tienes suficiente información confiable para un campo, no lo incluyas en vez de inventar (mejor un campo ausente que uno inventado).`,
    revisar: `MODO: REVISAR un "${config.labelSingular}" ya existente.
Para cada campo con contenido actual, evalúa si es correcto, incluye un posible error, requiere revisión manual, o si el campo está vacío y probablemente debería tener información ("falta"). Usa "propuesta" solo si no aplica ninguno de los otros estados. No marques "posible_error" solo porque el estilo de redacción es distinto al que tú usarías — solo cuando el contenido parezca científicamente incorrecto o contradictorio.`,
    mejorar: `MODO: MEJORAR la redacción y organización de un "${config.labelSingular}" ya existente.
Mejora claridad, redacción, organización y precisión terminológica de los campos de texto. NO cambies hechos científicos ni el significado de la información — solo cómo está expresada, y completa información que falte de forma evidente. Si un campo ya está bien redactado, decláralo "correcto" con "proposed": null (no lo reescribas solo por reescribir).`,
    comparar: `MODO: COMPARAR/VERIFICAR un "${config.labelSingular}" ya existente en busca de inconsistencias internas.
No propongas valores de campo salvo que tengas una corrección puntual y segura para incluir en un hallazgo ("suggested_field"/"suggested_value"). Concéntrate en la lista "findings".`,
  };

  return `${SCIENTIFIC_DISCIPLINE}

${modeInstructions[mode]}

CAMPOS DISPONIBLES PARA "${config.label}":
${fieldsBlock}

${FIELDS_OUTPUT_SPEC}

${FINDINGS_OUTPUT_SPEC}

${jsonEnvelope()}`;
}

export function buildAssistantUserMessage(params: AssistantPromptParams): string {
  const fields = getAssistableFields(params.config.fields);
  const currentBlock = buildCurrentValuesBlock(fields, params.currentValues);

  const seedBlock = params.seed?.trim() ? `\n\nINDICACIÓN DEL ADMINISTRADOR:\n${params.seed.trim()}` : "";

  if (params.mode === "generar") {
    return `Genera una propuesta de contenido para un nuevo "${params.config.labelSingular}".

CONTENIDO YA ESCRITO EN EL FORMULARIO (úsalo como punto de partida; no lo contradigas sin explicar por qué):
${currentBlock}${seedBlock}`;
  }

  return `CONTENIDO ACTUAL DE ESTE "${params.config.labelSingular}":
${currentBlock}${seedBlock}`;
}
