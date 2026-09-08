import { describe, it, expect } from "vitest";
import {
  sanitizeSources,
  assertNoPrivateTables,
  validateResponseText,
  redactPotentialSecrets,
} from "@/lib/labdex-ai/validation";
import type { ContextSource } from "@/lib/labdex-ai/types";

function makeSource(overrides: Partial<ContextSource> = {}): ContextSource {
  return {
    sourceType: "microorganism",
    sourceId: "id-1",
    title: "STAPHYLOCOCCUS AUREUS",
    slug: "staphylococcus-aureus",
    category: "Bacterias",
    content: "Coco Gram positivo…",
    relevance: 1,
    url: "/contenido/microbiologia/bacterias/staphylococcus-aureus",
    ...overrides,
  };
}

describe("sanitizeSources", () => {
  it("mantiene una fuente válida cuyo id fue realmente recuperado", () => {
    const source = makeSource();
    const result = sanitizeSources([source], new Set([source.sourceId]));
    expect(result).toEqual([source]);
  });

  it("rechaza una fuente cuyo id no está entre los recuperados por el Context Engine", () => {
    const source = makeSource({ sourceId: "id-inventado" });
    const result = sanitizeSources([source], new Set(["otro-id"]));
    expect(result).toEqual([]);
  });

  it("rechaza una fuente con una URL que no apunta a una ruta interna válida", () => {
    const source = makeSource({ url: "https://sitio-externo.com/algo" });
    const result = sanitizeSources([source], new Set([source.sourceId]));
    expect(result).toEqual([]);
  });

  it("descarta duplicados del mismo sourceType/sourceId", () => {
    const source = makeSource();
    const result = sanitizeSources([source, { ...source }], new Set([source.sourceId]));
    expect(result).toHaveLength(1);
  });

  it("nunca deja pasar una fuente de una tabla clínica privada", () => {
    const source = makeSource({ sourceType: "patients" as ContextSource["sourceType"] });
    const result = sanitizeSources([source], new Set([source.sourceId]));
    expect(result).toEqual([]);
  });
});

describe("assertNoPrivateTables", () => {
  it("no lanza con fuentes de conocimiento público", () => {
    expect(() => assertNoPrivateTables([makeSource()])).not.toThrow();
  });

  it("lanza si alguna fuente pertenece a una tabla clínica privada", () => {
    const source = makeSource({ sourceType: "lab_results" as ContextSource["sourceType"] });
    expect(() => assertNoPrivateTables([source])).toThrow();
  });
});

describe("validateResponseText", () => {
  it("devuelve el texto recortado cuando no está vacío", () => {
    expect(validateResponseText("  hola mundo  ")).toBe("hola mundo");
  });

  it("lanza si el texto está vacío o es solo espacios", () => {
    expect(() => validateResponseText("   ")).toThrow();
  });
});

describe("redactPotentialSecrets", () => {
  it("redacta cadenas largas que parecen tokens", () => {
    const message = "Error con la clave sk-abcdefghijklmnopqrstuvwxyz0123456789 al llamar a Gemini";
    expect(redactPotentialSecrets(message)).not.toContain("abcdefghijklmnopqrstuvwxyz0123456789");
    expect(redactPotentialSecrets(message)).toContain("[REDACTADO]");
  });

  it("no toca mensajes normales sin tokens", () => {
    expect(redactPotentialSecrets("Gemini no está disponible")).toBe("Gemini no está disponible");
  });
});
