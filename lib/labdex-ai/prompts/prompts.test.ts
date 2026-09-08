import { describe, it, expect } from "vitest";
import { buildSystemPrompt, buildUserTurn, getGeneralKnowledgeDisclaimer } from "@/lib/labdex-ai/prompts";
import { AI_MODES } from "@/lib/labdex-ai/types";
import type { ContextSource } from "@/lib/labdex-ai/types";

describe("buildSystemPrompt", () => {
  it("genera un prompt distinto y no vacío para cada uno de los 4 modos", () => {
    const prompts = AI_MODES.map((mode) => buildSystemPrompt(mode));
    for (const prompt of prompts) {
      expect(prompt.trim().length).toBeGreaterThan(0);
    }
    // Ningún modo debería producir exactamente el mismo prompt que otro.
    expect(new Set(prompts).size).toBe(AI_MODES.length);
  });

  it("todos los modos incluyen las reglas base de no inventar información", () => {
    for (const mode of AI_MODES) {
      const prompt = buildSystemPrompt(mode);
      expect(prompt).toMatch(/inventes/i);
      expect(prompt).toMatch(/español/i);
    }
  });

  it("el modo microbiología incluye la estructura de secciones esperada", () => {
    expect(buildSystemPrompt("microbiologia")).toMatch(/Patogenicidad/);
  });

  it("el modo laboratorio incluye la estructura de secciones esperada", () => {
    expect(buildSystemPrompt("laboratorio")).toMatch(/Valores de referencia/);
  });

  it("el modo estudio menciona el método socrático", () => {
    expect(buildSystemPrompt("estudio")).toMatch(/socrático/i);
  });
});

describe("buildUserTurn", () => {
  it("indica claramente cuando no hay fuentes oficiales de LABDEX", () => {
    const turn = buildUserTurn("¿Qué es la catalasa?", []);
    expect(turn).toMatch(/no se encontró contenido oficial/i);
    expect(turn).toContain("¿Qué es la catalasa?");
  });

  it("incluye las fuentes recuperadas cuando existen", () => {
    const source: ContextSource = {
      sourceType: "test",
      sourceId: "t1",
      title: "Catalasa",
      slug: "catalasa",
      category: "Prueba de laboratorio",
      content: "Detecta la enzima catalasa.",
      relevance: 1,
      url: "/contenido/pruebas/catalasa",
    };
    const turn = buildUserTurn("¿Qué es la catalasa?", [source]);
    expect(turn).toContain("Catalasa");
    expect(turn).toContain("Detecta la enzima catalasa.");
  });
});

describe("getGeneralKnowledgeDisclaimer", () => {
  it("devuelve el texto exacto del aviso (Fase 5, §6)", () => {
    expect(getGeneralKnowledgeDisclaimer()).toBe(
      "Información general generada por IA. No corresponde necesariamente a contenido oficial de LABDEX."
    );
  });
});
