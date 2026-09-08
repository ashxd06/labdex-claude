import { listResourceRows, getResourceRowBySlug } from "@/lib/content/queries";
import { KIND_VALUE_TO_LABEL } from "@/lib/content/kindSlugs";
import { buildSourceUrl } from "@/lib/labdex-ai/context/sourceUrls";
import type { ContextSource, FicheContext, LabdexSourceType } from "@/lib/labdex-ai/types";
import type {
  Microorganism,
  CultureMedia,
  LaboratoryTest,
  Procedure,
  ClinicalAnalysis,
  LabDocument,
} from "@/lib/supabase/types";

/**
 * Context Engine de LABDEX AI (Fase 5, §4-5).
 *
 * Recuperación ESTRUCTURADA vía Supabase/PostgreSQL (ilike sobre columnas
 * relevantes), reutilizando `listResourceRows`/`getResourceRowBySlug` de
 * `lib/content/queries.ts` — exactamente las mismas consultas y RLS que ya
 * usan las páginas públicas y `app/api/search`. No se implementa búsqueda
 * vectorial en esta fase (§33): la interfaz de `retrieveContext` es la
 * misma independientemente del mecanismo interno, así que un futuro
 * `retrieveContextByEmbedding` puede sustituir o complementar esto sin
 * tocar el resto de LABDEX AI.
 *
 * IMPORTANTE (Fase 5, §13): este archivo SOLO consulta tablas de
 * conocimiento público (microorganisms, culture_media, laboratory_tests,
 * procedures, clinical_analyses, documents). Nunca importa ni referencia
 * patients/samples/lab_orders/lab_results/lab_reports.
 */

const MAX_SOURCES = 6;
const MAX_PER_TYPE = 3;
const CONTENT_SNIPPET_LIMIT = 500;

interface RetrievalSpec<T> {
  sourceType: LabdexSourceType;
  table: string;
  titleColumns: (keyof T)[];
  bodyColumns: (keyof T)[];
  titleField: keyof T;
  category?: (row: T) => string | null;
  url: (row: T) => string;
}

function truncate(text: string, limit: number): string {
  if (text.length <= limit) return text;
  return `${text.slice(0, limit).trim()}…`;
}

function buildSnippet<T extends Record<string, unknown>>(row: T, columns: (keyof T)[]): string {
  const parts = columns
    .map((col) => row[col])
    .filter((value) => typeof value === "string" && value.trim().length > 0)
    .map((value) => value as string);
  return truncate(parts.join(" — "), CONTENT_SNIPPET_LIMIT);
}

function matchesTitle<T extends Record<string, unknown>>(
  row: T,
  columns: (keyof T)[],
  query: string
): boolean {
  const q = query.toLowerCase();
  return columns.some((col) => {
    const value = row[col];
    return typeof value === "string" && value.toLowerCase().includes(q);
  });
}

async function retrieveFromTable<T extends Record<string, unknown>>(
  spec: RetrievalSpec<T>,
  query: string
): Promise<ContextSource[]> {
  const searchColumns = [...spec.titleColumns, ...spec.bodyColumns] as string[];
  const rows = await listResourceRows<T>(spec.table, {
    onlyActive: true,
    search: query,
    searchColumns,
    orderBy: "created_at",
    ascending: false,
  });

  return rows.slice(0, MAX_PER_TYPE * 2).map((row) => {
    const titleMatch = matchesTitle(row, spec.titleColumns, query);
    return {
      sourceType: spec.sourceType,
      sourceId: String(row["id"]),
      title: String(row[spec.titleField]),
      slug: String(row["slug"]),
      category: spec.category ? spec.category(row) : null,
      content: buildSnippet(row, spec.bodyColumns),
      relevance: titleMatch ? 1 : 0.6,
      url: spec.url(row),
    } satisfies ContextSource;
  });
}

/**
 * Recupera hasta `MAX_SOURCES` fragmentos de contenido oficial de LABDEX
 * relevantes para `query`, ordenados por relevancia y limitando cuántas
 * fuentes del mismo tipo se incluyen para no saturar el prompt de Gemini
 * (Fase 5, §16: "no enviar toda la base de datos").
 */
