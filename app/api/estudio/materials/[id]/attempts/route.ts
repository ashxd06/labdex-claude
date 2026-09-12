import { NextResponse, type NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSession } from "@/lib/auth/getSession";
import { estudioClient } from "@/lib/estudio/shared";
import { pickRandomIds, buildErrorReviewQuestionIds } from "@/lib/estudio/practice/attempts";
import { loadReadyOwnedMaterial } from "@/lib/estudio/practice/access";
import { generateQuestionsFromMaterial } from "@/lib/estudio/practice/generate";
import {
  toAttemptSummaryView,
  toQuestionPromptView,
  type AttemptMode,
  type ExamDifficulty,
  type StudyExamAttemptRecord,
  type StudyQuestionRecord,
} from "@/lib/estudio/practice/types";
import { getQuestionsForAdaptive, getQuestionPerformance } from "@/lib/estudio/adaptive/queries";
import { groupQuestionIdsByTopic } from "@/lib/estudio/adaptive/topics";
import { buildTopicStats, computeTopicMastery, computeAccuracy } from "@/lib/estudio/adaptive/mastery";
import { selectAdaptiveQuestionIds } from "@/lib/estudio/adaptive/priority";

export const dynamic = "force-dynamic";

const VALID_MODES: AttemptMode[] = ["practica", "examen", "repaso_errores", "inteligente"];
const VALID_DIFFICULTIES: ExamDifficulty[] = ["easy", "normal", "hard"];
const DEFAULT_COUNT = 10;
// Si faltan preguntas para completar una sesión de Repaso Inteligente,
// generar al menos este lote (Fase 6.2, §13) en vez de uno por uno, para no
// disparar generaciones diminutas repetidas.
const MIN_ADAPTIVE_GENERATION_BATCH = 5;

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

/** GET: historial de intentos de este material (Fase 6.1, §23). */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: materialId } = await params;
  const { user } = await getSession();
  if (!user) return errorResponse("Debes iniciar sesión.", 401);

  const supabase = (await estudioClient()) as SupabaseClient;
  const { data, error } = await supabase
    .from("study_exam_attempts")
    .select("*")
    .eq("material_id", materialId)
    .eq("user_id", user.id)
    .order("started_at", { ascending: false });

  if (error) {
    console.error("[estudio:attempts] list", error.message);
    return errorResponse("No se pudo cargar el historial.", 500);
  }

  const attempts = ((data ?? []) as StudyExamAttemptRecord[]).map(toAttemptSummaryView);
  return NextResponse.json({ attempts });
}

