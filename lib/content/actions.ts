"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { createClient as createTypedClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth/getSession";
import { isAdmin } from "@/lib/permissions";
import { getResourceConfig, type FieldConfig } from "@/lib/content/resourceConfigs";
import { slugify } from "@/lib/content/slugify";

export interface CrudActionState {
  status: "idle" | "error" | "success";
  message?: string;
  id?: string;
}

/**
 * Rutas públicas reales que muestran datos de cada tabla de contenido
 * (Fase 7, §5). Las páginas de detalle dinámicas bajo `/contenido`
 * (`/contenido/pruebas/[slug]`, `/contenido/microbiologia/[kind]/[slug]`,
 * etc.) ya tienen `export const revalidate = 0` — se renderizan sin caché
 * en cada visita, así que no dependen de esta invalidación para mostrar
 * datos actualizados. Lo que sí faltaba invalidar son los listados/índices
 * públicos y el Home, que muestran conteos derivados de estas tablas
 * (Fase 7, §1); esto se agrega aquí como capa de seguridad adicional en
 * caso de que la estrategia de caché de esas páginas cambie más adelante.
 */
const PUBLIC_PATHS_BY_TABLE: Record<string, string[]> = {
  microorganisms: ["/", "/contenido", "/contenido/microbiologia"],
  categories: ["/", "/contenido"],
  culture_media: ["/", "/contenido", "/contenido/medios"],
  laboratory_tests: ["/", "/contenido", "/contenido/pruebas"],
  procedures: ["/", "/contenido", "/contenido/procedimientos"],
  clinical_analyses: ["/", "/contenido", "/contenido/analisis"],
  documents: ["/", "/contenido", "/contenido/documentos"],
};

/**
 * Estas tres tablas también aparecen en `/contenido/[category]`, filtradas
 * por `category_id` (ver esa página). Se revalida con `"layout"` porque es
 * una ruta dinámica: eso invalida todas las categorías, no solo una, sin
 * necesitar el slug exacto aquí.
 */
const CATEGORY_DETAIL_TABLES = new Set(["laboratory_tests", "procedures", "clinical_analyses", "categories"]);

function revalidatePublicPaths(table: string) {
  for (const path of PUBLIC_PATHS_BY_TABLE[table] ?? []) {
    revalidatePath(path);
  }
  if (CATEGORY_DETAIL_TABLES.has(table)) {
    revalidatePath("/contenido/[category]", "layout");
  }
}

async function client(): Promise<SupabaseClient> {
  return (await createTypedClient()) as unknown as SupabaseClient;
}

/**
 * Comprobación de autorización DEL SERVIDOR antes de cada escritura.
 * Esta no es la única barrera (RLS en Postgres es la definitiva y rechazaría
 * la operación igualmente), pero da un mensaje de error claro en vez de un
 * fallo genérico de base de datos, y evita el viaje de red innecesario.
 */
async function assertAdmin() {
  const { profile } = await getSession();
  if (!isAdmin(profile)) {
    throw new Error("No tienes permisos para realizar esta acción.");
  }
}

function buildPayload(fields: FieldConfig[], formData: FormData): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  for (const field of fields) {
    if (field.type === "file") continue; // los archivos se manejan aparte

    if (field.type === "checkbox") {
      payload[field.key] = formData.get(field.key) === "on";
      continue;
    }

    const raw = formData.get(field.key);
    if (raw === null) continue;

    let value: unknown = String(raw).trim();

    if (field.key === "display_order") {
      const parsed = Number.parseInt(String(value), 10);
      value = Number.isNaN(parsed) ? 0 : parsed;
    }

    payload[field.key] = value === "" ? null : value;
  }

  return payload;
}

export async function createRecord(
  resourceKey: string,
  _prevState: CrudActionState,
  formData: FormData
): Promise<CrudActionState> {
  try {
    await assertAdmin();
    const config = getResourceConfig(resourceKey);
    const supabase = await client();

    const payload = buildPayload(config.fields, formData);
    payload.status = formData.get("submit_intent") === "publish" ? "published" : "draft";

    const titleValue = String(formData.get(config.titleField) || "").trim();
    if (!titleValue) {
      return { status: "error", message: `El campo "${config.titleField}" es obligatorio.` };
    }

    const rawSlug = String(formData.get(config.slugField) || "").trim();
    payload[config.slugField] = slugify(rawSlug || titleValue);

    const { data: userData } = await supabase.auth.getUser();
    if (userData.user) {
      payload.created_by = userData.user.id;
      payload.updated_by = userData.user.id;
    }

    const { data, error } = await supabase.from(config.table).insert(payload).select("id").single();
    if (error) {
      if (error.code === "23505") {
        return { status: "error", message: "Ya existe un registro con ese slug." };
      }
      return { status: "error", message: "No se pudo crear el registro." };
    }

    revalidatePath(config.adminPath);
    revalidatePublicPaths(config.table);
    return {
      status: "success",
      message: payload.status === "published" ? `${config.labelSingular} publicado.` : `${config.labelSingular} guardado como borrador.`,
      id: data?.id as string | undefined,
    };
  } catch (err) {
    return { status: "error", message: err instanceof Error ? err.message : "Error inesperado." };
  }
}

