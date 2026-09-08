import { describe, it, expect } from "vitest";
import { groupSourcesByType, toClientSources, SOURCE_TYPE_LABELS } from "@/lib/labdex-ai/citations";
import type { ContextSource } from "@/lib/labdex-ai/types";

const microorganismSource: ContextSource = {
  sourceType: "microorganism",
  sourceId: "m1",
  title: "STAPHYLOCOCCUS AUREUS",
  slug: "staphylococcus-aureus",
  category: "Bacterias",
  content: "…",
  relevance: 1,
  url: "/contenido/microbiologia/bacterias/staphylococcus-aureus",
};

const mediaSource: ContextSource = {
  sourceType: "culture_media",
  sourceId: "c1",
  title: "Agar Sangre",
  slug: "agar-sangre",
  category: null,
  content: "…",
  relevance: 0.6,
  url: "/contenido/medios/agar-sangre",
};

describe("groupSourcesByType", () => {
  it("agrupa por tipo preservando el orden de primera aparición", () => {
    const groups = groupSourcesByType([microorganismSource, mediaSource]);
    expect(groups.map((g) => g.sourceType)).toEqual(["microorganism", "culture_media"]);
    expect(groups[0].label).toBe(SOURCE_TYPE_LABELS.microorganism);
    expect(groups[0].sources).toEqual([microorganismSource]);
  });

  it("devuelve un array vacío si no hay fuentes", () => {
    expect(groupSourcesByType([])).toEqual([]);
  });
});

describe("toClientSources", () => {
  it("no expone el campo `content` (contenido interno del prompt) al cliente", () => {
    const [client] = toClientSources([microorganismSource]);
    expect(client).not.toHaveProperty("content");
    expect(client).toEqual({
      sourceType: "microorganism",
      sourceId: "m1",
      title: "STAPHYLOCOCCUS AUREUS",
      category: "Bacterias",
      url: "/contenido/microbiologia/bacterias/staphylococcus-aureus",
    });
  });
});
