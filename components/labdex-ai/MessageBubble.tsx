"use client";

import { useState } from "react";
import { Copy, Check, User, Sparkles } from "lucide-react";
import { Markdown } from "@/components/labdex-ai/Markdown";
import { SourcesList } from "@/components/labdex-ai/SourcesList";
import type { ClientSource } from "@/lib/labdex-ai/citations";

export interface ChatMessageViewModel {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: ClientSource[];
  usedGeneralKnowledge?: boolean;
  pending?: boolean;
}

export function MessageBubble({ message }: { message: ChatMessageViewModel }) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Si el portapapeles no está disponible, no interrumpimos el chat.
    }
  }

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      <span
        className={`flex size-7 shrink-0 items-center justify-center rounded-full ${
          isUser ? "bg-primary-soft text-primary" : "bg-accent-soft text-accent"
        }`}
        aria-hidden="true"
      >
        {isUser ? <User className="size-3.5" /> : <Sparkles className="size-3.5" />}
      </span>

      <div className={`group flex max-w-[85%] flex-col ${isUser ? "items-end" : "items-start"}`}>
        <div
          className={`rounded-lg px-4 py-3 ${
            isUser
              ? "bg-primary text-white"
              : "border border-border bg-surface text-text"
          }`}
        >
          {isUser ? (
            <p className="text-sm leading-relaxed whitespace-pre-line">{message.content}</p>
          ) : message.pending ? (
            <p className="flex items-center gap-1.5 text-sm text-text-muted">
              <span className="flex gap-1">
                <span className="size-1.5 animate-bounce rounded-full bg-text-faint [animation-delay:-0.3s]" />
                <span className="size-1.5 animate-bounce rounded-full bg-text-faint [animation-delay:-0.15s]" />
                <span className="size-1.5 animate-bounce rounded-full bg-text-faint" />
              </span>
              LABDEX AI está pensando…
            </p>
          ) : (
            <Markdown content={message.content} />
          )}
        </div>

        {!isUser && !message.pending && (
          <>
            <SourcesList
              sources={message.sources ?? []}
              usedGeneralKnowledge={Boolean(message.usedGeneralKnowledge)}
            />
            <button
              type="button"
              onClick={handleCopy}
              className="mt-1.5 flex items-center gap-1 text-xs text-text-faint opacity-0 transition-opacity hover:text-text group-hover:opacity-100"
            >
              {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
              {copied ? "Copiado" : "Copiar respuesta"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
