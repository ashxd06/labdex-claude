import type { StudyMaterialContent } from "@/lib/estudio/types";

/**
 * Prompts de generación de flashcards y preguntas (Fase 6.1, §5-8, §26-27,
 * §42-44). Comparten la misma jerarquía de información que el chat del
 * material (`lib/estudio/chat.ts`): el contenido procesado del PDF es la
 * fuente principal, y nunca se rellena con conocimiento externo como si
 * viniera del documento.
 */

// Límite de caracteres del índice de páginas incluido en el prompt, para no
// reenviar documentos muy largos en cada generación (Fase 6.1, §7, §36).
// Es generoso porque el índice ya es texto condensado por página (no el PDF
// original), pero sigue acotado para documentos muy extensos.
const MAX_PAGE_INDEX_CHARS = 18000;
const MAX_CONCEPTS_IN_PROMPT = 60;

const GROUNDING_RULES = `REGLAS DE FUNDAMENTACIÓN (obligatorias):
- Tu única fuente es el contenido entregado a continuación, marcado como "CONTENIDO DEL MATERIAL". No uses conocimiento externo para inventar hechos, enfermedades, cifras o ejemplos que no estén en ese contenido.
- Si el contenido no alcanza para generar la cantidad solicitada de tarjetas o preguntas con calidad y sin inventar nada, genera menos. Nunca rellenes con información inventada solo para completar una cantidad.
- Usa terminología científica correcta y consistente con el material.
- Evita preguntas ambiguas o que dependan de una interpretación subjetiva.
- Responde ÚNICAMENTE con JSON válido, sin texto adicional antes o después, sin bloques de código Markdown.`;

function truncatePageIndexText(content: StudyMaterialContent): { text: string; truncated: boolean } {
  const pagesText = content.pageIndex
    .filter((p) => p.text.trim().length > 0)
    .map((p) => `[p. ${p.page}] ${p.text}`)
    .join("\n");

  if (pagesText.length <= MAX_PAGE_INDEX_CHARS) {
    return { text: pagesText, truncated: false };
  }
  return { text: `${pagesText.slice(0, MAX_PAGE_INDEX_CHARS)}\n[...contenido adicional omitido por longitud...]`, truncated: true };
}

/**
 * Arma el bloque "CONTENIDO DEL MATERIAL" reutilizado por ambos prompts de
 * generación. Se apoya en el mismo contenido estructurado que ya alimenta
 * el Espacio de Estudio y el chat (resumen, conceptos clave, índice de
 * páginas), en vez de volver a enviar el PDF (Fase 6.1, §7).
 */
export function buildMaterialContentBlock(content: StudyMaterialContent): string {
  const summaryText = content.summary.map((s) => `${s.heading}: ${s.content}`).join("\n") || "(sin resumen disponible)";
  const conceptsText =
    content.keyConcepts
      .slice(0, MAX_CONCEPTS_IN_PROMPT)
      .map((c) => `- ${c.term}${c.pages ? ` (p. ${c.pages})` : ""}: ${c.definition}`)
      .join("\n") || "(sin conceptos clave disponibles)";
  const mustRememberText =
    content.mustRemember.map((m) => `- ${m.text}${m.pages ? ` (p. ${m.pages})` : ""}`).join("\n") ||
    "(sin puntos destacados disponibles)";
  const { text: pagesText, truncated } = truncatePageIndexText(content);

  return `CONTENIDO DEL MATERIAL:

Resumen:
${summaryText}

Conceptos clave:
${conceptsText}

Lo que debes recordar:
${mustRememberText}

Texto por página (usa el número de página entre corchetes, p. ej. "[p. 12]", para poblar el campo "source_pages"; nunca inventes un número de página que no aparezca aquí):
${pagesText || "(sin texto por página disponible; basa las tarjetas/preguntas en el resumen y los conceptos clave anteriores, y deja source_pages en null)"}${
    truncated
      ? "\n\n(Nota: el material es extenso; se muestra solo una parte del texto por página. Genera igualmente la mejor cantidad de tarjetas/preguntas posible con lo disponible.)"
      : ""
  }`;
}