/**
 * POST: crea un nuevo intento (Fase 6.1, §14, §16, §21).
 *
 * Modos:
 * - "practica" / "examen": selecciona hasta `count` preguntas ya generadas
 *   para el material (aleatorizadas, Fase 6.1 §15), filtradas por
 *   dificultad si se indica. NO genera preguntas nuevas aquí — eso es un
 *   paso explícito en /questions (Fase 6.1, §24).
 * - "repaso_errores": reutiliza las preguntas falladas de un intento previo
 *   finalizado del mismo material (Fase 6.1, §21, §46).
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: materialId } = await params;
  const { user } = await getSession();
  if (!user) return errorResponse("Debes iniciar sesión.", 401);

  let body: { mode?: string; count?: number; difficulty?: string; sourceAttemptId?: string };
  try {
    body = await request.json();
  } catch {
    return errorResponse("Cuerpo de la petición inválido.", 400);
  }

  const mode = body.mode as AttemptMode;
  if (!VALID_MODES.includes(mode)) {
    return errorResponse("Modo de intento inválido.", 400);
  }

  const supabase = (await estudioClient()) as SupabaseClient;

  // El material debe existir y pertenecer al usuario, sin importar el modo.
  const { data: materialRow, error: materialError } = await supabase
    .from("study_materials")
    .select("id")
    .eq("id", materialId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (materialError) {
    console.error("[estudio:attempts] fetch material", materialError.message);
    return errorResponse("No se pudo acceder al material.", 500);
  }
  if (!materialRow) {
    return errorResponse("El material no existe o no te pertenece.", 404);
  }

  let questionIds: string[] = [];
  let sourceAttemptId: string | null = null;

  if (mode === "repaso_errores") {
    if (!body.sourceAttemptId) {
      return errorResponse("Falta indicar de qué intento repasar los errores.", 400);
    }

    const { data: sourceAttempt, error: sourceError } = await supabase
      .from("study_exam_attempts")
      .select("id, status, material_id")
      .eq("id", body.sourceAttemptId)
      .eq("user_id", user.id)
      .eq("material_id", materialId)
      .maybeSingle();

    if (sourceError) {
      console.error("[estudio:attempts] fetch source attempt", sourceError.message);
      return errorResponse("No se pudo acceder al intento original.", 500);
    }
    if (!sourceAttempt || sourceAttempt.status !== "finalizado") {
      return errorResponse("El intento original no existe o todavía no ha finalizado.", 404);
    }

    const { data: answers, error: answersError } = await supabase
      .from("study_exam_answers")
      .select("question_id, is_correct")
      .eq("attempt_id", body.sourceAttemptId)
      .eq("user_id", user.id);

    if (answersError) {
      console.error("[estudio:attempts] fetch answers for review", answersError.message);
      return errorResponse("No se pudieron cargar las respuestas del intento original.", 500);
    }

    questionIds = buildErrorReviewQuestionIds(
      (answers ?? []) as { question_id: string; is_correct: boolean }[]
    );
    sourceAttemptId = body.sourceAttemptId;

    if (questionIds.length === 0) {
      return errorResponse("No tuviste errores en ese intento; no hay nada que repasar.", 422);
    }
  } else if (mode === "inteligente") {
    const count = typeof body.count === "number" && body.count > 0 ? Math.round(body.count) : DEFAULT_COUNT;

    // Cargar el material (para los keyConcepts que definen "tema", Fase
    // 6.2 §8) — reutiliza exactamente la misma comprobación de propiedad
    // que usan /flashcards y /questions.
    const loaded = await loadReadyOwnedMaterial(supabase, materialId, user.id);
    if (!loaded.ok) return errorResponse(loaded.error, loaded.status);

    let questions = await getQuestionsForAdaptive(supabase, user.id, materialId);

    // Si no hay suficientes preguntas guardadas para armar la sesión,
    // generar el faltante reutilizando la generación de Fase 6.1 (§13) —
    // nunca un sistema de IA aparte. Best-effort: si Gemini falla o no está
    // configurado, se continúa igual con lo que ya existía.
    if (questions.length < count) {
      const shortfall = Math.max(count - questions.length, MIN_ADAPTIVE_GENERATION_BATCH);
      try {
        const generated = await generateQuestionsFromMaterial({
          materialTitle: loaded.material.title,
          content: loaded.content,
          count: shortfall,
          existingQuestions: [], // el propio prompt ya evita duplicar contra sí mismo dentro del lote
        });
        if (generated.length > 0) {
          await supabase.from("study_questions").insert(
            generated.map((q) => ({
              material_id: materialId,
              user_id: user.id,
              question: q.question,
              options: q.options,
              correct_answer_index: q.correctAnswerIndex,
              explanation: q.explanation,
              source_pages: q.sourcePages,
              difficulty: q.difficulty,
            }))
          );
          questions = await getQuestionsForAdaptive(supabase, user.id, materialId);
        }
      } catch (err) {
        console.warn("[estudio:attempts] adaptive shortfall generation skipped", err);
      }
    }

    if (questions.length === 0) {
      return errorResponse(
        "Todavía no hay preguntas generadas para este material. Genera preguntas antes de empezar.",
        422
      );
    }

    const performanceByQuestion = await getQuestionPerformance(supabase, user.id, materialId);
    const topicToQuestionIds = groupQuestionIdsByTopic(questions, loaded.content.keyConcepts);
    const topicMastery = buildTopicStats(topicToQuestionIds, performanceByQuestion).map(computeTopicMastery);

    const topicByQuestionId = new Map<string, string>();
    for (const [topic, ids] of topicToQuestionIds) {
      for (const id of ids) topicByQuestionId.set(id, topic);
    }
    const topicScoreByTopic = new Map(topicMastery.map((t) => [t.topic, t.score]));

    const totalAnswered = [...performanceByQuestion.values()].reduce((sum, p) => sum + p.timesAnswered, 0);
    const totalCorrect = [...performanceByQuestion.values()].reduce((sum, p) => sum + p.timesCorrect, 0);
    // Sin historial todavía: usar un puntaje neutral (ni fácil ni difícil)
    // en vez de asumir buen o mal rendimiento sin evidencia.
    const overallScore = totalAnswered > 0 ? computeAccuracy(totalCorrect, totalAnswered) : 0.5;

    questionIds = selectAdaptiveQuestionIds(
      questions,
      performanceByQuestion,
      topicByQuestionId,
      topicScoreByTopic,
      overallScore,
      count
    );
  } else {
    const count = typeof body.count === "number" && body.count > 0 ? Math.round(body.count) : DEFAULT_COUNT;
    const difficulty =
      typeof body.difficulty === "string" && VALID_DIFFICULTIES.includes(body.difficulty as ExamDifficulty)
        ? (body.difficulty as ExamDifficulty)
        : null;

    let query = supabase.from("study_questions").select("id").eq("material_id", materialId).eq("user_id", user.id);
    if (difficulty) {
      query = query.eq("difficulty", difficulty);
    }
    const { data: availableQuestions, error: questionsError } = await query;

    if (questionsError) {
      console.error("[estudio:attempts] fetch available questions", questionsError.message);
      return errorResponse("No se pudo preparar el intento.", 500);
    }
    if (!availableQuestions || availableQuestions.length === 0) {
      return errorResponse(
        "Todavía no hay preguntas generadas para este material. Genera preguntas antes de empezar.",
        422
      );
    }

    questionIds = pickRandomIds(
      availableQuestions.map((q) => q.id as string),
      count
    );
  }

  const { data: attempt, error: insertError } = await supabase
    .from("study_exam_attempts")
    .insert({
      material_id: materialId,
      user_id: user.id,
      mode,
      question_ids: questionIds,
      total_questions: questionIds.length,
      correct_count: 0,
      status: "en_progreso",
      source_attempt_id: sourceAttemptId,
    })
    .select("*")
    .single();

  if (insertError || !attempt) {
    console.error("[estudio:attempts] insert", insertError?.message);
    return errorResponse("No se pudo crear el intento.", 500);
  }

  // Cargar las preguntas en el orden ya decidido, SIN respuesta correcta ni
  // explicación (Fase 6.1, §41).
  const { data: questionRows, error: fetchQuestionsError } = await supabase
    .from("study_questions")
    .select("*")
    .in("id", questionIds)
    .eq("user_id", user.id);

  if (fetchQuestionsError || !questionRows) {
    console.error("[estudio:attempts] fetch attempt questions", fetchQuestionsError?.message);
    return errorResponse("El intento se creó pero no se pudieron cargar sus preguntas.", 500);
  }

  const byId = new Map((questionRows as StudyQuestionRecord[]).map((q) => [q.id, q]));
  const orderedQuestions = questionIds
    .map((id) => byId.get(id))
    .filter((q): q is StudyQuestionRecord => Boolean(q))
    .map(toQuestionPromptView);

  await supabase.from("study_materials").update({ last_studied_at: new Date().toISOString() }).eq("id", materialId);

  return NextResponse.json({
    attempt: toAttemptSummaryView(attempt as StudyExamAttemptRecord),
    questions: orderedQuestions,
  });
}
