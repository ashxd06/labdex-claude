import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/getSession";
import { estudioClient } from "@/lib/estudio/shared";
import { deleteStoredPdf } from "@/lib/estudio/storage";
import { toMaterialContent, toSummaryView, type StudyMaterialRecord } from "@/lib/estudio/types";

export const dynamic = "force-dynamic";

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user } = await getSession();
  if (!user) {
    return errorResponse("Debes iniciar sesión.", 401);
  }

  const supabase = await estudioClient();
  const { data, error } = await supabase
    .from("study_materials")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("[estudio:materials/id] get", error.message);
    return errorResponse("No se pudo cargar el material.", 500);
  }
  if (!data) {
    return errorResponse("El material no existe o no te pertenece.", 404);
  }

  const record = data as unknown as StudyMaterialRecord;
  return NextResponse.json({
    material: toSummaryView(record),
    content: toMaterialContent(record),
  });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user } = await getSession();
  if (!user) {
    return errorResponse("Debes iniciar sesión.", 401);
  }

  const supabase = await estudioClient();
  const { data, error } = await supabase
    .from("study_materials")
    .select("id, storage_path")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("[estudio:materials/id] fetch before delete", error.message);
    return errorResponse("No se pudo eliminar el material.", 500);
  }
  if (!data) {
    return errorResponse("El material no existe o no te pertenece.", 404);
  }

  if (data.storage_path) {
    await deleteStoredPdf(supabase, data.storage_path as string);
  }

  const { error: deleteError } = await supabase.from("study_materials").delete().eq("id", id).eq("user_id", user.id);
  if (deleteError) {
    console.error("[estudio:materials/id] delete", deleteError.message);
    return errorResponse("No se pudo eliminar el material.", 500);
  }

  return NextResponse.json({ ok: true });
}