export function buildFlashcardSystemPrompt(): string {
  return `Eres el generador de flashcards de LABDEX AI, para el módulo de Práctica del Hub de Estudio (Fase 6.1).

Tu tarea es crear flashcards de pregunta/respuesta a partir del material de estudio de un alumno.

CALIDAD DE LAS TARJETAS (Fase 6.1, §5):
- Cada tarjeta debe tener una sola idea principal.
- Preguntas claras, no excesivamente largas ni compuestas por varias preguntas a la vez.
- Respuestas concisas pero completas: lo suficiente para repasar el concepto sin ser un párrafo entero.

${GROUNDING_RULES}

FORMATO DE SALIDA (JSON puro, sin markdown):
{
  "flashcards": [
    { "question": "...", "answer": "...", "source_pages": "12" }
  ]
}

"source_pages" debe ser un string ("12" o "12-14") tomado de los números de página del contenido entregado, o null si no aplica. No incluyas ningún otro campo.`;
}

export function buildFlashcardUserMessage(params: {
  materialTitle: string;
  content: StudyMaterialContent;
  count: number;
}): string {
  return `${buildMaterialContentBlock(params.content)}

MATERIAL: "${params.materialTitle}"

Genera hasta ${params.count} flashcards de pregunta/respuesta basadas exclusivamente en el contenido anterior. Si el material no tiene suficientes ideas distintas y bien fundamentadas para esa cantidad, genera menos (no inventes para completar).`;
}

export function buildQuestionSystemPrompt(): string {
  return `Eres el generador de preguntas de práctica de LABDEX AI, para el módulo de Práctica del Hub de Estudio (Fase 6.1).

Tu tarea es crear preguntas de opción múltiple (4 alternativas, una sola correcta) a partir del material de estudio de un alumno.

CALIDAD DE LAS PREGUNTAS Y OPCIONES (Fase 6.1, §10-12, §44):
- Exactamente 4 opciones por pregunta.
- Una única respuesta correcta, inequívoca según el contenido entregado.
- Las opciones incorrectas deben ser plausibles (relacionadas con el tema) pero claramente incorrectas según el material — nunca absurdas ni obviamente descartables.
- La explicación debe enseñar por qué la respuesta correcta lo es (y, cuando ayude, por qué las demás no), no limitarse a repetir "porque es correcta".
- Asigna "difficulty" ("easy", "normal" o "hard") según qué tan directa o elaborada sea la pregunta respecto al material; si no estás seguro, usa "normal".

${GROUNDING_RULES}

FORMATO DE SALIDA (JSON puro, sin markdown):
{
  "questions": [
    {
      "question": "...",
      "options": ["...", "...", "...", "..."],
      "correct_answer": 0,
      "explanation": "...",
      "source_pages": "12-13",
      "difficulty": "normal"
    }
  ]
}

"correct_answer" es el índice (0 a 3) de la opción correcta dentro de "options". "source_pages" debe ser un string tomado de los números de página del contenido entregado, o null si no aplica. No incluyas ningún otro campo.`;
}

export function buildQuestionUserMessage(params: {
  materialTitle: string;
  content: StudyMaterialContent;
  count: number;
  existingQuestions?: string[];
}): string {
  const avoidBlock =
    params.existingQuestions && params.existingQuestions.length > 0
      ? `\n\nYa existen estas preguntas para este material; evita duplicarlas o generar variantes casi idénticas:\n${params.existingQuestions
          .map((q) => `- ${q}`)
          .join("\n")}`
      : "";

  return `${buildMaterialContentBlock(params.content)}

MATERIAL: "${params.materialTitle}"

Genera hasta ${params.count} preguntas de opción múltiple basadas exclusivamente en el contenido anterior. Si el material no tiene suficiente información sustentada para esa cantidad con la calidad requerida, genera menos (no inventes para completar).${avoidBlock}`;
}
