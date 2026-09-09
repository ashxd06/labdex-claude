"use client";

import { useState } from "react";
import { HelpCircle } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Markdown } from "@/components/labdex-ai/Markdown";

/**
 * Botón "¿Cómo se usa?" que abre la guía rápida en un modal (Fase 5.1,
 * §15). Reutiliza el Modal existente y el renderizador de Markdown ya
 * creado para LABDEX AI, en vez de duplicar componentes.
 */
export function GuideModal({ title, content }: { title: string; content: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm font-medium text-text-muted transition-colors hover:border-accent hover:text-accent"
      >
        <HelpCircle className="size-3.5" aria-hidden="true" />
        Guía rápida
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={title}>
        <Markdown content={content} />
      </Modal>
    </>
  );
}
