import { describe, it, expect, vi, beforeEach } from "vitest";

const createClientMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: (...args: unknown[]) => createClientMock(...args),
}));

// Importado DESPUÉS del mock, como exige vi.mock.
const { countResourceRowsResult, countResourceRows, getCategoryContentCounts, getCategoryIdsBySlug } =
  await import("@/lib/content/queries");

interface TableResponse {
  data?: unknown;
  error?: { message: string; code?: string } | null;
  count?: number | null;
}

/**
 * Fake mínimo de un cliente de Supabase: `.from(table)` devuelve un
 * "query builder" encadenable (`.select/.eq/.in` devuelven el mismo
 * objeto) que resuelve con la respuesta configurada para esa tabla al
 * hacer `await`, igual que el cliente real de `@supabase/supabase-js`.
 */
function makeSupabase(responses: Record<string, TableResponse>) {
  return {
    from: (table: string) => {
      const response: TableResponse = responses[table] ?? { data: [], error: null };
      const builder = {
        select: () => builder,
        eq: () => builder,
        in: () => builder,
        then: (
          resolve: (value: TableResponse) => void,
          reject?: (reason: unknown) => void
        ) => Promise.resolve(response).then(resolve, reject),
      };
      return builder;
    },
  };
}

beforeEach(() => {
  createClientMock.mockReset();
});

describe("countResourceRowsResult (Fase 7, hallazgo #2)", () => {
  it("devuelve el conteo real cuando la consulta funciona", async () => {
    createClientMock.mockResolvedValue(makeSupabase({ documents: { count: 6, error: null } }));
    const result = await countResourceRowsResult("documents");
    expect(result).toEqual({ count: 6, error: null });
  });

  it("distingue 0 registros reales de una consulta fallida", async () => {
    createClientMock.mockResolvedValue(makeSupabase({ documents: { count: 0, error: null } }));
    const zeroButOk = await countResourceRowsResult("documents");
    expect(zeroButOk).toEqual({ count: 0, error: null });

    createClientMock.mockResolvedValue(
      makeSupabase({ documents: { count: null, error: { message: "RLS violation" } } })
    );
    const failed = await countResourceRowsResult("documents");
    expect(failed.error).toBe("RLS violation");
    // Nunca debe devolver 0 cuando en realidad hubo un error.
    expect(failed.count).toBeNull();
  });
});

describe("countResourceRows (compatibilidad con consumidores existentes)", () => {
  it("sigue devolviendo un número plano, 0 tanto en vacío real como en error (comportamiento previo, sin cambios)", async () => {
    createClientMock.mockResolvedValue(makeSupabase({ documents: { count: 0, error: null } }));
    expect(await countResourceRows("documents")).toBe(0);

    createClientMock.mockResolvedValue(
      makeSupabase({ documents: { count: null, error: { message: "boom" } } })
    );
    expect(await countResourceRows("documents")).toBe(0);
  });

  it("devuelve el conteo real cuando hay registros", async () => {
    createClientMock.mockResolvedValue(makeSupabase({ microorganisms: { count: 42, error: null } }));
    expect(await countResourceRows("microorganisms")).toBe(42);
  });
});

describe("getCategoryContentCounts (Fase 7, hallazgo #1)", () => {
  it("suma laboratory_tests + procedures + clinical_analyses por category_id", async () => {
    createClientMock.mockResolvedValue(
      makeSupabase({
        laboratory_tests: {
          data: [{ category_id: "catA" }, { category_id: "catA" }, { category_id: "catB" }],
          error: null,
        },
        procedures: { data: [{ category_id: "catA" }], error: null },
        clinical_analyses: { data: [], error: null },
      })
    );

    const result = await getCategoryContentCounts(["catA", "catB"]);
    expect(result).toEqual({ counts: { catA: 3, catB: 1 }, error: null });
  });

  it("ignora category_id que no pertenecen a las categorías consultadas", async () => {
    createClientMock.mockResolvedValue(
      makeSupabase({
        laboratory_tests: { data: [{ category_id: "otraCategoria" }], error: null },
        procedures: { data: [], error: null },
        clinical_analyses: { data: [], error: null },
      })
    );

    const result = await getCategoryContentCounts(["catA"]);
    expect(result.counts).toEqual({ catA: 0 });
  });

  it("si una tabla falla, reporta el error pero conserva los conteos de las tablas que sí funcionaron (nunca inventa un 0 silencioso)", async () => {
    createClientMock.mockResolvedValue(
      makeSupabase({
        laboratory_tests: { data: [{ category_id: "catA" }], error: null },
        procedures: { data: [], error: null },
        clinical_analyses: { data: null, error: { message: "timeout" } },
      })
    );

    const result = await getCategoryContentCounts(["catA"]);
    expect(result.error).toBe("timeout");
    expect(result.counts.catA).toBe(1);
  });

  it("devuelve {} sin llamar a Supabase cuando no se pasan categorías", async () => {
    const result = await getCategoryContentCounts([]);
    expect(result).toEqual({ counts: {}, error: null });
    expect(createClientMock).not.toHaveBeenCalled();
  });
});

describe("getCategoryIdsBySlug", () => {
  it("construye el mapa slug -> id", async () => {
    createClientMock.mockResolvedValue(
      makeSupabase({
        categories: {
          data: [
            { id: "id-hema", slug: "hematologia" },
            { id: "id-bio", slug: "bioquimica" },
          ],
          error: null,
        },
      })
    );

    const result = await getCategoryIdsBySlug(["hematologia", "bioquimica"]);
    expect(result).toEqual({ map: { hematologia: "id-hema", bioquimica: "id-bio" }, error: null });
  });

  it("devuelve el error sin inventar un mapa vacío silencioso", async () => {
    createClientMock.mockResolvedValue(
      makeSupabase({ categories: { data: null, error: { message: "no se pudo conectar" } } })
    );

    const result = await getCategoryIdsBySlug(["hematologia"]);
    expect(result).toEqual({ map: {}, error: "no se pudo conectar" });
  });
});
