import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient as createTypedClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth/getSession";
import { toClientSources } from "@/lib/labdex-ai/citations";
import type { AiMessageRecord } from "@/lib/labdex-ai/types";

export const dynamic = "force-dynamic";

async function untypedClient(): Promise<SupabaseClient> {
  return (await createTypedClient()) as unknown as SupabaseClient;
}

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * Devuelve una conversación y sus mensajes. RLS impide que un usuario
 * acceda a una conversación de otro (Fase 5, §13): si la fila no existe
 * para `auth.uid()`, `maybeSingle()` devuelve null y respondemos 404 en
 * vez de filtrar si "existe pero no es tuya" o "no existe".
 */
export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  const { user } = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });
  }

  const supabase = await untypedClient();

  const { data: conversation, error: conversationError } = await supabase
    .from("ai_conversations")
    .select("id, title, mode, created_at, updated_at")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (conversationError) {
    console.error("[labdex-ai:conversation] fetch", conversationError.message);
    return NextResponse.json({ error: "No se pudo cargar la conversación." }, { status: 500 });
  }
  if (!conversation) {
    return NextResponse.json({ error: "Conversación no encontrada." }, { status: 404 });
  }

  const { data: messages, error: messagesError } = await supabase
    .from("ai_messages")
    .select("id, role, content, sources, used_general_knowledge, created_at")
    .eq("conversation_id", id)
    .order("created_at", { ascending: true });

  if (messagesError) {
    console.error("[labdex-ai:conversation] messages", messagesError.message);
    return NextResponse.json({ error: "No se pudo cargar el historial." }, { status: 500 });
  }

  return NextResponse.json({
    conversation,
    messages: ((messages ?? []) as AiMessageRecord[]).map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      sources: toClientSources(m.sources ?? []),
      usedGeneralKnowledge: m.used_general_knowledge,
      createdAt: m.created_at,
    })),
  });
}

/** Elimina una conversación (y en cascada sus mensajes) del usuario actual. */
export async function DELETE(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  const { user } = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });
  }

  const supabase = await untypedClient();
  const { error } = await supabase
    .from("ai_conversations")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error("[labdex-ai:conversation] delete", error.message);
    return NextResponse.json({ error: "No se pudo eliminar la conversación." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
