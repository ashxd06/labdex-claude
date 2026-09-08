import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient as createTypedClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth/getSession";
import { ConversationSidebar } from "@/components/labdex-ai/ConversationSidebar";
import { ChatShell } from "@/components/labdex-ai/ChatShell";
import { Loading } from "@/components/ui/Loading";
import { toClientSources } from "@/lib/labdex-ai/citations";
import { isAiMode, type AiMessageRecord } from "@/lib/labdex-ai/types";
import type { ChatMessageViewModel } from "@/components/labdex-ai/MessageBubble";

export const dynamic = "force-dynamic";

async function untypedClient(): Promise<SupabaseClient> {
  return (await createTypedClient()) as unknown as SupabaseClient;
}

async function loadConversation(id: string, userId: string) {
  const supabase = await untypedClient();

  const { data: conversation } = await supabase
    .from("ai_conversations")
    .select("id, mode")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (!conversation) return null;

  const { data: messages } = await supabase
    .from("ai_messages")
    .select("id, role, content, sources, used_general_knowledge, created_at")
    .eq("conversation_id", id)
    .order("created_at", { ascending: true });

  return {
    mode: isAiMode(conversation.mode) ? conversation.mode : "general",
    messages: ((messages ?? []) as AiMessageRecord[]).map(
      (m): ChatMessageViewModel => ({
        id: m.id,
        role: m.role,
        content: m.content,
        sources: toClientSources(m.sources ?? []),
        usedGeneralKnowledge: m.used_general_knowledge,
      })
    ),
  };
}

export default async function LabdexAiConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = await params;
  const { user } = await getSession();
  // El layout de /labdex-ai ya exige sesión, pero `user` puede ser null en
  // el instante entre comprobaciones; TypeScript lo exige de todas formas.
  if (!user) notFound();

  const data = await loadConversation(conversationId, user.id);
  if (!data) notFound();

  return (
    <div className="flex h-[calc(100dvh-4rem)] w-full">
      <ConversationSidebar activeId={conversationId} />
      <Suspense fallback={<Loading label="Cargando conversación…" />}>
        <ChatShell conversationId={conversationId} initialMode={data.mode} initialMessages={data.messages} />
      </Suspense>
    </div>
  );
}
