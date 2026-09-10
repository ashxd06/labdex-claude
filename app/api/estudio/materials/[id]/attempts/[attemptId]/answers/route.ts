import { NextResponse, type NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSession } from "@/lib/auth/getSession";
import { estudioClient } from "@/lib/estudio/shared";
import { toQuestionRevealView, type StudyExamAttemptRecord, type StudyQuestionRecord } from "@/lib/estudio/practice/types";

export const dynamic = "force-dynamic";

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * POST: registra la respuesta del estudiante a una pregunta dentro de un
 * intento.
 *
 * El backend es quien conoce y valida la respuesta correcta (Fase 6.1,
 * §40-41): nunca se le pide a Gemini que decida si el usuario acertó, y la
 * respuesta correcta solo se incluye en el JSON de vuelta cuando el modo lo
 * permite (nunca durante un examen en curso, §17).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; attemptId: string }> }
) {
  const { id: materialId, attemptId } = await params;
  const { user } = await getSession();
  if (!user) return errorResponse("Debes iniciar sesión.", 401);

  let body: { questionId?: string; selectedIndex?: number };
  try {
    body = await request.json();
  } catch {
    return errorResponse("Cuerpo de la petición inválido.", 400);
  }
  if (typeof body.questionId !== "string" || typeof body.selectedIndex !== "number") {
    return errorResponse("Falta la pregunta o la opción seleccionada.", 400);
  }

  const supabase = (await estudioClient()) as SupabaseClient;

  const { data: attemptRow, error: attemptError } = await supabase
    .from("study_exam_attempts")
    .select("*")
    .eq("id", attemptId)
    .eq("material_id", materialId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (attemptError) {
    console.error("[estudio:attempts/answers] fetch attempt", attemptError.message);
    return errorResponse("No se pudo registrar la respuesta.", 500);
  }
  if (!attemptRow) {
    return errorResponse("El intento no existe o no te pertenece.", 404);
  }

  const attempt = attemptRow as StudyExamAttemptRecord;
  if (attempt.status !== "en_progreso") {
    return errorResponse("Este intento ya finalizó; no se pueden registrar más respuestas.", 409);
  }
  if (!attempt.question_ids.includes(body.questionId)) {
    return errorResponse("Esa pregunta no pertenece a este intento.", 400);
  }

  const { data: existingAnswer } = await supabase
    .from("study_exam_answers")
    .select("id")
    .eq("attempt_id", attemptId)
    .eq("question_id", body.questionId)
    .maybeSingle();
  if (existingAnswer) {
    return errorResponse("Ya respondiste esta pregunta en este intento.", 409);
  }

  const { data: questionRow, error: questionError } = await supabase
    .from("study_questions")
    .select("*")
    .eq("id", body.questionId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (questionError) {
    console.error("[estudio:attempts/answers] fetch question", questionError.message);
    return errorResponse("No se pudo registrar la respuesta.", 500);
  }
  if (!questionRow) {
    return errorResponse("La pregunta no existe o no te pertenece.", 404);
  }

  const question = questionRow as StudyQuestionRecord;
  const isCorrect = body.selectedIndex === question.correct_answer_index;

  const { error: insertError } = await supabase.from("study_exam_answers").insert({
    attempt_id: attemptId,
    question_id: body.questionId,
    user_id: user.id,
    selected_index: body.selectedIndex,
    is_correct: isCorrect,
  });

  if (insertError) {
    console.error("[estudio:attempts/answers] insert", insertError.message);
    return errorResponse("No se pudo registrar la respuesta.", 500);
  }

  if (isCorrect) {
    const { error: updateError } = await supabase
      .from("study_exam_attempts")
      .update({ correct_count: attempt.correct_count + 1 })
      .eq("id", attemptId)
      .eq("user_id", user.id);
    if (updateError) {
      console.error("[estudio:attempts/answers] update correct_count", updateError.message);
    }
  }

  // Modo examen: nunca revelar si acertó ni la respuesta correcta mientras
  // el intento sigue en curso (Fase 6.1, §17, §41).
  if (attempt.mode === "examen") {
    return NextResponse.json({ recorded: true });
  }

  return NextResponse.json({
    recorded: true,
    correct: isCorrect,
    reveal: toQuestionRevealView(question),
  });
}
