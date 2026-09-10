import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

/**
 * Configuración mínima de Vitest para las pruebas de LABDEX AI (Fase 5).
 * No se prueban componentes React (evitaríamos añadir jsdom + testing
 * library solo para esto); las pruebas se centran en la lógica pura de
 * `lib/labdex-ai/*`, que es donde vive la parte crítica (Context Engine,
 * citas, validación, prompts).
 */
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: [
      "lib/labdex-ai/**/*.test.ts",
      "lib/calculadoras/**/*.test.ts",
      "lib/estudio/**/*.test.ts",
      "lib/lab/**/*.test.ts",
    ],
  },
});
