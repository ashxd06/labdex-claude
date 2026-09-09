import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth/getSession";
import { estudioClient } from "@/lib/estudio/shared";
import {
  buildStoragePath,
  deleteStoredPdf,
  uploadOriginalPdf,
  validateUploadFile,
} from "@/lib/estudio/storage";
import {
  analyzeStudyMaterial,
  StudyMaterialAnalysisError,
  PdfProcessingError,
  GeminiNotConfiguredError,
  GeminiRequestError,
  GeminiTimeoutError,
} from "@/lib/estudio/analysis/pipeline";
import { toSummaryView, type StudyMaterialRecord } from "@/lib/estudio/types";

export const dynamic = "force-dynamic";
// El análisis de un PDF de varias decenas de páginas puede tardar más que
// el límite por defecto de una función serverless: se sube el máximo
// permitido en este entorno. Documentos muy grandes podrían necesitar en
// el futuro un procesamiento en segundo plano (Fase 6, §28, dejado
// preparado pero no implementado todavía).
export const maxDuration = 300;

const TITLE_MAX_LENGTH = 150;

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function friendlyPdfError(err: PdfProcessingError): string {
  switch (err.reason) {
    case "encrypted":
      return "El PDF está protegido con contraseña. Quita la protección e inténtalo de nuevo.";
    case "empty":
      return "El archivo está vacío o no tiene páginas.";
    default:
      return "No pudimos leer este PDF: parece estar dañado o no es un PDF válido.";
  }
}

function deriveTitle(rawTitle: string | null, filename: string): string {
  const trimmed = rawTitle?.trim();
  if (trimmed) return trimmed.slice(0, TITLE_MAX_LENGTH);
  const withoutExtension = filename.replace(/\.pdf$/i, "").replace(/[_-]+/g, " ").trim();
  return (withoutExtension || filename).slice(0, TITLE_MAX_LENGTH);
}

export async function GET() {
  const { user } = await getSession();
  if (!user) {
    return errorResponse("Debes iniciar sesión para ver tus materiales.", 401);
  }

  const supabase = await estudioClient();
  const { data, error } = await supabase
    .from("study_materials")
    .select(
      "id, user_id, title, original_filename, storage_path, file_size_bytes, status, page_count, pages_processed, truncated, error_message, last_studied_at, created_at, updated_at"
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[estudio:materials] list", error.message);
    return errorResponse("No se pudieron cargar tus materiales.", 500);
  }

  const materials = (data ?? []) as unknown as StudyMaterialRecord[];
  return NextResponse.json({ materials: materials.map(toSummaryView) });
}

export async function POST(request: NextRequest) {
  const { user } = await getSession();
  if (!user) {
    return errorResponse("Debes iniciar sesión para subir un material.", 401);
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return errorResponse("No se pudo leer el archivo enviado.", 400);
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return errorResponse("Selecciona un archivo PDF.", 400);
  }

  const validationError = validateUploadFile({ type: file.type, size: file.size });
  if (validationError) {
    return errorResponse(validationError, 400);
  }

  const title = deriveTitle(formData.get("title") as string | null, file.name);
  const supabase = await estudioClient();

  // 1. Crear el registro en estado "subiendo" ---------------------------------
  const { data: created, error: createError } = await supabase
    .from("study_materials")
    .insert({
      user_id: user.id,
      title,
      original_filename: file.name,
      storage_path: "",
      file_size_bytes: file.size,
      status: "subiendo",
    })
    .select("id")
    .single();

  if (createError || !created) {
    console.error("[estudio:materials] create", createError?.message);
    return errorResponse("No se pudo crear el material.", 500);
  }

  const materialId = created.id as string;
  const storagePath = buildStoragePath(user.id, materialId);

  // 2. Subir el PDF original a Storage -----------------------------------------
  const { error: uploadError } = await uploadOriginalPdf(supabase, storagePath, file);
  if (uploadError) {
    await supabase
      .from("study_materials")
      .update({ status: "error", error_message: uploadError })
      .eq("id", materialId);
    return errorResponse(uploadError, 500);
  }

  await supabase
    .from("study_materials")
    .update({ status: "procesando", storage_path: storagePath })
    .eq("id", materialId);

  // 3. Procesar el documento completo (Fase 6, §11) ----------------------------
  try {
    const arrayBuffer = await file.arrayBuffer();
    const result = await analyzeStudyMaterial({ title, pdfBytes: new Uint8Array(arrayBuffer) });

    const { error: updateError } = await supabase
      .from("study_materials")
      .update({
        status: "listo",
        page_count: result.pageCount,
        pages_processed: result.pagesProcessed,
        truncated: result.truncated,
        error_message: null,
        summary: result.content.summary,
        key_concepts: result.content.keyConcepts,
        must_remember: result.content.mustRemember,
        simple_explanation: result.content.simpleExplanation,
        page_index: result.content.pageIndex,
        processing_notes: result.content.processingNotes,
      })
      .eq("id", materialId);

    if (updateError) {
      console.error("[estudio:materials] persist analysis", updateError.message);
      return errorResponse("El material se procesó pero no se pudo guardar el resultado.", 500);
    }

    return NextResponse.json({ id: materialId, status: "listo" as const });
  } catch (err) {
    let message = "No pudimos procesar completamente este material. Puedes intentar subirlo de nuevo.";
    if (err instanceof PdfProcessingError) {
      message = friendlyPdfError(err);
    } else if (err instanceof GeminiNotConfiguredError) {
      message = "LABDEX AI todavía no está configurado (falta GEMINI_API_KEY), así que no se puede procesar el material.";
    } else if (err instanceof GeminiTimeoutError) {
      message = "El análisis tardó demasiado. Puedes intentar subir el archivo de nuevo.";
    } else if (err instanceof GeminiRequestError) {
      message = "El servicio de IA no está disponible en este momento. Inténtalo de nuevo más tarde.";
    } else if (err instanceof StudyMaterialAnalysisError) {
      message = err.message;
    } else {
      console.error("[estudio:materials] unexpected processing error", err);
    }

    await supabase
      .from("study_materials")
      .update({ status: "error", error_message: message })
      .eq("id", materialId);

    // Si falló antes de generar nada útil, no dejamos el PDF huérfano en
    // Storage: se conserva únicamente si el estudiante querrá reintentar
    // desde el mismo archivo en una fase futura. Por ahora, dado que no hay
    // botón de "reprocesar", se elimina para no acumular archivos inútiles.
    await deleteStoredPdf(supabase, storagePath);

    return errorResponse(message, 502);
  }
}
