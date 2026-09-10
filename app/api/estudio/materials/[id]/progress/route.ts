import { NextResponse, type NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSession } from "@/lib/auth/getSession";
import { estudioClient } from "@/lib/estudio/shared";
import { computeScorePercent, type StudyExamAttemptRecord } from "@/lib/estudio/practice/types";

export const dynamic = "force-dynamic";

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * GET: métricas básicas de progreso para un material (Fase 6.1, §22, §52).
 * Deliberadamente simple: agregados sobre las tablas existentes, sin una
 * tabla de estadísticas propia ni un motor analítico.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: materialId } = await params;
  const { user } = await getSession();
  if (!user) return errorResponse("Debes iniciar sesión.", 401);

  const supabase = (await estudioClient()) as SupabaseClient;

  const { data: materialRow, error: materialError } = await supabase
    .from("study_materials")
    .select("id, last_studied_at")
    .eq("id", materialId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (materialError) {
    console.error("[estudio:progress] fetch material", materialError.message);
    return errorResponse("No se pudo cargar el progreso.", 500);
  }
  if (!materialRow) {
    return errorResponse("El material no existe o no te pertenece.", 404);
  }

  const [totalFlashcards, studiedFlashcards, totalQuestions, attemptsResult] = await Promise.all([
    supabase
      .from("study_flashcards")
      .select("id", { count: "exact", head: true })
      .eq("material_id", materialId)
      .eq("user_id", user.id),
    supabase
      .from("study_flashcards")
      .select("id", { count: "exact", head: true })
      .eq("material_id", materialId)
      .eq("user_id", user.id)
      .gt("times_seen", 0),
    supabase
      .from("study_questions")
      .select("id", { count: "exact", head: true })
      .eq("material_id", materialId)
      .eq("user_id", user.id),
    supabase
      .from("study_exam_attempts")
      .select("*")
      .eq("material_id", materialId)
      .eq("user_id", user.id),
  ]);

  if (attemptsResult.error) {
    console.error("[estudio:progress] fetch attempts", attemptsResult.error.message);
    return errorResponse("No se pudo cargar el progreso.", 500);
  }

  const attempts = (attemptsResult.data ?? []) as StudyExamAttemptRecord[];
  const attemptIds = attempts.map((a) => a.id);

  let questionsAnswered = 0;
  let questionsCorrect = 0;
  if (attemptIds.length > 0) {
    const [answeredResult, correctResult] = await Promise.all([
      supabase
        .from("study_exam_answers")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .in("attempt_id", attemptIds),
      supabase
        .from("study_exam_answers")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .in("attempt_id", attemptIds)
        .eq("is_correct", true),
    ]);
    questionsAnswered = answeredResult.count ?? 0;
    questionsCorrect = correctResult.count ?? 0;
  }

  const finishedExams = attempts.filter((a) => a.mode === "examen" && a.status === "finalizado");
  const bestScore = finishedExams.reduce((max, a) => {
    const score = computeScorePercent(a.correct_count, a.total_questions);
    return score > max ? score : max;
  }, 0);

  return NextResponse.json({
    flashcards: {
      total: totalFlashcards.count ?? 0,
      studied: studiedFlashcards.count ?? 0,
    },
    questions: {
      total: totalQuestions.count ?? 0,
      answered: questionsAnswered,
      correct: questionsCorrect,
      incorrect: Math.max(0, questionsAnswered - questionsCorrect),
    },
    exams: {
      completed: finishedExams.length,
      bestScore: finishedExams.length > 0 ? bestScore : null,
    },
    lastStudiedAt: materialRow.last_studied_at as string | null,
  });
}
