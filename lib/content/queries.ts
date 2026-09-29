import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient as createTypedClient } from "@/lib/supabase/server";
import { getResourceConfig, RESOURCE_CONFIGS } from "@/lib/content/resourceConfigs";

/**
 * Las tablas de contenido (Fase 2) no están en el tipo genérico `Database`
 * de `lib/supabase/types.ts` a propósito (ver comentario en ese archivo).
 * Por eso aquí se usa un cliente sin ese genérico y se tipa el resultado
 * manualmente en cada función con las interfaces de `types.ts`. El cliente
 * en sí (cookies, sesión, RLS) es exactamente el mismo que en el resto de
 * la app.
 */
async function createClient(): Promise<SupabaseClient> {
  return (await createTypedClient()) as unknown as SupabaseClient;
}

export interface ListParams {
  search?: string;
  searchColumns?: string[];
  onlyActive?: boolean;
  categoryId?: string;
  kind?: string;
  status?: string;
  orderBy?: string;
  ascending?: boolean;
  page?: number;
  pageSize?: number;
}

export interface PagedResult<T> {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export async function listResourceRows<T>(
  table: string,
  {
    search,
    searchColumns = [],
    onlyActive,
    categoryId,
    kind,
    status,
    orderBy = "created_at",
    ascending = false,
  }: ListParams = {}
): Promise<T[]> {
  const supabase = await createClient();
  let query = supabase.from(table).select("*");

  if (onlyActive) {
    query = query.eq("is_active", true).eq("status", "published");
  }
  if (categoryId) {
    query = query.eq("category_id", categoryId);
  }
  if (kind) {
    query = query.eq("kind", kind);
  }
  if (status === "review") {
    const { data: draftRows, error: draftError } = await supabase.from("content_drafts")
      .select("record_id").eq("resource_key", table);
    if (draftError) {
      console.error(`[listResourceRows:review:${table}]`, draftError.message);
      return [];
    }
    const ids = (draftRows ?? []).map((row: { record_id: string }) => row.record_id);
    if (ids.length === 0) return [];
    query = query.in("id", ids);
  } else if (status) {
    query = query.eq("status", status);
  }
  if (search && searchColumns.length > 0) {
    const orFilter = searchColumns.map((col) => `${col}.ilike.%${search}%`).join(",");
    query = query.or(orFilter);
  }

  query = query.order(orderBy, { ascending });

  const { data, error } = await query;
  if (error) {
    console.error(`[listResourceRows:${table}]`, error.message);
    return [];
  }
  return (data ?? []).map((row) => status === "review"
    ? { ...row, _review_pending: true }
    : row) as T[];
}

/**
 * Igual que `listResourceRows`, pero aplica paginación real (LIMIT/OFFSET vía
 * `.range`) y devuelve el total de coincidencias para construir los
 * controles de paginación. Se usa en las páginas públicas de listado para
 * no cargar cientos de registros de una vez.
 */
export async function listResourceRowsPaged<T>(
  table: string,
  {
    search,
    searchColumns = [],
    onlyActive,
    categoryId,
    kind,
    status,
    orderBy = "created_at",
    ascending = false,
    page = 1,
    pageSize = 12,
  }: ListParams = {}
): Promise<PagedResult<T>> {
  const supabase = await createClient();
  const safePage = Math.max(1, page);
  const from = (safePage - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase.from(table).select("*", { count: "exact" });

  if (onlyActive) query = query.eq("is_active", true).eq("status", "published");
  if (categoryId) query = query.eq("category_id", categoryId);
  if (kind) query = query.eq("kind", kind);
  if (status) query = query.eq("status", status);
  if (search && searchColumns.length > 0) {
    const orFilter = searchColumns.map((col) => `${col}.ilike.%${search}%`).join(",");
    query = query.or(orFilter);
  }

  query = query.order(orderBy, { ascending }).range(from, to);

  const { data, error, count } = await query;
  if (error) {
    console.error(`[listResourceRowsPaged:${table}]`, error.message);
    return { rows: [], total: 0, page: safePage, pageSize, totalPages: 0 };
  }

  const total = count ?? 0;
  return {
    rows: (data ?? []) as T[],
    total,
    page: safePage,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getResourceRowBySlug<T>(
  table: string,
  slug: string
): Promise<T | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from(table)
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    console.error(`[getResourceRowBySlug:${table}]`, error.message);
    return null;
  }
  return (data ?? null) as T | null;
}

export async function getResourceRowById<T>(
  resourceKey: string,
  id: string
): Promise<T | null> {
  const config = getResourceConfig(resourceKey);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from(config.table)
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error(`[getResourceRowById:${resourceKey}]`, error.message);
    return null;
  }
  if (!data) return null;
  const { data: draft } = await supabase.from("content_drafts").select("payload")
    .eq("resource_key", resourceKey).eq("record_id", id).maybeSingle();
  return { ...data, ...((draft?.payload ?? {}) as Record<string, unknown>) } as T;
}

/**
 * Resultado de un conteo que distingue explícitamente "0 registros reales"
 * de "la consulta falló" (Fase 7, §2/§31). `count` es `null` únicamente
 * cuando `error` no es `null`; nunca se usa `0` para representar un error.
 */
export interface CountResult {
  count: number | null;
  error: string | null;
}

export async function countResourceRowsResult(table: string, publicOnly = false): Promise<CountResult> {
  const supabase = await createClient();
  let query = supabase.from(table).select("*", { count: "exact", head: true });
  if (publicOnly) query = query.eq("is_active", true).eq("status", "published");
  const { count, error } = await query;

  if (error) {
    console.error(`[countResourceRowsResult:${table}]`, error.message);
    return { count: null, error: error.message };
  }
  return { count: count ?? 0, error: null };
}

export interface ContentReviewItem {
  id: string;
  resourceKey: string;
  resourceLabel: string;
  title: string;
  href: string;
  updatedAt: string;
  kind: "draft" | "changes";
}

export async function getAdminContentReviewData(limit = 6): Promise<{
  draftCount: number | null;
  changeCount: number | null;
  items: ContentReviewItem[];
  error: boolean;
}> {
  const supabase = await createClient();
  const resources = Object.values(RESOURCE_CONFIGS);
  const [draftResults, changesResult] = await Promise.all([
    Promise.all(resources.map(async (config) => {
      const result = await supabase.from(config.table)
        .select(`id, ${config.titleField}, updated_at`, { count: "exact" })
        .eq("status", "draft")
        .order("updated_at", { ascending: false })
        .limit(limit);
      return { config, ...result };
    })),
    supabase.from("content_drafts")
      .select("resource_key, record_id, payload, updated_at", { count: "exact" })
      .order("updated_at", { ascending: false })
      .limit(limit),
  ]);

  let error = Boolean(changesResult.error || changesResult.count === null);
  let draftCount = 0;
  const items: ContentReviewItem[] = [];
  for (const { config, data, count, error: queryError } of draftResults) {
    if (queryError || count === null) {
      error = true;
      continue;
    }
    draftCount += count;
    for (const row of (data ?? []) as unknown as Record<string, unknown>[]) {
      items.push({
        id: String(row.id),
        resourceKey: config.key,
        resourceLabel: config.labelSingular,
        title: String(row[config.titleField] ?? "Sin título"),
        href: `${config.adminPath}/${row.id}`,
        updatedAt: String(row.updated_at ?? ""),
        kind: "draft",
      });
    }
  }

  const changeRows = (changesResult.data ?? []) as Array<{
    resource_key: string;
    record_id: string;
    payload: Record<string, unknown> | null;
    updated_at: string;
  }>;
  const grouped = new Map<string, string[]>();
  for (const row of changeRows) {
    const ids = grouped.get(row.resource_key) ?? [];
    ids.push(row.record_id);
    grouped.set(row.resource_key, ids);
  }

  const changeItems = await Promise.all([...grouped.entries()].map(async ([resourceKey, ids]) => {
    const config = getResourceConfig(resourceKey);
    const { data, error: itemError } = await supabase.from(config.table)
      .select(`id, ${config.titleField}`).in("id", ids);
    if (itemError) {
      error = true;
      return [];
    }
    const titles = new Map(((data ?? []) as unknown as Record<string, unknown>[]).map((row) => [String(row.id), String(row[config.titleField] ?? "Sin título")]));
    return changeRows.filter((row) => row.resource_key === resourceKey).map((row) => ({
      id: row.record_id,
      resourceKey,
      resourceLabel: config.labelSingular,
      title: String(row.payload?.[config.titleField] ?? titles.get(row.record_id) ?? "Sin título"),
      href: `${config.adminPath}/${row.record_id}`,
      updatedAt: row.updated_at,
      kind: "changes" as const,
    }));
  }));

  const changeCount = changesResult.error || changesResult.count === null ? null : changesResult.count;
  return {
    draftCount: error && draftResults.some((result) => result.error || result.count === null) ? null : draftCount,
    changeCount,
    items: [...items, ...changeItems.flat()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, limit),
    error,
  };
}

/**
 * Versión previa, mantenida por compatibilidad con los ~15 consumidores
 * actuales que solo necesitan un número (dashboards internos, listados de
 * admin, etc.). Conserva el comportamiento histórico de devolver `0` ante
 * un error de consulta — eso sigue siendo aceptable ahí porque esas
 * páginas no dependen de distinguir "0 real" de "error" (Fase 7 solo
 * corrigió esa distinción donde de verdad importa: Home y `/contenido`,
 * que ahora usan `countResourceRowsResult` directamente). No duplica la
 * consulta: reutiliza `countResourceRowsResult`.
 */
export async function countResourceRows(table: string): Promise<number> {
  const { count } = await countResourceRowsResult(table);
  return count ?? 0;
}

const CATEGORY_LINKED_TABLES = ["laboratory_tests", "procedures", "clinical_analyses"] as const;

/**
 * Conteo real de contenido por categoría (Fase 7, §1), para las categorías
 * que no tienen tabla propia (todo excepto microbiología, que usa
 * `microorganisms` vía `countResourceRowsResult`). Cuenta, para cada
 * `categoryId`, cuántas filas activas de `laboratory_tests`, `procedures`
 * y `clinical_analyses` le pertenecen — exactamente las mismas tres tablas
 * que ya muestra `/contenido/[category]/page.tsx` al entrar a esa
 * categoría, así que el número del Home ahora coincide con lo que esa
 * página realmente listaría.
 *
 * Usa 3 consultas totales (una por tabla, agrupando en memoria por
 * `category_id`) en vez de `categoryIds.length * 3` consultas `head:true`,
 * para no multiplicar las llamadas a Supabase por cada categoría.
 *
 * Si alguna de las 3 consultas falla, `error` queda con el primer mensaje
 * de error y los conteos de esa tabla simplemente no se suman (no se
 * inventan). El consumidor debe tratar `error !== null` como "no se pudo
 * verificar el conteo completo", no confiar en los números parciales como
 * si fueran definitivos.
 */
export async function getCategoryContentCounts(
  categoryIds: string[]
): Promise<{ counts: Record<string, number>; error: string | null }> {
  const counts: Record<string, number> = Object.fromEntries(categoryIds.map((id) => [id, 0]));
  if (categoryIds.length === 0) return { counts, error: null };

  const supabase = await createClient();
  let firstError: string | null = null;

  const results = await Promise.all(
    CATEGORY_LINKED_TABLES.map((table) =>
      supabase
        .from(table)
        .select("category_id")
        .eq("is_active", true)
        .eq("status", "published")
        .in("category_id", categoryIds)
        .then((result) => ({ table, ...result }))
    )
  );

  for (const { table, data, error } of results) {
    if (error) {
      console.error(`[getCategoryContentCounts:${table}]`, error.message);
      firstError = firstError ?? error.message;
      continue;
    }

    for (const row of (data ?? []) as { category_id: string | null }[]) {
      if (row.category_id && row.category_id in counts) {
        counts[row.category_id] += 1;
      }
    }
  }

  return { counts, error: firstError };
}

/**
 * Mapa slug → id para un conjunto conocido de categorías (Fase 7, §1). El
 * Home usa una lista fija de slugs/íconos/descripciones (no lee la tabla
 * `categories` para eso, ver `app/page.tsx`), pero sí necesita el `id` real
 * de cada categoría para poder contar `laboratory_tests`/`procedures`/
 * `clinical_analyses` por `category_id`.
 */
export async function getCategoryIdsBySlug(
  slugs: string[]
): Promise<{ map: Record<string, string>; error: string | null }> {
  if (slugs.length === 0) return { map: {}, error: null };

  const supabase = await createClient();
  const { data, error } = await supabase.from("categories").select("id, slug").in("slug", slugs);

  if (error) {
    console.error("[getCategoryIdsBySlug]", error.message);
    return { map: {}, error: error.message };
  }

  const map: Record<string, string> = {};
  for (const row of (data ?? []) as { id: string; slug: string }[]) {
    map[row.slug] = row.id;
  }
  return { map, error: null };
}

