import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient as createTypedClient } from "@/lib/supabase/server";
import { getResourceConfig } from "@/lib/content/resourceConfigs";

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
  orderBy?: string;
  ascending?: boolean;
}

export async function listResourceRows<T>(
  table: string,
  {
    search,
    searchColumns = [],
    onlyActive,
    categoryId,
    kind,
    orderBy = "created_at",
    ascending = false,
  }: ListParams = {}
): Promise<T[]> {
  const supabase = await createClient();
  let query = supabase.from(table).select("*");

  if (onlyActive) {
    query = query.eq("is_active", true);
  }
  if (categoryId) {
    query = query.eq("category_id", categoryId);
  }
  if (kind) {
    query = query.eq("kind", kind);
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
  return (data ?? []) as T[];
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
  return (data ?? null) as T | null;
}

export async function countResourceRows(table: string): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true });

  if (error) {
    console.error(`[countResourceRows:${table}]`, error.message);
    return 0;
  }
  return count ?? 0;
}
