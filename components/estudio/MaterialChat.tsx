"use client";

import { useEffect, useRef, useState } from "react";
import { SendHorizonal, Sparkles, User, BookOpenCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Markdown } from "@/components/labdex-ai/Markdown";

interface ChatMessageViewModel {
  id: string;
  role: "user" | "assistant";
  content: string;
  citedPages?: number[];
  pending?: boolean;
}

/**
 * "Pregúntale a tu material" (Fase 6, §18). Estructuralmente es un primo
 * del `ChatShell` de LABDEX AI (Fase 5), pero sin selector de modo (el
 * modo "estudio" queda fijo) y citando páginas del propio material en vez
 * de fichas públicas de LABDEX.
 */
export function MaterialChat({ materialId }: { materialId: string }) {
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);
  const [messages, setMessages] = useState<ChatMessageViewModel[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const idCounter = useRef(0);

  function nextId(prefix: string): string {
    idCounter.current += 1;
    return `local-${prefix}-${idCounter.current}`;
  }

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    setError(null);
    setSending(true);
    setInput("");

    const userMessage: ChatMessageViewModel = { id: nextId("user"), role: "user", content: trimmed };
    const pending: ChatMessageViewModel = { id: nextId("pending"), role: "assistant", content: "", pending: true };
    setMessages((prev) => [...prev, userMessage, pending]);

    try {
      const res = await fetch(`/api/estudio/materials/${materialId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: conversationId ?? null, message: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Ocurrió un error al generar la respuesta.");

      setMessages((prev) =>
        prev.map((m) =>
          m.id === pending.id
            ? {
                id: data.message.id,
                role: "assistant",
                content: data.message.content,
                citedPages: data.message.citedPages,
              }
            : m
        )
      );

      if (!conversationId && data.conversationId) {
        setConversationId(data.conversationId);
      }
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== pending.id));
      setError(err instanceof Error ? err.message : "Ocurrió un error inesperado.");
    } finally {
      setSending(false);
    }
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    sendMessage(input);
  }

  return (
    <div className="flex h-[520px] flex-col overflow-hidden rounded-lg border border-border bg-surface">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <p className="text-sm font-medium text-text">Pregúntale a tu material</p>
            <p className="max-w-xs text-xs text-text-muted">
              Pregunta lo que quieras sobre este documento: LABDEX responde priorizando el contenido
              que subiste.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {messages.map((message) => {
              const isUser = message.role === "user";
              return (
                <div key={message.id} className={`flex gap-2.5 ${isUser ? "flex-row-reverse" : ""}`}>
                  <span
                    className={`flex size-6 shrink-0 items-center justify-center rounded-full ${
                      isUser ? "bg-primary-soft text-primary" : "bg-accent-soft text-accent"
                    }`}
                    aria-hidden="true"
                  >
                    {isUser ? <User className="size-3" /> : <Sparkles className="size-3" />}
                  </span>
                  <div className={`flex max-w-[85%] flex-col ${isUser ? "items-end" : "items-start"}`}>
                    <div
                      className={`rounded-lg px-3.5 py-2.5 text-sm ${
                        isUser ? "bg-primary text-white" : "border border-border bg-bg text-text"
                      }`}
                    >
                      {isUser ? (
                        <p className="whitespace-pre-line">{message.content}</p>
                      ) : message.pending ? (
                        <span className="flex items-center gap-1.5 text-text-muted">
                          <span className="flex gap-1">
                            <span className="size-1.5 animate-bounce rounded-full bg-text-faint [animation-delay:-0.3s]" />
                            <span className="size-1.5 animate-bounce rounded-full bg-text-faint [animation-delay:-0.15s]" />
                            <span className="size-1.5 animate-bounce rounded-full bg-text-faint" />
                          </span>
                          Pensando…
                        </span>
                      ) : (
                        <Markdown content={message.content} />
                      )}
                    </div>
                    {!isUser && !message.pending && message.citedPages && message.citedPages.length > 0 && (
                      <p className="mt-1 flex items-center gap-1 text-xs text-text-faint">
                        <BookOpenCheck className="size-3" aria-hidden="true" />
                        Según tu material, p. {message.citedPages.join(", ")}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {error && <div className="mx-3 mb-2 rounded-md bg-danger-soft px-3 py-2 text-xs text-danger">{error}</div>}

      <form onSubmit={handleSubmit} className="border-t border-border p-3">
        <div className="flex items-end gap-2 rounded-lg border border-border bg-bg p-1.5">
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                sendMessage(input);
              }
            }}
            rows={1}
            placeholder="Escribe una pregunta sobre este material…"
            disabled={sending}
            className="max-h-32 min-h-9 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm text-text placeholder:text-text-faint outline-none disabled:opacity-60"
          />
          <Button type="submit" size="sm" loading={sending} disabled={!input.trim()} aria-label="Enviar mensaje">
            <SendHorizonal className="size-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}
