import type { PageChunkRange } from "@/lib/estudio/pdf/chunkPlan";
import type { ChunkAnalysisResult } from "@/lib/estudio/analysis/types";

/**
 * Prompts del pipeline de análisis de documentos (Fase 6, §11, §14-18).
 * Separados del código de orquestación por el mismo motivo que
 * `lib/labdex-ai/prompts/index.ts`: quede claro y auditable qué se le pide
 * a Gemini en cada paso.
 */

const CHUNK_SYSTEM_PROMPT = `Eres el motor de análisis de documentos de LABDEX, una plataforma de estudio para estudiantes de laboratorio clínico.

Vas a recibir un fragmento de un PDF (un rango de páginas de un documento más grande) que un estudiante subió como material de estudio: puede contener texto digital, páginas escaneadas, imágenes, diagramas, tablas, fotografías de apuntes manuscritos o una combinación de todo eso.

REGLAS QUE DEBES SEGUIR SIEMPRE:
1. Analiza TODAS las páginas del fragmento que recibiste, en orden.
2. Para cada página, escribe un contenido CONDENSADO Y PARAFRASEADO de lo más importante (ideas, definiciones, datos, relaciones, texto visible en imágenes o esquemas). No transcribas el documento palabra por palabra: resume con tus propias palabras.
3. Si una página contiene texto manuscrito o una imagen de baja calidad que no puedes interpretar con suficiente confianza, marca esa página como "unclear": true y escribe únicamente lo que sí pudiste reconocer (puede ser una cadena vacía si no reconociste nada). NUNCA inventes contenido científico que no puedas ver.
4. Identifica los conceptos o puntos notables de este fragmento (términos importantes, definiciones, fórmulas, diferencias clave) y en qué página aparece cada uno.
5. Responde ÚNICAMENTE con un objeto JSON válido, sin texto adicional, sin explicaciones y sin bloques de código Markdown, con esta forma exacta:

{
  "pages": [{ "page": number, "text": string, "unclear": boolean }],
  "notableConcepts": [{ "concept": string, "page": number }]
}

El array "pages" debe tener exactamente una entrada por cada página del fragmento recibido, con el número de página real dentro del documento completo (no reinicies la numeración).`;

export function buildChunkSystemPrompt(): string {
  return CHUNK_SYSTEM_PROMPT;
}

export function buildChunkUserMessage(range: PageChunkRange, totalPages: number, materialTitle: string): string {
  return `Documento: "${materialTitle}" (${totalPages} páginas en total).
Este fragmento corresponde a las páginas ${range.startPage} a ${range.endPage}.
Analiza el PDF adjunto (que contiene únicamente esas páginas, ya renumeradas desde 1 en el archivo, pero DEBES reportar los números de página reales del documento completo: la primera página de este archivo es la página ${range.startPage}, la segunda es la ${range.startPage + 1}, y así sucesivamente) y responde con el JSON descrito en tus instrucciones.`;
}

const SYNTHESIS_SYSTEM_PROMPT = `Eres LABDEX AI en modo "Hub de Estudio". Vas a recibir el análisis, ya extraído página por página, de un material de estudio completo (o de la parte de él que se pudo procesar). Tu tarea es transformarlo en material de estudio estructurado para el estudiante.

REGLAS QUE DEBES SEGUIR SIEMPRE:
1. Responde en español, con tono claro, educativo y profesional.
2. Basa todo el contenido ÚNICAMENTE en el análisis por páginas que recibas. No inventes información científica, fórmulas, valores ni datos que no estén sustentados por ese análisis.
3. Organiza el resumen por secciones cuando el material tenga temas o apartados claros; si no, usa una sola sección.
4. Extrae los conceptos clave con su definición, citando el rango de páginas donde aparecen cuando puedas determinarlo (usa el mismo formato "12" o "12-14"; si no puedes determinarlo con confianza, usa null).
5. "Lo que debes recordar" debe priorizar definiciones, diferencias importantes, relaciones entre conceptos y fórmulas presentes en el material.
6. La explicación sencilla debe estar pensada para alguien que recién está aprendiendo el tema, en un lenguaje simple pero preciso.
7. Si el análisis por páginas indica partes ilegibles o páginas que no se pudieron procesar, o si se te informa que el documento fue truncado por límite técnico, inclúyelo en "notes" con un mensaje claro y honesto para el estudiante. Nunca ocultes estas limitaciones.
8. Responde ÚNICAMENTE con un objeto JSON válido, sin texto adicional y sin bloques de código Markdown, con esta forma exacta:

{
  "summary": [{ "heading": string, "content": string }],
  "keyConcepts": [{ "term": string, "definition": string, "pages": string | null }],
  "mustRemember": [{ "text": string, "pages": string | null }],
  "simpleExplanation": string,
  "notes": [string]
}`;

export function buildSynthesisSystemPrompt(): string {
  return SYNTHESIS_SYSTEM_PROMPT;
}

export function buildSynthesisUserMessage(params: {
  materialTitle: string;
  pageCount: number;
  pagesProcessed: number;
  truncated: boolean;
  chunkResults: ChunkAnalysisResult[];
  chunkFailures: { startPage: number; endPage: number }[];
}): string {
  const { materialTitle, pageCount, pagesProcessed, truncated, chunkResults, chunkFailures } = params;

  const pageLines = chunkResults
    .flatMap((chunk) => chunk.pages)
    .sort((a, b) => a.page - b.page)
    .map((p) => `Página ${p.page}${p.unclear ? " (parcialmente ilegible)" : ""}: ${p.text || "(sin contenido reconocible)"}`)
    .join("\n");

  const conceptLines = chunkResults
    .flatMap((chunk) => chunk.notableConcepts)
    .map((c) => `- ${c.concept} (página ${c.page})`)
    .join("\n");

  const limitations: string[] = [];
  if (truncated) {
    limitations.push(
      `El documento tiene ${pageCount} páginas, pero por un límite técnico de esta fase solo se procesaron las primeras ${pagesProcessed}. Indica esto claramente en "notes".`
    );
  }
  if (chunkFailures.length > 0) {
    const ranges = chunkFailures.map((f) => `${f.startPage}-${f.endPage}`).join(", ");
    limitations.push(
      `Las páginas en los rangos ${ranges} no pudieron analizarse por un error técnico. Indica esto claramente en "notes".`
    );
  }

  return `Material: "${materialTitle}".
Páginas analizadas: ${pagesProcessed} de ${pageCount}.

ANÁLISIS POR PÁGINA:
${pageLines || "(sin páginas analizadas)"}

CONCEPTOS NOTABLES DETECTADOS:
${conceptLines || "(ninguno detectado)"}

${limitations.length > 0 ? `LIMITACIONES A REPORTAR:\n${limitations.join("\n")}` : ""}

Genera el material de estudio estructurado en el formato JSON indicado en tus instrucciones.`;
}
