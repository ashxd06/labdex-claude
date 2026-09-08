"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, MessageSquare, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface ConversationSummary {
  id: string;
  title: string;
  mode: string;
  updated_at: string;
}

export function ConversationSidebar({ activeId }: { activeId?: string }) {
  const router = useRouter();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/labdex-ai/conversations");
      if (!res.ok) return;
      const data = await res.json();
      setConversations(data.conversations ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, activeId]);

  async function handleDelete(id: string, event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    const confirmed = window.confirm("¿Eliminar esta conversación? Esta acción no se puede deshacer.");
    if (!confirmed) return;

    await fetch(`/api/labdex-ai/conversations/${id}`, { method: "DELETE" });
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (id === activeId) {
      router.push("/labdex-ai");
    }
  }

  return (
    <aside className="hidden w-64 shrink-0 flex-col gap-3 border-r border-border px-3 py-4 md:flex">
      <Link href="/labdex-ai" className="w-full">
        <Button variant="secondary" size="sm" fullWidth className="justify-center gap-2">
          <Plus className="size-4" />
          Nueva conversación
        </Button>
      </Link>

      <div className="flex flex-col gap-0.5 overflow-y-auto">
        {loading && <p className="px-2 py-1 text-xs text-text-faint">Cargando…</p>}
        {!loading && conversations.length === 0 && (
          <p className="px-2 py-1 text-xs text-text-faint">Aún no tienes conversaciones.</p>
        )}
        {conversations.map((conversation) => (
          <Link
            key={conversation.id}
            href={`/labdex-ai/${conversation.id}`}
            className={`group flex items-center gap-2 rounded-md px-2.5 py-2 text-sm transition-colors
              ${conversation.id === activeId ? "bg-surface-2 text-text" : "text-text-muted hover:bg-surface-2 hover:text-text"}`}
          >
            <MessageSquare className="size-3.5 shrink-0" aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate">{conversation.title}</span>
            <button
              type="button"
              onClick={(event) => handleDelete(conversation.id, event)}
              aria-label="Eliminar conversación"
              className="shrink-0 rounded p-1 text-text-faint opacity-0 transition-opacity hover:text-danger group-hover:opacity-100"
            >
              <Trash2 className="size-3.5" />
            </button>
          </Link>
        ))}
      </div>
    </aside>
  );
}
