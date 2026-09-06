/**
 * LABDEX AI — preparación para integrar Gemini (Fase futura).
 *
 * En esta fase NO se implementa ninguna llamada a la API de Gemini.
 * Este archivo solo documenta dónde vivirá esa lógica y cómo se debe
 * manejar la clave de API.
 *
 * REGLAS QUE SE DEBEN RESPETAR CUANDO SE IMPLEMENTE:
 *
 * 1. `GEMINI_API_KEY` se lee únicamente en el servidor (Server Actions o
 *    Route Handlers), nunca con el prefijo `NEXT_PUBLIC_`.
 * 2. El cliente (navegador) nunca recibe la clave ni llama directamente a
 *    la API de Gemini: siempre pasa por un endpoint propio de LABDEX.
 * 3. Cualquier prompt que incluya datos clínicos debe pasar antes por las
 *    mismas comprobaciones de autorización que el resto de la plataforma
 *    (rol, pertenencia del recurso, etc.).
 */

export function assertGeminiKeyConfigured(): void {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error(
      "GEMINI_API_KEY no está configurada. LABDEX AI aún no está disponible en esta fase."
    );
  }
}
