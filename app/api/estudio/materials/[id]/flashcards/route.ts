import { NextResponse, type NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSession } from "@/lib/auth/getSession";
import { estudioClient } from "@/lib/estudio/shared";
import { loadReadyOwnedMaterial } from "@/lib/estudio/practice/access";
import {
  generateFlashcardsFromMaterial,
  GeminiNotConfiguredError,
  GeminiRequestError,
  GeminiTimeoutError,
} from "@/lib/estudio/practice/generate";
import { PracticeGenerationError } from "@/lib/estudio/practice/generate";
import { toFlashcardView, type StudyFlashcardRecord } from "@/lib/estudio/practice/types";

export const dynamic = "force-dynamic";

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

/** GET: lista las flashcards ya generadas para este material (Fase 6.1, §37:
 * deben persistir; el estudiante no debería perderlas al recargar). */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: materialId } = await params;
  const { user } = await getSession();
  if (!user) return errorResponse("Debes iniciar sesión.", 401);

  const supabase = (await estudioClient()) as SupabaseClient;

  const { data, error } = await supabase
    .from("study_flashcards")
    .select("*")
    .eq("material_id", materialId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[estudio:flashcards] list", error.message);
    return errorResponse("No se pudieron cargar las flashcards.", 500);
  }

  const flashcards = ((data ?? []) as StudyFlashcardRecord[]).map(toFlashcardView);
  return NextResponse.json({ flashcards });
}

/**
 * POST: genera flashcards nuevas y las agrega a las existentes (Fase 6.1,
 * §24-25: generación controlada — se llama explícitamente, no en cada
 * apertura del material, y no destruye tarjetas anteriores).
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

  try {
    const generated = await generateFlashcardsFromMaterial({
      materialTitle: loaded.material.title,
      content: loaded.content,
      count,
    });

    if (generated.length === 0) {
      return errorResponse(
        "No hay suficiente información en el material para generar flashcards confiables.",
        422
      );
    }

    const { data, error } = await supabase
      .from("study_flashcards")
      .insert(
        generated.map((card) => ({
          material_id: materialId,
          user_id: user.id,
          question: card.question,
          answer: card.answer,
          source_pages: card.sourcePages,
        }))
      )
      .select("*");

    if (error || !data) {
      console.error("[estudio:flashcards] insert", error?.message);
      return errorResponse("Las flashcards se generaron pero no se pudieron guardar.", 500);
    }

    return NextResponse.json({
      flashcards: (data as StudyFlashcardRecord[]).map(toFlashcardView),
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
    console.error("[estudio:flashcards] unexpected error", err);
    return errorResponse("Ocurrió un error inesperado.", 500);
  }
}
