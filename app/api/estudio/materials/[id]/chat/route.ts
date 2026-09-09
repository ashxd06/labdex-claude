import { NextResponse, type NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSession } from "@/lib/auth/getSession";
import { estudioClient } from "@/lib/estudio/shared";
import { checkRateLimit } from "@/lib/labdex-ai/rateLimit";
import { generateMaterialAnswer, MaterialChatUserError } from "@/lib/estudio/chat";
import {
  GeminiNotConfiguredError,
  GeminiRequestError,
  GeminiTimeoutError,
} from "@/lib/labdex-ai/gemini/client";
import { toMaterialContent, type StudyMaterialRecord } from "@/lib/estudio/types";
import type { AiMessageRecord } from "@/lib/labdex-ai/types";

export const dynamic = "force-dynamic";

const TITLE_MAX_LENGTH = 60;
const HISTORY_LIMIT = 20;

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function buildTitle(message: string): string {
  const trimmed = message.trim().replace(/\s+/g, " ");
  if (trimmed.length <= TITLE_MAX_LENGTH) return trimmed;
  return `${trimmed.slice(0, TITLE_MAX_LENGTH).trim()}…`;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: materialId } = await params;
  const { user } = await getSession();
  if (!user) {
    return errorResponse("Debes iniciar sesión para usar el chat del material.", 401);
  }

  let body: { conversationId?: string | null; message?: string };
  try {
    body = await request.json();
  } catch {
    return errorResponse("Cuerpo de la petición inválido.", 400);
  }

  if (typeof body.message !== "string" || !body.message.trim()) {
    return errorResponse("El mensaje no puede estar vacío.", 400);
  }

  const supabase = (await estudioClient()) as SupabaseClient;

  // 1. Verificar que el material existe, pertenece al usuario y está listo ----
  const { data: materialRow, error: materialError } = await supabase
    .from("study_materials")
    .select("*")
    .eq("id", materialId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (materialError) {
    console.error("[estudio:chat] fetch material", materialError.message);
    return errorResponse("No se pudo acceder al material.", 500);
  }
  if (!materialRow) {
    return errorResponse("El material no existe o no te pertenece.", 404);
  }

  const material = materialRow as unknown as StudyMaterialRecord;
  const materialContent = toMaterialContent(material);
  if (!materialContent) {
    return errorResponse("Este material todavía no está listo para responder preguntas.", 409);
  }

  const rateLimit = await checkRateLimit(supabase, user.id);
  if (!rateLimit.allowed) {
    return errorResponse(
      "Has enviado demasiados mensajes en poco tiempo. Espera un momento antes de continuar.",
      429
    );
  }

  // 2. Resolver conversación (existente o nueva), ligada a este material ------
  let conversationId = body.conversationId ?? null;
  let history: AiMessageRecord[] = [];

  if (conversationId) {
    const { data: conversation, error: conversationError } = await supabase
      .from("ai_conversations")
      .select("id, study_material_id")
      .eq("id", conversationId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (conversationError) {
      console.error("[estudio:chat] fetch conversation", conversationError.message);
      return errorResponse("No se pudo acceder a la conversación.", 500);
    }
    if (!conversation || conversation.study_material_id !== materialId) {
      return errorResponse("La conversación no existe o no pertenece a este material.", 404);
    }

    const { data: previousMessages, error: messagesError } = await supabase
      .from("ai_messages")
      .select("id, conversation_id, role, content, sources, used_general_knowledge, created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(HISTORY_LIMIT);

    if (messagesError) {
      console.error("[estudio:chat] fetch messages", messagesError.message);
      return errorResponse("No se pudo acceder al historial de la conversación.", 500);
    }

    history = ((previousMessages ?? []) as AiMessageRecord[]).slice().reverse();
  } else {
    const { data: newConversation, error: createError } = await supabase
      .from("ai_conversations")
      .insert({
        user_id: user.id,
        mode: "estudio",
        study_material_id: materialId,
        title: buildTitle(body.message),
      })
      .select("id")
      .single();

    if (createError || !newConversation) {
      console.error("[estudio:chat] create conversation", createError?.message);
      return errorResponse("No se pudo crear la conversación.", 500);
    }
    conversationId = newConversation.id as string;
  }

  // 3. Persistir el mensaje del usuario -----------------------------------------
  const { error: insertUserMessageError } = await supabase.from("ai_messages").insert({
    conversation_id: conversationId,
    user_id: user.id,
    role: "user",
    content: body.message.trim(),
  });

  if (insertUserMessageError) {
    console.error("[estudio:chat] insert user message", insertUserMessageError.message);
    return errorResponse("No se pudo guardar tu mensaje.", 500);
  }

  // 4. Generar la respuesta ------------------------------------------------------
  try {
    const answer = await generateMaterialAnswer({
      message: body.message,
      history,
      materialTitle: material.title,
      materialContent,
    });

    const { data: assistantMessage, error: insertAssistantError } = await supabase
      .from("ai_messages")
      .insert({
        conversation_id: conversationId,
        user_id: user.id,
        role: "assistant",
        content: answer.content,
        sources: [],
        used_general_knowledge: answer.citedPages.length === 0,
      })
      .select("id, created_at")
      .single();

    if (insertAssistantError || !assistantMessage) {
      console.error("[estudio:chat] insert assistant message", insertAssistantError?.message);
      return errorResponse("La respuesta se generó pero no se pudo guardar.", 500);
    }

    await supabase.from("study_materials").update({ last_studied_at: new Date().toISOString() }).eq("id", materialId);

    return NextResponse.json({
      conversationId,
      message: {
        id: assistantMessage.id,
        role: "assistant" as const,
        content: answer.content,
        citedPages: answer.citedPages,
        createdAt: assistantMessage.created_at,
      },
    });
  } catch (err) {
    if (err instanceof MaterialChatUserError) {
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
    console.error("[estudio:chat] unexpected error", err);
    return errorResponse("Ocurrió un error inesperado.", 500);
  }
}
