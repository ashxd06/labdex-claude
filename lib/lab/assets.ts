"use server";

import { revalidatePath } from "next/cache";
import { labClient } from "@/lib/lab/shared";
import { getSession } from "@/lib/auth/getSession";
import { isAdmin } from "@/lib/permissions";
import type { LabActionState } from "@/lib/lab/actions";

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_BYTES = 3 * 1024 * 1024; // 3 MB
const EXTENSION_BY_TYPE: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

const FIELD_TO_COLUMN: Record<string, string> = {
  logo: "logo_path",
  signature: "signature_path",
  seal: "seal_path",
};

async function assertAdmin() {
  const { profile } = await getSession();
  if (!isAdmin(profile)) throw new Error("Solo un administrador puede modificar estos archivos.");
}

export async function uploadLabAsset(
  field: "logo" | "signature" | "seal",
  _prevState: LabActionState,
  formData: FormData
): Promise<LabActionState> {
  try {
    await assertAdmin();
    const column = FIELD_TO_COLUMN[field];
    if (!column) return { status: "error", message: "Campo no válido." };

    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return { status: "error", message: "Selecciona un archivo." };
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return { status: "error", message: "Formato no permitido. Usa PNG, JPG o WEBP." };
    }
    if (file.size > MAX_BYTES) {
      return { status: "error", message: "El archivo supera el tamaño máximo (3 MB)." };
    }

    const extension = EXTENSION_BY_TYPE[file.type] ?? "png";
    const path = `${field}-${Date.now()}.${extension}`;

    const supabase = await labClient();
    const { error: uploadError } = await supabase.storage
      .from("lab-assets")
      .upload(path, file, { upsert: true, contentType: file.type });
    if (uploadError) {
      return { status: "error", message: "No se pudo subir el archivo." };
    }

    const { error: updateError } = await supabase
      .from("lab_settings")
      .update({ [column]: path })
      .eq("id", true);
    if (updateError) {
      return { status: "error", message: "El archivo se subió pero no se pudo enlazar." };
    }

    revalidatePath("/laboratorio/configuracion");
    return { status: "success", message: "Archivo subido correctamente." };
  } catch (err) {
    return { status: "error", message: err instanceof Error ? err.message : "Error inesperado." };
  }
}

export async function deleteLabAsset(
  field: "logo" | "signature" | "seal",
  currentPath: string
): Promise<LabActionState> {
  try {
    await assertAdmin();
    const column = FIELD_TO_COLUMN[field];
    const supabase = await labClient();
    await supabase.storage.from("lab-assets").remove([currentPath]);
    const { error } = await supabase.from("lab_settings").update({ [column]: null }).eq("id", true);
    if (error) return { status: "error", message: "No se pudo quitar el archivo." };
    revalidatePath("/laboratorio/configuracion");
    return { status: "success" };
  } catch (err) {
    return { status: "error", message: err instanceof Error ? err.message : "Error inesperado." };
  }
}

/**
 * `lab-assets` es un bucket privado (los datos del laboratorio nunca son
 * públicos), así que las imágenes se sirven con signed URLs de corta
 * duración en vez de una URL pública fija.
 */
export async function getSignedLabAssetUrl(path: string | null): Promise<string | null> {
  if (!path) return null;
  const supabase = await labClient();
  const { data, error } = await supabase.storage.from("lab-assets").createSignedUrl(path, 60 * 10);
  if (error) return null;
  return data?.signedUrl ?? null;
}
