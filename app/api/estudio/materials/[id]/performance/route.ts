import { NextResponse, type NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSession } from "@/lib/auth/getSession";
import { estudioClient } from "@/lib/estudio/shared";
import { loadReadyOwnedMaterial } from "@/lib/estudio/practice/access";
import { getPerformanceSnapshot } from "@/lib/estudio/adaptive/queries";

export const dynamic = "force-dynamic";

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * GET: desempeño y recomendaciones de Repaso Inteligente para un material
 * (Fase 6.2, §16-18). Todo lo numérico se calcula aquí, en código, a partir
 * de las tablas de Fase 6.1 (§3, §14) — esta ruta no llama a ningún modelo
 * de IA.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: materialId } = await params;
  const { user } = await getSession();
  if (!user) return errorResponse("Debes iniciar sesión.", 401);

  const supabase = (await estudioClient()) as SupabaseClient;

  const loaded = await loadReadyOwnedMaterial(supabase, materialId, user.id);
  if (!loaded.ok) return errorResponse(loaded.error, loaded.status);

  try {
    const snapshot = await getPerformanceSnapshot(
      supabase,
      user.id,
      materialId,
      loaded.content,
      loaded.material.last_studied_at
    );
    return NextResponse.json(snapshot);
  } catch (err) {
    console.error("[estudio:performance]", err);
    return errorResponse("No se pudo calcular tu desempeño.", 500);
  }
}
