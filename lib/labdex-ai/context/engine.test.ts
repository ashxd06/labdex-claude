import { describe, it, expect, vi, beforeEach } from "vitest";

const listResourceRowsMock = vi.fn();
const getResourceRowBySlugMock = vi.fn();

vi.mock("@/lib/content/queries", () => ({
  listResourceRows: (...args: unknown[]) => listResourceRowsMock(...args),
  getResourceRowBySlug: (...args: unknown[]) => getResourceRowBySlugMock(...args),
}));

// Importado DESPUÉS del mock, como exige vi.mock.
const { retrieveContext, retrieveFicheContext } = await import("@/lib/labdex-ai/context/engine");

const MICROORGANISM_ROW = {
  id: "m1",
  scientific_name: "Staphylococcus aureus",
  common_name: null,
  slug: "staphylococcus-aureus",
  kind: "bacteria",
  description: "Coco Gram positivo, catalasa positiva.",
  classification: null,
  morphology: "Cocos en racimos.",
  culture: null,
  pathogenicity: null,
  clinical_importance: null,
  diagnosis: null,
  is_active: true,
};

describe("retrieveContext", () => {
  beforeEach(() => {
    listResourceRowsMock.mockReset();
    getResourceRowBySlugMock.mockReset();
  });

  it("devuelve [] para consultas demasiado cortas sin llamar a Supabase", async () => {
    const result = await retrieveContext("a");
    expect(result).toEqual([]);
    expect(listResourceRowsMock).not.toHaveBeenCalled();
  });

  it("mapea las filas de microorganismos recuperadas a ContextSource con URL real", async () => {
    listResourceRowsMock.mockImplementation(async (table: string) =>
      table === "microorganisms" ? [MICROORGANISM_ROW] : []
    );

    const result = await retrieveContext("Staphylococcus");

    const microSource = result.find((s) => s.sourceType === "microorganism");
    expect(microSource).toBeDefined();
    expect(microSource?.sourceId).toBe("m1");
    expect(microSource?.title).toBe("Staphylococcus aureus");
    expect(microSource?.url).toBe("/contenido/microbiologia/bacterias/staphylococcus-aureus");
    expect(microSource?.relevance).toBe(1);
  });

  it("nunca consulta tablas clínicas privadas del módulo de laboratorio", async () => {
    listResourceRowsMock.mockResolvedValue([]);
    await retrieveContext("cualquier búsqueda");

    const queriedTables = listResourceRowsMock.mock.calls.map((call) => call[0]);
    const forbidden = ["patients", "samples", "lab_orders", "lab_results", "lab_reports"];
    for (const table of forbidden) {
      expect(queriedTables).not.toContain(table);
    }
  });

  it("limita a un máximo de 3 fuentes por tipo", async () => {
    const rows = Array.from({ length: 10 }, (_, i) => ({
      ...MICROORGANISM_ROW,
      id: `m${i}`,
      slug: `especie-${i}`,
      scientific_name: `Especie ${i}`,
    }));
    listResourceRowsMock.mockImplementation(async (table: string) =>
      table === "microorganisms" ? rows : []
    );

    const result = await retrieveContext("especie");
    const microorganismCount = result.filter((s) => s.sourceType === "microorganism").length;
    expect(microorganismCount).toBeLessThanOrEqual(3);
  });
});

describe("retrieveFicheContext", () => {
  beforeEach(() => {
    getResourceRowBySlugMock.mockReset();
  });

  it("devuelve null si la ficha no existe o está inactiva", async () => {
    getResourceRowBySlugMock.mockResolvedValue(null);
    const result = await retrieveFicheContext({ sourceType: "microorganism", slug: "no-existe" });
    expect(result).toBeNull();
  });

  it("construye un ContextSource con relevancia máxima para la ficha exacta", async () => {
    getResourceRowBySlugMock.mockResolvedValue(MICROORGANISM_ROW);
    const result = await retrieveFicheContext({
      sourceType: "microorganism",
      slug: "staphylococcus-aureus",
    });
    expect(result?.relevance).toBe(1);
    expect(result?.url).toBe("/contenido/microbiologia/bacterias/staphylococcus-aureus");
  });
});
