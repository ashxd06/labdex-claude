import { NextResponse, type NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient as createTypedClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth/getSession";
import { checkRateLimit } from "@/lib/labdex-ai/rateLimit";
import { generateLabdexAiAnswer, LabdexAiUserError } from "@/lib/labdex-ai/service";
import { toClientSources } from "@/lib/labdex-ai/citations";
import {
  GeminiNotConfiguredError,
  GeminiRequestError,
  GeminiTimeoutError,
} from "@/lib/labdex-ai/gemini/client";
import { isAiMode, type AiMessageRecord, type ChatRequestBody } from "@/lib/labdex-ai/types";

export const dynamic = "force-dynamic";

const TITLE_MAX_LENGTH = 60;
const HISTORY_LIMIT = 20;

async function untypedClient(): Promise<SupabaseClient> {
  // Las tablas de LABDEX AI (ai_conversations/ai_messages), igual que las
  // tablas de contenido y de laboratorio, no están en el genérico
  // `Database` de lib/supabase/types.ts (ver comentario allí). El cliente
  // sigue siendo el de la sesión del usuario: RLS se aplica igual.
  return (await createTypedClient()) as unknown as SupabaseClient;
}

function buildTitle(message: string): string {
  const trimmed = message.trim().replace(/\s+/g, " ");
  if (trimmed.length <= TITLE_MAX_LENGTH) return trimmed;
  return `${trimmed.slice(0, TITLE_MAX_LENGTH).trim()}…`;
}

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: NextRequest) {
  const { user } = await getSession();
  if (!user) {
    return errorResponse("Debes iniciar sesión para usar LABDEX AI.", 401);
  }

  let body: ChatRequestBody;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Cuerpo de la petición inválido.", 400);
  }

  if (!isAiMode(body.mode)) {
    return errorResponse("Modo de LABDEX AI inválido.", 400);
  }
  if (typeof body.message !== "string" || !body.message.trim()) {
    return errorResponse("El mensaje no puede estar vacío.", 400);
  }

  const supabase = await untypedClient();

  const rateLimit = await checkRateLimit(supabase, user.id);
  if (!rateLimit.allowed) {
    return errorResponse(
      "Has enviado demasiados mensajes en poco tiempo. Espera un momento antes de continuar.",
      429
    );
  }

  // 1. Resolver conversación (existente o nueva) -----------------------------
  let conversationId = body.conversationId ?? null;
  let history: AiMessageRecord[] = [];

  if (conversationId) {
    const { data: conversation, error: conversationError } = await supabase
      .from("ai_conversations")
      .select("id, mode")
      .eq("id", conversationId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (conversationError) {
      console.error("[labdex-ai:chat] fetch conversation", conversationError.message);
      return errorResponse("No se pudo acceder a la conversación.", 500);
    }
    if (!conversation) {
      return errorResponse("La conversación no existe o no te pertenece.", 404);
    }

    const { data: previousMessages, error: messagesError } = await supabase
      .from("ai_messages")
      .select("id, conversation_id, role, content, sources, used_general_knowledge, created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(HISTORY_LIMIT);

    if (messagesError) {
      console.error("[labdex-ai:chat] fetch messages", messagesError.message);
      return errorResponse("No se pudo acceder al historial de la conversación.", 500);
    }

    history = ((previousMessages ?? []) as AiMessageRecord[]).slice().reverse();
  } else {
    const { data: newConversation, error: createError } = await supabase
      .from("ai_conversations")
      .insert({
        user_id: user.id,
        mode: body.mode,
        title: buildTitle(body.message),
      })
      .select("id")
      .single();

    if (createError || !newConversation) {
      console.error("[labdex-ai:chat] create conversation", createError?.message);
      return errorResponse("No se pudo crear la conversación.", 500);
    }
    conversationId = newConversation.id as string;
  }

  // 2. Persistir el mensaje del usuario ---------------------------------------
  const { error: insertUserMessageError } = await supabase.from("ai_messages").insert({
    conversation_id: conversationId,
    user_id: user.id,
    role: "user",
    content: body.message.trim(),
  });

  if (insertUserMessageError) {
    console.error("[labdex-ai:chat] insert user message", insertUserMessageError.message);
    return errorResponse("No se pudo guardar tu mensaje.", 500);
  }

  // 3. Generar la respuesta -----------------------------------------------------
  try {
    const answer = await generateLabdexAiAnswer({
      mode: body.mode,
      message: body.message,
      history,
      ficheContext: body.ficheContext ?? null,
    });

    const { data: assistantMessage, error: insertAssistantError } = await supabase
      .from("ai_messages")
      .insert({
        conversation_id: conversationId,
        user_id: user.id,
        role: "assistant",
        content: answer.content,
        sources: answer.sources,
        used_general_knowledge: answer.usedGeneralKnowledge,
      })
      .select("id, created_at")
      .single();

    if (insertAssistantError || !assistantMessage) {
      console.error("[labdex-ai:chat] insert assistant message", insertAssistantError?.message);
      return errorResponse("La respuesta se generó pero no se pudo guardar.", 500);
    }

    return NextResponse.json({
      conversationId,
      message: {
        id: assistantMessage.id,
        role: "assistant" as const,
        content: answer.content,
        sources: toClientSources(answer.sources),
        usedGeneralKnowledge: answer.usedGeneralKnowledge,
        createdAt: assistantMessage.created_at,
      },
    });
  } catch (err) {
    if (err instanceof LabdexAiUserError) {
      return errorResponse(err.message, err.status);
    }
    if (err instanceof GeminiNotConfiguredError) {
      return errorResponse("LABDEX AI todavía no está configurado (falta GEMINI_API_KEY).", 503);
    }
    if (err instanceof GeminiTimeoutError) {
      return errorResponse("Gemini tardó demasiado en responder. Inténtalo de nuevo.", 504);
    }
    if (err instanceof GeminiRequestError) {
      return errorResponse("Gemini no está disponible en este momento. Inténtalo de nuevo más tarde.", 502);
    }
    console.error("[labdex-ai:chat] unexpected error", err);
    return errorResponse("Ocurrió un error inesperado en LABDEX AI.", 500);
  }
}