export async function updateRecord(
  resourceKey: string,
  id: string,
  _prevState: CrudActionState,
  formData: FormData
): Promise<CrudActionState> {
  try {
    await assertAdmin();
    const config = getResourceConfig(resourceKey);
    const supabase = await client();

    const payload = buildPayload(config.fields, formData);
    const intent = formData.get("submit_intent") === "publish" ? "publish" : "draft";

    const titleValue = String(formData.get(config.titleField) || "").trim();
    if (!titleValue) {
      return { status: "error", message: `El campo "${config.titleField}" es obligatorio.` };
    }

    const rawSlug = String(formData.get(config.slugField) || "").trim();
    if (rawSlug) {
      payload[config.slugField] = slugify(rawSlug);
    }

    const { data: userData } = await supabase.auth.getUser();
    if (userData.user) {
      payload.updated_by = userData.user.id;
    }

    const { data: current, error: currentError } = await supabase
      .from(config.table).select("status").eq("id", id).maybeSingle();
    if (currentError || !current) return { status: "error", message: "No se encontró el registro para actualizar." };

    const { data: existingDraft } = await supabase.from("content_drafts").select("payload")
      .eq("resource_key", resourceKey).eq("record_id", id).maybeSingle();
    const stagedPayload = (existingDraft?.payload ?? {}) as Record<string, unknown>;

    if (current.status === "published" && intent === "draft") {
      const safePayload = Object.fromEntries(
        Object.entries(payload).filter(([key]) => config.fields.some((field) => field.key === key && field.type !== "file"))
      );
      const { error } = await supabase.from("content_drafts").upsert({
        resource_key: resourceKey,
        record_id: id,
        payload: { ...stagedPayload, ...safePayload },
        updated_by: userData.user?.id ?? null,
        updated_at: new Date().toISOString(),
      }, { onConflict: "resource_key,record_id" });
      if (error) return { status: "error", message: "No se pudo guardar el borrador de cambios." };
      revalidatePath(config.adminPath);
      return { status: "success", message: "Cambios guardados como borrador; la ficha pública sigue igual." };
    }

    if (intent === "publish" && current.status === "published") {
      Object.assign(payload, stagedPayload);
      // Los valores escritos en el formulario tienen prioridad sobre el borrador anterior.
      Object.assign(payload, buildPayload(config.fields, formData));
      payload[config.slugField] = slugify(rawSlug || titleValue);
    }
    payload.status = intent === "publish" ? "published" : "draft";

    const { error } = await supabase.from(config.table).update(payload).eq("id", id);
    if (error) {
      if (error.code === "23505") {
        return { status: "error", message: "Ya existe un registro con ese slug." };
      }
      return { status: "error", message: "No se pudo actualizar el registro." };
    }

    if (intent === "publish") {
      await supabase.from("content_drafts").delete().eq("resource_key", resourceKey).eq("record_id", id);
    }

    revalidatePath(config.adminPath);
    revalidatePublicPaths(config.table);
    return { status: "success", message: intent === "publish" ? `${config.labelSingular} publicado.` : `${config.labelSingular} guardado como borrador.` };
  } catch (err) {
    return { status: "error", message: err instanceof Error ? err.message : "Error inesperado." };
  }
}

export async function deleteRecord(resourceKey: string, id: string): Promise<CrudActionState> {
  try {
    await assertAdmin();
    const config = getResourceConfig(resourceKey);
    const supabase = await client();

    const { error } = await supabase.from(config.table).delete().eq("id", id);
    if (error) {
      return { status: "error", message: "No se pudo eliminar el registro." };
    }

    revalidatePath(config.adminPath);
    revalidatePublicPaths(config.table);
    return { status: "success", message: `${config.labelSingular} eliminado.` };
  } catch (err) {
    return { status: "error", message: err instanceof Error ? err.message : "Error inesperado." };
  }
}

export async function toggleActive(
  resourceKey: string,
  id: string,
  nextValue: boolean
): Promise<CrudActionState> {
  try {
    await assertAdmin();
    const config = getResourceConfig(resourceKey);
    const supabase = await client();

    const { error } = await supabase
      .from(config.table)
      .update({ is_active: nextValue })
      .eq("id", id);

    if (error) {
      return { status: "error", message: "No se pudo actualizar el estado." };
    }

    revalidatePath(config.adminPath);
    revalidatePublicPaths(config.table);
    return { status: "success" };
  } catch (err) {
    return { status: "error", message: err instanceof Error ? err.message : "Error inesperado." };
  }
}


