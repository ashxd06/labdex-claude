"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { createClient as createTypedClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth/getSession";
import { isAdmin } from "@/lib/permissions";
import { getResourceConfig } from "@/lib/content/resourceConfigs";
import type { CrudActionState } from "@/lib/content/actions";

async function client(): Promise<SupabaseClient> {
  return (await createTypedClient()) as unknown as SupabaseClient;
}

async function assertAdmin() {
  const { profile } = await getSession();
  if (!isAdmin(profile)) {
    throw new Error("No tienes permisos para realizar esta acción.");
  }
}

const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];
const ALLOWED_DOCUMENT_TYPES = [...ALLOWED_IMAGE_TYPES, "application/pdf"];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_DOCUMENT_BYTES = 20 * 1024 * 1024; // 20 MB

const EXTENSION_BY_TYPE: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

function validateFile(file: File, bucket: string): string | null {
  const allowedTypes = bucket === "documents" ? ALLOWED_DOCUMENT_TYPES : ALLOWED_IMAGE_TYPES;
  const maxBytes = bucket === "documents" ? MAX_DOCUMENT_BYTES : MAX_IMAGE_BYTES;

  if (!allowedTypes.includes(file.type)) {
    return "Formato de archivo no permitido. Usa PNG, JPG, WEBP" + (bucket === "documents" ? " o PDF." : ".");
  }
  if (file.size > maxBytes) {
    return `El archivo supera el tamaño máximo permitido (${Math.round(maxBytes / (1024 * 1024))} MB).`;
  }
  return null;
}

/**
 * Sube un archivo a un bucket de Supabase Storage y actualiza el campo
 * correspondiente en la fila del recurso. La ruta del archivo se construye
 * en el servidor (nunca se confía en un nombre de archivo enviado por el
 * cliente), y el tipo/tamaño se valida antes de subir nada.
 */
export async function uploadResourceFile(
  resourceKey: string,
  id: string,
  fieldKey: string,
  _prevState: CrudActionState,
  formData: FormData
): Promise<CrudActionState> {
  try {
    await assertAdmin();
    const config = getResourceConfig(resourceKey);
    const fieldConfig = config.fields.find((f) => f.key === fieldKey);
    if (!fieldConfig || fieldConfig.type !== "file" || !fieldConfig.bucket) {
      return { status: "error", message: "Campo de archivo no válido." };
    }

    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return { status: "error", message: "Selecciona un archivo." };
    }

    const validationError = validateFile(file, fieldConfig.bucket);
    if (validationError) {
      return { status: "error", message: validationError };
    }

    const extension = EXTENSION_BY_TYPE[file.type] ?? "bin";
    const path = `${resourceKey}/${id}/${fieldKey}-${Date.now()}.${extension}`;

    const supabase = await client();
    const { error: uploadError } = await supabase.storage
      .from(fieldConfig.bucket)
      .upload(path, file, { upsert: true, contentType: file.type });

    if (uploadError) {
      return { status: "error", message: "No se pudo subir el archivo." };
    }

    const { error: updateError } = await supabase
      .from(config.table)
      .update({ [fieldKey]: path })
      .eq("id", id);

    if (updateError) {
      return { status: "error", message: "El archivo se subió pero no se pudo enlazar al registro." };
    }

    revalidatePath(config.adminPath);
    return { status: "success", message: "Archivo subido correctamente." };
  } catch (err) {
    return { status: "error", message: err instanceof Error ? err.message : "Error inesperado." };
  }
}

export async function deleteResourceFile(
  resourceKey: string,
  id: string,
  fieldKey: string,
  currentPath: string
): Promise<CrudActionState> {
  try {
    await assertAdmin();
    const config = getResourceConfig(resourceKey);
    const fieldConfig = config.fields.find((f) => f.key === fieldKey);
    if (!fieldConfig || fieldConfig.type !== "file" || !fieldConfig.bucket) {
      return { status: "error", message: "Campo de archivo no válido." };
    }

    const supabase = await client();
    await supabase.storage.from(fieldConfig.bucket).remove([currentPath]);

    const { error } = await supabase
      .from(config.table)
      .update({ [fieldKey]: null })
      .eq("id", id);

    if (error) {
      return { status: "error", message: "No se pudo quitar el archivo del registro." };
    }

    revalidatePath(config.adminPath);
    return { status: "success" };
  } catch (err) {
    return { status: "error", message: err instanceof Error ? err.message : "Error inesperado." };
  }
}
