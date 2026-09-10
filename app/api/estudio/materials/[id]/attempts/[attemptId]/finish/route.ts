import { NextResponse, type NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSession } from "@/lib/auth/getSession";
import { estudioClient } from "@/lib/estudio/shared";
import { toAttemptSummaryView, type StudyExamAttemptRecord } from "@/lib/estudio/practice/types";

export const dynamic = "force-dynamic";

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * POST: finaliza un intento (Fase 6.1, §18-19). El puntaje SIEMPRE se
 * recalcula aquí, contando las respuestas realmente guardadas en
 * `study_exam_answers` — nunca se confía en un contador enviado por el
 * cliente (Fase 6.1, §39-41). Preguntas sin responder simplemente no suman
 * a `correct_count`, lo que las trata como incorrectas en el resultado
 * final; esto permite terminar un intento sin responder todo, con un
 * resultado consistente.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; attemptId: string }> }
) {
  const { id: materialId, attemptId } = await params;
  const { user } = await getSession();
  if (!user) return errorResponse("Debes iniciar sesión.", 401);

  const supabase = (await estudioClient()) as SupabaseClient;

  const { data: attemptRow, error: attemptError } = await supabase
    .from("study_exam_attempts")
    .select("*")
    .eq("id", attemptId)
    .eq("material_id", materialId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (attemptError) {
    console.error("[estudio:attempts/finish] fetch attempt", attemptError.message);
    return errorResponse("No se pudo finalizar el intento.", 500);
  }
  if (!attemptRow) {
    return errorResponse("El intento no existe o no te pertenece.", 404);
  }

  const attempt = attemptRow as StudyExamAttemptRecord;
  if (attempt.status === "finalizado") {
    // Idempotente: si ya estaba finalizado, simplemente se devuelve su resumen.
    return NextResponse.json({ attempt: toAttemptSummaryView(attempt) });
  }

  const { count: correctCount, error: countError } = await supabase
    .from("study_exam_answers")
    .select("id", { count: "exact", head: true })
    .eq("attempt_id", attemptId)
    .eq("user_id", user.id)
    .eq("is_correct", true);

  if (countError) {
    console.error("[estudio:attempts/finish] count correct", countError.message);
    return errorResponse("No se pudo calcular el puntaje.", 500);
  }

  const { data: updated, error: updateError } = await supabase
    .from("study_exam_attempts")
    .update({
      status: "finalizado",
      correct_count: correctCount ?? 0,
      finished_at: new Date().toISOString(),
    })
    .eq("id", attemptId)
    .eq("user_id", user.id)
    .select("*")
    .single();

  if (updateError || !updated) {
    console.error("[estudio:attempts/finish] update", updateError?.message);
    return errorResponse("No se pudo finalizar el intento.", 500);
  }

  await supabase.from("study_materials").update({ last_studied_at: new Date().toISOString() }).eq("id", materialId);

  return NextResponse.json({ attempt: toAttemptSummaryView(updated as StudyExamAttemptRecord) });
}
