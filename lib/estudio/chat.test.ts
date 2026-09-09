import { describe, expect, it } from "vitest";
import { selectRelevantPages } from "@/lib/estudio/chat";
import type { MaterialPageEntry } from "@/lib/estudio/types";

const pageIndex: MaterialPageEntry[] = [
  { page: 1, text: "Introducción a la microbiología clínica y su importancia diagnóstica.", unclear: false },
  { page: 2, text: "Las bacterias Gram positivas retienen el colorante violeta durante la tinción de Gram.", unclear: false },
  { page: 3, text: "Las bacterias Gram negativas no retienen el colorante y se tiñen de rosado.", unclear: false },
  { page: 4, text: "", unclear: true },
  { page: 5, text: "El hematocrito mide el porcentaje de glóbulos rojos en la sangre total.", unclear: false },
];

describe("selectRelevantPages", () => {
  it("returns pages whose text matches words from the query, best matches first", () => {
    const result = selectRelevantPages(pageIndex, "¿Qué son las bacterias Gram positivas?");
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].page).toBe(2);
  });

  it("falls back to the first pages when the query has no matches", () => {
    const result = selectRelevantPages(pageIndex, "algo que no aparece en ningún lado");
    expect(result).toEqual(pageIndex.slice(0, 6));
  });

  it("falls back to the first pages when the query has no meaningful words", () => {
    const result = selectRelevantPages(pageIndex, "qué es");
    expect(result).toEqual(pageIndex.slice(0, 6));
  });

  it("respects the maxPages limit", () => {
    const result = selectRelevantPages(pageIndex, "bacterias Gram", 1);
    expect(result.length).toBe(1);
  });

  it("handles an empty page index without throwing", () => {
    expect(selectRelevantPages([], "cualquier pregunta")).toEqual([]);
  });
});
