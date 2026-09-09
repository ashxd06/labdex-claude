import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/getSession";
import { estudioClient } from "@/lib/estudio/shared";
import { getSignedPdfUrl } from "@/lib/estudio/storage";

export const dynamic = "force-dynamic";

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Visor del documento original (Fase 6, §21). Nunca se expone una URL
 * pública del bucket: se genera una URL firmada de corta duración bajo
 * demanda, y solo después de comprobar que el material pertenece al
 * usuario autenticado.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user } = await getSession();
  if (!user) {
    return errorResponse("Debes iniciar sesión.", 401);
  }

  const supabase = await estudioClient();
  const { data, error } = await supabase
    .from("study_materials")
    .select("storage_path")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("[estudio:materials/id/file] fetch", error.message);
    return errorResponse("No se pudo acceder al archivo.", 500);
  }
  if (!data || !data.storage_path) {
    return errorResponse("El archivo no existe o no te pertenece.", 404);
  }

  const url = await getSignedPdfUrl(supabase, data.storage_path as string);
  if (!url) {
    return errorResponse("No se pudo generar el enlace al archivo.", 500);
  }

  return NextResponse.json({ url });
}
