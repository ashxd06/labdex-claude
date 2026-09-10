import { NextResponse, type NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSession } from "@/lib/auth/getSession";
import { estudioClient } from "@/lib/estudio/shared";
import { toFlashcardView, type StudyFlashcardRecord } from "@/lib/estudio/practice/types";

export const dynamic = "force-dynamic";

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * PATCH: registra la interacción "Lo sabía" / "No lo sabía" sobre una
 * flashcard (Fase 6.1, §4, §51-52). Actualiza contadores mínimos en la
 * propia fila en vez de crear una tabla de eventos separada.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; cardId: string }> }
) {
  const { id: materialId, cardId } = await params;
  const { user } = await getSession();
  if (!user) return errorResponse("Debes iniciar sesión.", 401);

  let body: { known?: boolean };
  try {
    body = await request.json();
  } catch {
    return errorResponse("Cuerpo de la petición inválido.", 400);
  }
  if (typeof body.known !== "boolean") {
    return errorResponse("Falta indicar si la tarjeta se sabía o no.", 400);
  }

  const supabase = (await estudioClient()) as SupabaseClient;

  const { data: existing, error: fetchError } = await supabase
    .from("study_flashcards")
    .select("*")
    .eq("id", cardId)
    .eq("material_id", materialId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (fetchError) {
    console.error("[estudio:flashcards/id] fetch", fetchError.message);
    return errorResponse("No se pudo registrar el repaso.", 500);
  }
  if (!existing) {
    return errorResponse("La flashcard no existe o no te pertenece.", 404);
  }

  const record = existing as StudyFlashcardRecord;
  const { data, error } = await supabase
    .from("study_flashcards")
    .update({
      times_seen: record.times_seen + 1,
      times_known: record.times_known + (body.known ? 1 : 0),
      last_known: body.known,
      last_reviewed_at: new Date().toISOString(),
    })
    .eq("id", cardId)
    .eq("user_id", user.id)
    .select("*")
    .single();

  if (error || !data) {
    console.error("[estudio:flashcards/id] update", error?.message);
    return errorResponse("No se pudo registrar el repaso.", 500);
  }

  await supabase.from("study_materials").update({ last_studied_at: new Date().toISOString() }).eq("id", materialId);

  return NextResponse.json({ flashcard: toFlashcardView(data as StudyFlashcardRecord) });
}
