import type { SupabaseClient } from "@supabase/supabase-js";
import type { AnalyzeStudyMaterialResult } from "@/lib/estudio/analysis/pipeline";

/** Persiste solo una síntesis que ya pasó las validaciones del pipeline. */
export async function persistStudyMaterialAnalysis(
  supabase: SupabaseClient,
  materialId: string,
  result: AnalyzeStudyMaterialResult
): Promise<string | null> {
  const { error } = await supabase
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

  return error ? error.message : null;
}
