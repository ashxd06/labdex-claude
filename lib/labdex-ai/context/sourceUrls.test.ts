import { describe, it, expect } from "vitest";
import { buildSourceUrl, VALID_SOURCE_URL_PREFIXES } from "@/lib/labdex-ai/context/sourceUrls";

describe("buildSourceUrl", () => {
  it("construye la URL real de un microorganismo usando su kind", () => {
    const url = buildSourceUrl("microorganism", "staphylococcus-aureus", {
      microorganismKind: "bacteria",
    });
    expect(url).toBe("/contenido/microbiologia/bacterias/staphylococcus-aureus");
  });

  it("cae a la ruta general de microbiología si no se conoce el kind", () => {
    const url = buildSourceUrl("microorganism", "staphylococcus-aureus");
    expect(url).toBe("/contenido/microbiologia");
  });

  it("construye correctamente las rutas del resto de tipos de contenido", () => {
    expect(buildSourceUrl("culture_media", "agar-sangre")).toBe("/contenido/medios/agar-sangre");
    expect(buildSourceUrl("test", "catalasa")).toBe("/contenido/pruebas/catalasa");
    expect(buildSourceUrl("procedure", "tincion-gram")).toBe("/contenido/procedimientos/tincion-gram");
    expect(buildSourceUrl("analysis", "hemograma")).toBe("/contenido/analisis/hemograma");
  });

  it("enlaza documentos al listado (no existe página de detalle por slug)", () => {
    expect(buildSourceUrl("document", "cualquier-slug")).toBe("/contenido/documentos");
  });

  it("toda URL generada empieza por un prefijo interno válido", () => {
    const urls = [
      buildSourceUrl("microorganism", "x", { microorganismKind: "hongo" }),
      buildSourceUrl("culture_media", "x"),
      buildSourceUrl("test", "x"),
      buildSourceUrl("procedure", "x"),
      buildSourceUrl("analysis", "x"),
      buildSourceUrl("document", "x"),
    ];
    for (const url of urls) {
      expect(VALID_SOURCE_URL_PREFIXES.some((prefix) => url.startsWith(prefix))).toBe(true);
    }
  });
});
