import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient as createTypedClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth/getSession";

export const dynamic = "force-dynamic";

async function untypedClient(): Promise<SupabaseClient> {
  return (await createTypedClient()) as unknown as SupabaseClient;
}

/**
 * Lista las conversaciones de LABDEX AI del usuario autenticado (para el
 * panel de historial de la interfaz de chat). RLS ya garantiza que solo se
 * devuelven las conversaciones de `user_id = auth.uid()`, pero se filtra
 * explícitamente también para que la intención quede clara en el código.
 */
export async function GET() {
  const { user } = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });
  }

  const supabase = await untypedClient();
  const { data, error } = await supabase
    .from("ai_conversations")
    .select("id, title, mode, created_at, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("[labdex-ai:conversations] list", error.message);
    return NextResponse.json({ error: "No se pudieron cargar tus conversaciones." }, { status: 500 });
  }

  return NextResponse.json({ conversations: data ?? [] });
}
