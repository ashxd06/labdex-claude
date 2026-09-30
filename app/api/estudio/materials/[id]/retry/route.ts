import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/getSession";
import { estudioClient } from "@/lib/estudio/shared";
import {
  analyzeStudyMaterial,
  StudyMaterialAnalysisError,
  PdfProcessingError,
  GeminiNotConfiguredError,
  GeminiRequestError,
  GeminiTimeoutError,
} from "@/lib/estudio/analysis/pipeline";
import { persistStudyMaterialAnalysis } from "@/lib/estudio/analysis/persist";
import { STUDY_MATERIALS_BUCKET } from "@/lib/estudio/storage";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function friendlyError(error: unknown): string {
  if (error instanceof PdfProcessingError) {
    if (error.reason === "encrypted") return "El PDF está protegido con contraseña. Quita la protección e inténtalo de nuevo.";
    if (error.reason === "empty") return "El archivo está vacío o no tiene páginas.";
    return "No pudimos leer este PDF: parece estar dañado o no es un PDF válido.";
  }
  if (error instanceof GeminiNotConfiguredError) return "LABDEX AI todavía no está configurado.";
  if (error instanceof GeminiTimeoutError) return "El análisis tardó demasiado. Puedes volver a intentarlo.";
  if (error instanceof GeminiRequestError) return "El servicio de IA no está disponible en este momento. Inténtalo más tarde.";
  if (error instanceof StudyMaterialAnalysisError) return error.message;
  return "No pudimos completar el análisis. El PDF se conservó para que puedas volver a intentarlo.";
}

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user } = await getSession();
  if (!user) return errorResponse("Debes iniciar sesión.", 401);

  const supabase = await estudioClient();
  const { data: material, error: fetchError } = await supabase
    .from("study_materials")
    .select("id, title, storage_path, status")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (fetchError) {
    console.error("[estudio:materials/retry] fetch", fetchError.message);
    return errorResponse("No se pudo cargar el material.", 500);
  }
  if (!material) return errorResponse("El material no existe o no te pertenece.", 404);
  if (material.status !== "error") return errorResponse("Solo se puede reintentar un material con error.", 409);
  if (!material.storage_path) return errorResponse("No se encontró el PDF original. Vuelve a subir el archivo.", 404);

  // Claim the retry so two clicks/tabs cannot start duplicate Gemini runs.
  const { data: claimed, error: claimError } = await supabase
    .from("study_materials")
    .update({ status: "procesando", error_message: null })
    .eq("id", id)
    .eq("user_id", user.id)
    .eq("status", "error")
    .select("id")
    .maybeSingle();

  if (claimError) {
    console.error("[estudio:materials/retry] claim", claimError.message);
    return errorResponse("No se pudo iniciar el reintento.", 500);
  }
  if (!claimed) return errorResponse("El material ya está en proceso o cambió de estado. Actualiza la página.", 409);

  try {
    const { data: pdf, error: downloadError } = await supabase.storage
      .from(STUDY_MATERIALS_BUCKET)
      .download(material.storage_path);
    if (downloadError || !pdf) {
      const message = "No se encontró el PDF original. Vuelve a subir el archivo.";
      await supabase
        .from("study_materials")
        .update({ status: "error", error_message: message, storage_path: "" })
        .eq("id", id)
        .eq("user_id", user.id);
      return errorResponse(message, 404);
    }

    const result = await analyzeStudyMaterial({
      title: material.title,
      pdfBytes: new Uint8Array(await pdf.arrayBuffer()),
    });
    const persistError = await persistStudyMaterialAnalysis(supabase, id, result);
    if (persistError) throw new StudyMaterialAnalysisError("El análisis terminó, pero no se pudo guardar el resultado.");

    return NextResponse.json({ id, status: "listo" as const, pagesProcessed: result.pagesProcessed, pageCount: result.pageCount, truncated: result.truncated });
  } catch (error) {
    const message = friendlyError(error);
    const { error: stateError } = await supabase
      .from("study_materials")
      .update({ status: "error", error_message: message })
      .eq("id", id)
      .eq("user_id", user.id);

    if (stateError) console.error("[estudio:materials/retry] restore error status", stateError.message);
    return errorResponse(message, 502);
  }
}
