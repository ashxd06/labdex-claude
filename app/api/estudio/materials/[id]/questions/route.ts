import { NextResponse, type NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSession } from "@/lib/auth/getSession";
import { estudioClient } from "@/lib/estudio/shared";
import { loadReadyOwnedMaterial } from "@/lib/estudio/practice/access";
import {
  generateQuestionsFromMaterial,
  GeminiNotConfiguredError,
  GeminiRequestError,
  GeminiTimeoutError,
  PracticeGenerationError,
} from "@/lib/estudio/practice/generate";
import { toQuestionPromptView, type StudyQuestionRecord } from "@/lib/estudio/practice/types";

export const dynamic = "force-dynamic";

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * GET: lista las preguntas ya existentes para este material, SIN la
 * respuesta correcta ni la explicación (Fase 6.1, §41). Se usa para saber
 * cuántas preguntas ya hay disponibles antes de armar un intento.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: materialId } = await params;
  const { user } = await getSession();
  if (!user) return errorResponse("Debes iniciar sesión.", 401);

  const supabase = (await estudioClient()) as SupabaseClient;

  const { data, error } = await supabase
    .from("study_questions")
    .select("*")
    .eq("material_id", materialId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[estudio:questions] list", error.message);
    return errorResponse("No se pudieron cargar las preguntas.", 500);
  }

  const questions = ((data ?? []) as StudyQuestionRecord[]).map(toQuestionPromptView);
  return NextResponse.json({ questions, total: questions.length });
}

/**
 * POST: genera preguntas nuevas y las agrega al banco existente (Fase 6.1,
 * §24-25). Se le pasa a Gemini el texto de las preguntas ya existentes para
 * reducir duplicados (§25: "evitar duplicados cuando sea posible").
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: materialId } = await params;
  const { user } = await getSession();
  if (!user) return errorResponse("Debes iniciar sesión.", 401);

  let body: { count?: number };
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const count = typeof body.count === "number" ? body.count : 10;

  const supabase = (await estudioClient()) as SupabaseClient;

  const loaded = await loadReadyOwnedMaterial(supabase, materialId, user.id);
  if (!loaded.ok) return errorResponse(loaded.error, loaded.status);

  const { data: existingRows, error: existingError } = await supabase
    .from("study_questions")
    .select("question")
    .eq("material_id", materialId)
    .eq("user_id", user.id);

  if (existingError) {
    console.error("[estudio:questions] fetch existing", existingError.message);
    return errorResponse("No se pudo generar preguntas nuevas.", 500);
  }

  const existingQuestions = (existingRows ?? []).map((r) => r.question as string);

  try {
    const generated = await generateQuestionsFromMaterial({
      materialTitle: loaded.material.title,
      content: loaded.content,
      count,
      existingQuestions,
    });

    if (generated.length === 0) {
      return errorResponse(
        "No hay suficiente información en el material para generar preguntas confiables sobre este tema.",
        422
      );
    }

    const { data, error } = await supabase
      .from("study_questions")
      .insert(
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
      )
      .select("*");

    if (error || !data) {
      console.error("[estudio:questions] insert", error?.message);
      return errorResponse("Las preguntas se generaron pero no se pudieron guardar.", 500);
    }

    return NextResponse.json({
      questions: (data as StudyQuestionRecord[]).map(toQuestionPromptView),
      requested: count,
      generated: generated.length,
    });
  } catch (err) {
    if (err instanceof GeminiNotConfiguredError) {
      return errorResponse("LABDEX AI todavía no está configurado (falta GEMINI_API_KEY).", 503);
    }
    if (err instanceof GeminiTimeoutError) {
      return errorResponse("Gemini tardó demasiado en responder. Inténtalo de nuevo.", 504);
    }
    if (err instanceof GeminiRequestError) {
      return errorResponse("Gemini no está disponible en este momento. Inténtalo de nuevo más tarde.", 502);
    }
    if (err instanceof PracticeGenerationError) {
      return errorResponse(err.message, 422);
    }
    console.error("[estudio:questions] unexpected error", err);
    return errorResponse("Ocurrió un error inesperado.", 500);
  }
}