export async function retrieveContext(query: string): Promise<ContextSource[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const specs: RetrievalSpec<Record<string, unknown>>[] = [
    {
      sourceType: "microorganism",
      table: "microorganisms",
      titleColumns: ["scientific_name", "common_name"],
      bodyColumns: [
        "description",
        "classification",
        "morphology",
        "culture",
        "pathogenicity",
        "clinical_importance",
        "diagnosis",
      ],
      titleField: "scientific_name",
      category: (row) => KIND_VALUE_TO_LABEL[(row as unknown as Microorganism).kind] ?? null,
      url: (row) => {
        const m = row as unknown as Microorganism;
        return buildSourceUrl("microorganism", m.slug, { microorganismKind: m.kind });
      },
    },
    {
      sourceType: "culture_media",
      table: "culture_media",
      titleColumns: ["name"],
      bodyColumns: ["description", "purpose", "principle", "interpretation"],
      titleField: "name",
      category: (row) => (row as unknown as CultureMedia).type,
      url: (row) => buildSourceUrl("culture_media", (row as unknown as CultureMedia).slug),
    },
    {
      sourceType: "test",
      table: "laboratory_tests",
      titleColumns: ["name"],
      bodyColumns: ["description", "principle", "interpretation"],
      titleField: "name",
      category: () => "Prueba de laboratorio",
      url: (row) => buildSourceUrl("test", (row as unknown as LaboratoryTest).slug),
    },
    {
      sourceType: "procedure",
      table: "procedures",
      titleColumns: ["name"],
      bodyColumns: ["description", "objective", "interpretation"],
      titleField: "name",
      category: () => "Procedimiento",
      url: (row) => buildSourceUrl("procedure", (row as unknown as Procedure).slug),
    },
    {
      sourceType: "analysis",
      table: "clinical_analyses",
      titleColumns: ["name"],
      bodyColumns: ["description", "principle", "interpretation"],
      titleField: "name",
      category: (row) => (row as unknown as ClinicalAnalysis).sample_type,
      url: (row) => buildSourceUrl("analysis", (row as unknown as ClinicalAnalysis).slug),
    },
    {
      sourceType: "document",
      table: "documents",
      titleColumns: ["title"],
      bodyColumns: ["description"],
      titleField: "title",
      category: (row) => (row as unknown as LabDocument).category,
      url: () => buildSourceUrl("document", ""),
    },
  ];

  const results = await Promise.all(specs.map((spec) => retrieveFromTable(spec, trimmed)));
  const flat = results.flat();

  flat.sort((a, b) => b.relevance - a.relevance);

  const perTypeCount = new Map<LabdexSourceType, number>();
  const selected: ContextSource[] = [];
  for (const source of flat) {
    const count = perTypeCount.get(source.sourceType) ?? 0;
    if (count >= MAX_PER_TYPE) continue;
    selected.push(source);
    perTypeCount.set(source.sourceType, count + 1);
    if (selected.length >= MAX_SOURCES) break;
  }

  return selected;
}

/**
 * Recupera el contexto de una ficha específica (Fase 5, §10: acción
 * "Consultar LABDEX AI" en una ficha pública). Solo se pasa el
 * `sourceType`/`slug` desde el cliente; el contenido real se recupera aquí,
 * en el servidor, para no duplicar la ficha completa en el payload del
 * cliente.
 */
export async function retrieveFicheContext(fiche: FicheContext): Promise<ContextSource | null> {
  const tableByType: Record<LabdexSourceType, string> = {
    microorganism: "microorganisms",
    culture_media: "culture_media",
    test: "laboratory_tests",
    procedure: "procedures",
    analysis: "clinical_analyses",
    document: "documents",
  };

  const table = tableByType[fiche.sourceType];
  if (!table) return null;

  const row = await getResourceRowBySlug<Record<string, unknown>>(table, fiche.slug);
  if (!row || row["is_active"] !== true) return null;

  const titleField = fiche.sourceType === "microorganism" ? "scientific_name" : fiche.sourceType === "document" ? "title" : "name";
  const bodyColumns = Object.keys(row).filter(
    (key) =>
      typeof row[key] === "string" &&
      !["id", "slug", titleField, "status", "created_by", "updated_by"].includes(key)
  );

  return {
    sourceType: fiche.sourceType,
    sourceId: String(row["id"]),
    title: String(row[titleField]),
    slug: String(row["slug"]),
    category:
      fiche.sourceType === "microorganism"
        ? KIND_VALUE_TO_LABEL[(row["kind"] as Microorganism["kind"]) ?? "bacteria"] ?? null
        : null,
    content: truncate(
      bodyColumns
        .map((key) => row[key] as string)
        .filter(Boolean)
        .join(" — "),
      CONTENT_SNIPPET_LIMIT * 2
    ),
    relevance: 1,
    url: buildSourceUrl(fiche.sourceType, String(row["slug"]), {
      microorganismKind: row["kind"] as Microorganism["kind"] | undefined,
    }),
  };
}
