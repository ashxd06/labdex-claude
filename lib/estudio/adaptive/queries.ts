import type { SupabaseClient } from "@supabase/supabase-js";
import type { StudyMaterialContent } from "@/lib/estudio/types";
import type {
  FlashcardPerformanceInput,
  PerformanceSnapshot,
  QuestionForAdaptive,
  QuestionPerformance,
} from "@/lib/estudio/adaptive/types";
import { groupQuestionIdsByTopic } from "@/lib/estudio/adaptive/topics";
import { buildTopicStats, computeTopicMastery, computeMasteryCounts, computeAccuracy } from "@/lib/estudio/adaptive/mastery";
import { buildRecommendations } from "@/lib/estudio/adaptive/recommendations";
import { computeScorePercent } from "@/lib/estudio/practice/types";

/**
 * Capa de datos de Fase 6.2. A propósito NO crea ninguna tabla: agrega en
 * código (nunca en SQL complejo ni pidiéndoselo a la IA) el historial que
 * ya guardan `study_questions`, `study_exam_attempts`, `study_exam_answers`
 * y `study_flashcards` (Fase 6.1). El volumen por material es pequeño
 * (decenas o cientos de filas, no miles), así que traer todo y reducir en
 * JS es más simple y mantenible que una consulta SQL de agregación, y
 * sigue siendo rápido.
 */

/** Ids de todos los intentos (de cualquier modo/estado) del usuario para
 * este material — el punto de partida para leer sus respuestas. */
async function getAttemptIds(supabase: SupabaseClient, userId: string, materialId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("study_exam_attempts")
    .select("id")
    .eq("user_id", userId)
    .eq("material_id", materialId);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => row.id as string);
}

/**
 * Desempeño agregado por pregunta (Fase 6.2, §4): cuántas veces se
 * respondió, cuántas correctas, y el resultado de la respuesta más
 * reciente. Se calcula reduciendo `study_exam_answers` ordenadas por
 * fecha — nunca promedios ni clasificaciones hechas por la IA.
 */
export async function getQuestionPerformance(
  supabase: SupabaseClient,
  userId: string,
  materialId: string
): Promise<Map<string, QuestionPerformance>> {
  const attemptIds = await getAttemptIds(supabase, userId, materialId);
  const result = new Map<string, QuestionPerformance>();
  if (attemptIds.length === 0) return result;

  const { data, error } = await supabase
    .from("study_exam_answers")
    .select("question_id, is_correct, answered_at")
    .eq("user_id", userId)
    .in("attempt_id", attemptIds)
    .order("answered_at", { ascending: true });

  if (error) throw new Error(error.message);

  for (const row of (data ?? []) as { question_id: string; is_correct: boolean; answered_at: string }[]) {
    const existing = result.get(row.question_id);
    if (existing) {
      existing.timesAnswered += 1;
      if (row.is_correct) existing.timesCorrect += 1;
      existing.lastAnsweredAt = row.answered_at;
      existing.lastCorrect = row.is_correct;
    } else {
      result.set(row.question_id, {
        questionId: row.question_id,
        timesAnswered: 1,
        timesCorrect: row.is_correct ? 1 : 0,
        lastAnsweredAt: row.answered_at,
        lastCorrect: row.is_correct,
      });
    }
  }

  return result;
}

export async function getQuestionsForAdaptive(
  supabase: SupabaseClient,
  userId: string,
  materialId: string
): Promise<QuestionForAdaptive[]> {
  const { data, error } = await supabase
    .from("study_questions")
    .select("id, source_pages, difficulty")
    .eq("user_id", userId)
    .eq("material_id", materialId);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    id: row.id as string,
    sourcePages: row.source_pages as string | null,
    difficulty: row.difficulty as QuestionForAdaptive["difficulty"],
  }));
}

export async function getFlashcardsForAdaptive(
  supabase: SupabaseClient,
  userId: string,
  materialId: string
): Promise<FlashcardPerformanceInput[]> {
  const { data, error } = await supabase
    .from("study_flashcards")
    .select("id, times_seen, times_known, last_known, last_reviewed_at")
    .eq("user_id", userId)
    .eq("material_id", materialId);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    id: row.id as string,
    timesSeen: row.times_seen as number,
    timesKnown: row.times_known as number,
    lastKnown: row.last_known as boolean | null,
    lastReviewedAt: row.last_reviewed_at as string | null,
  }));
}

/**
 * Arma la "foto" completa de desempeño de un material (Fase 6.2, §16):
 * dominio por tema, contadores de dominio, recomendaciones, y los mismos
 * contadores de flashcards/exámenes que ya calculaba
 * `/api/estudio/materials/[id]/progress` (Fase 6.1) — se reutilizan aquí en
 * vez de mantener dos endpoints con lógica duplicada de flashcards/exámenes.
 */
export async function getPerformanceSnapshot(
  supabase: SupabaseClient,
  userId: string,
  materialId: string,
  content: StudyMaterialContent,
  lastStudiedAt: string | null
): Promise<PerformanceSnapshot> {
  const [questions, performanceByQuestion, flashcards, attemptsResult] = await Promise.all([
    getQuestionsForAdaptive(supabase, userId, materialId),
    getQuestionPerformance(supabase, userId, materialId),
    getFlashcardsForAdaptive(supabase, userId, materialId),
    supabase.from("study_exam_attempts").select("mode, status, correct_count, total_questions").eq("user_id", userId).eq("material_id", materialId),
  ]);

  if (attemptsResult.error) throw new Error(attemptsResult.error.message);

  const topicToQuestionIds = groupQuestionIdsByTopic(questions, content.keyConcepts);
  const topicStats = buildTopicStats(topicToQuestionIds, performanceByQuestion);
  const topics = topicStats.map(computeTopicMastery);
  const masteryCounts = computeMasteryCounts(topics);
  const recommendations = buildRecommendations(topics);

  const totalAnswered = [...performanceByQuestion.values()].reduce((sum, p) => sum + p.timesAnswered, 0);
  const totalCorrect = [...performanceByQuestion.values()].reduce((sum, p) => sum + p.timesCorrect, 0);

  const finishedExams = (attemptsResult.data ?? []).filter(
    (a) => a.mode === "examen" && a.status === "finalizado"
  ) as { correct_count: number; total_questions: number }[];
  const bestScorePercent = finishedExams.reduce((max: number | null, a) => {
    const score = computeScorePercent(a.correct_count, a.total_questions);
    return max === null || score > max ? score : max;
  }, null as number | null);

  const flashcardsSeen = flashcards.filter((f) => f.timesSeen > 0).length;
  const flashcardsKnown = flashcards.filter((f) => f.timesSeen > 0 && f.lastKnown === true).length;

  return {
    hasEnoughData: totalAnswered >= 5,
    totalAnswered,
    totalCorrect,
    overallAccuracyPercent: Math.round(computeAccuracy(totalCorrect, totalAnswered) * 100),
    topics,
    masteryCounts,
    recommendations,
    flashcards: {
      total: flashcards.length,
      seen: flashcardsSeen,
      known: flashcardsKnown,
      toReinforce: Math.max(0, flashcardsSeen - flashcardsKnown),
    },
    exams: {
      completed: finishedExams.length,
      bestScorePercent,
    },
    lastStudiedAt,
  };
}
