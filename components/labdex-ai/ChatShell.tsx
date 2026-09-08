"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SendHorizonal } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ModeSelector } from "@/components/labdex-ai/ModeSelector";
import { MessageBubble, type ChatMessageViewModel } from "@/components/labdex-ai/MessageBubble";
import { GENERAL_SUGGESTED_QUESTIONS, buildFicheSuggestedQuestions } from "@/lib/labdex-ai/suggestedQuestions";
import type { AiMode, LabdexSourceType } from "@/lib/labdex-ai/types";

interface ChatShellProps {
  conversationId?: string;
  initialMode?: AiMode;
  initialMessages?: ChatMessageViewModel[];
}

interface FicheQueryContext {
  sourceType: LabdexSourceType;
  slug: string;
  title: string;
}

function readFicheContext(searchParams: URLSearchParams): FicheQueryContext | null {
  const sourceType = searchParams.get("sourceType") as LabdexSourceType | null;
  const slug = searchParams.get("slug");
  const title = searchParams.get("title");
  if (!sourceType || !slug) return null;
  return { sourceType, slug, title: title ?? slug };
}

export function ChatShell({ conversationId: initialConversationId, initialMode, initialMessages }: ChatShellProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const ficheContext = !initialConversationId ? readFicheContext(searchParams) : null;

  const [conversationId, setConversationId] = useState<string | undefined>(initialConversationId);
  const [mode, setMode] = useState<AiMode>(initialMode ?? "general");
  const [messages, setMessages] = useState<ChatMessageViewModel[]>(initialMessages ?? []);
  const [input, setInput] = useState<string>(() => {
    if (!ficheContext) return "";
    const askParam = searchParams.get("ask");
    if (askParam) return askParam;
    const [firstQuestion] = buildFicheSuggestedQuestions(ficheContext.sourceType, ficheContext.title);
    return firstQuestion ?? "";
  });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messageIdCounter = useRef(0);

  function nextLocalId(prefix: string): string {
    messageIdCounter.current += 1;
    return `local-${prefix}-${messageIdCounter.current}`;
  }

  useEffect(() => {
    // Foco imperativo únicamente: la acción "Consultar LABDEX AI" ya deja
    // la pregunta lista en el textarea (calculada en el useState de arriba,
    // no aquí), así que este efecto solo mueve el foco del navegador.
    if (ficheContext) {
      textareaRef.current?.focus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    setError(null);
    setSending(true);
    setInput("");

    const userMessage: ChatMessageViewModel = {
      id: nextLocalId("user"),
      role: "user",
      content: trimmed,
    };
    const pendingMessage: ChatMessageViewModel = {
      id: nextLocalId("pending"),
      role: "assistant",
      content: "",
      pending: true,
    };
    setMessages((prev) => [...prev, userMessage, pendingMessage]);

    try {
      const res = await fetch("/api/labdex-ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: conversationId ?? null,
          mode,
          message: trimmed,
          ficheContext:
            !conversationId && ficheContext
              ? { sourceType: ficheContext.sourceType, slug: ficheContext.slug }
              : null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Ocurrió un error al generar la respuesta.");
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === pendingMessage.id
            ? {
                id: data.message.id,
                role: "assistant",
                content: data.message.content,
                sources: data.message.sources,
                usedGeneralKnowledge: data.message.usedGeneralKnowledge,
              }
            : m
        )
      );

      if (!conversationId && data.conversationId) {
        setConversationId(data.conversationId);
        router.replace(`/labdex-ai/${data.conversationId}`, { scroll: false });
      }
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== pendingMessage.id));
      setError(err instanceof Error ? err.message : "Ocurrió un error inesperado.");
    } finally {
      setSending(false);
    }
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    sendMessage(input);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage(input);
    }
  }

  const suggestions = ficheContext
    ? buildFicheSuggestedQuestions(ficheContext.sourceType, ficheContext.title)
    : GENERAL_SUGGESTED_QUESTIONS;

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-6">
        <ModeSelector value={mode} onChange={setMode} disabled={messages.length > 0} />
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        {messages.length === 0 ? (
          <div className="mx-auto flex max-w-xl flex-col items-center gap-4 pt-10 text-center">
            <h2 className="text-lg font-semibold text-text">
              {ficheContext ? `Pregunta sobre ${ficheContext.title}` : "¿En qué te ayudo hoy?"}
            </h2>
            <p className="text-sm text-text-muted">
              LABDEX AI responde priorizando siempre el contenido oficial de LABDEX.
            </p>
            <div className="flex flex-col gap-2 sm:w-full">
              {suggestions.map((question) => (
                <button
                  key={question}
                  type="button"
                  onClick={() => sendMessage(question)}
                  className="rounded-md border border-border bg-surface px-3.5 py-2.5 text-left text-sm text-text-muted transition-colors hover:border-accent hover:text-text"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto flex max-w-2xl flex-col gap-5">
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="mx-4 mb-2 rounded-md bg-danger-soft px-3 py-2 text-sm text-danger sm:mx-6">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="border-t border-border p-4 sm:p-6">
        <div className="mx-auto flex max-w-2xl items-end gap-2 rounded-lg border border-border bg-surface p-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder="Pregunta sobre microbiología, análisis, pruebas o procedimientos…"
            disabled={sending}
            className="max-h-40 min-h-10 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm text-text placeholder:text-text-faint outline-none disabled:opacity-60"
          />
          <Button type="submit" size="sm" loading={sending} disabled={!input.trim()} aria-label="Enviar mensaje">
            <SendHorizonal className="size-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}
