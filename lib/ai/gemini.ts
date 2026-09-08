/**
 * LABDEX AI — este archivo era un placeholder de la fase de preparación.
 *
 * La integración real con Gemini ahora vive en `lib/labdex-ai/` (Fase 5):
 *   - `lib/labdex-ai/gemini/client.ts`   → adaptador de Gemini
 *   - `lib/labdex-ai/context/engine.ts`  → Context Engine
 *   - `lib/labdex-ai/service.ts`         → orquestación completa
 *
 * Se conserva este archivo (en vez de borrarlo) por si algún código externo
 * al repositorio todavía lo importa, pero no debe usarse en código nuevo.
 *
 * @deprecated usa `lib/labdex-ai` en su lugar.
 */
export { isGeminiConfigured } from "@/lib/labdex-ai/gemini/client";
