import { NextResponse, type NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSession } from "@/lib/auth/getSession";
import { estudioClient } from "@/lib/estudio/shared";
import {
  toAttemptSummaryView,
  toQuestionPromptView,
  toQuestionRevealView,
  type StudyExamAnswerRecord,
  type StudyExamAttemptRecord,
  type StudyQuestionRecord,
} from "@/lib/estudio/practice/types";

export const dynamic = "force-dynamic";

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * GET: detalle de un intento con sus preguntas en orden (Fase 6.1, §17,
 * §20).
 *
 * Política de revelado (Fase 6.1, §17, §41: nunca mostrar la respuesta
 * correcta durante un examen en curso):
 * - Si el intento ya terminó (`finalizado`), cada pregunta se revela por
 *   completo (respuesta correcta + explicación), sin importar el modo —
 *   esto es la pantalla de "Ver respuestas" (§20).
 * - Si el intento sigue en curso y el modo es "practica" o
 *   "repaso_errores", las preguntas ya respondidas se revelan (para el
 *   feedback inmediato de §14); las no respondidas no.
 * - Si el intento sigue en curso y el modo es "examen", nunca se revela
 *   nada, ni siquiera si ya se respondió (§17).
 */
export async function GET(
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
    console.error("[estudio:attempts/id] fetch attempt", attemptError.message);
    return errorResponse("No se pudo cargar el intento.", 500);
  }
  if (!attemptRow) {
    return errorResponse("El intento no existe o no te pertenece.", 404);
  }

  const attempt = attemptRow as StudyExamAttemptRecord;

  const { data: questionRows, error: questionsError } = await supabase
    .from("study_questions")
    .select("*")
    .in("id", attempt.question_ids)
    .eq("user_id", user.id);

  if (questionsError || !questionRows) {
    console.error("[estudio:attempts/id] fetch questions", questionsError?.message);
    return errorResponse("No se pudieron cargar las preguntas del intento.", 500);
  }

  const { data: answerRows, error: answersError } = await supabase
    .from("study_exam_answers")
    .select("*")
    .eq("attempt_id", attemptId)
    .eq("user_id", user.id);

  if (answersError) {
    console.error("[estudio:attempts/id] fetch answers", answersError.message);
    return errorResponse("No se pudieron cargar tus respuestas.", 500);
  }

  const questionById = new Map((questionRows as StudyQuestionRecord[]).map((q) => [q.id, q]));
  const answerByQuestionId = new Map(
    ((answerRows ?? []) as StudyExamAnswerRecord[]).map((a) => [a.question_id, a])
  );

  const isFinished = attempt.status === "finalizado";
  const immediateRevealMode = attempt.mode !== "examen";

  const items = attempt.question_ids
    .map((id) => questionById.get(id))
    .filter((q): q is StudyQuestionRecord => Boolean(q))
    .map((question) => {
      const answer = answerByQuestionId.get(question.id) ?? null;
      const shouldReveal = isFinished || (immediateRevealMode && answer !== null);

      return {
        question: toQuestionPromptView(question),
        answer: answer ? { selectedIndex: answer.selected_index, isCorrect: answer.is_correct } : null,
        reveal: shouldReveal ? toQuestionRevealView(question) : null,
      };
    });

  return NextResponse.json({
    attempt: toAttemptSummaryView(attempt),
    mode: attempt.mode,
    items,
  });
}
