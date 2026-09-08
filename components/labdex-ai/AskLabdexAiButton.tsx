import Link from "next/link";
import { Sparkles } from "lucide-react";
import type { LabdexSourceType } from "@/lib/labdex-ai/types";

/**
 * Acción "Consultar LABDEX AI" en las fichas públicas (Fase 5, §10).
 *
 * Solo se pasa `sourceType`/`slug`/`title` por la URL; el contenido real de
 * la ficha se recupera en el servidor (`retrieveFicheContext`) cuando se
 * envíe el primer mensaje, para no duplicar la ficha completa en el
 * cliente.
 */
export function AskLabdexAiButton({
  sourceType,
  slug,
  title,
}: {
  sourceType: LabdexSourceType;
  slug: string;
  title: string;
}) {
  const href = `/labdex-ai?${new URLSearchParams({ sourceType, slug, title }).toString()}`;

  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 rounded-md border border-accent/40 bg-accent-soft px-3 py-1.5 text-sm font-medium text-accent transition-colors hover:bg-accent hover:text-white"
    >
      <Sparkles className="size-3.5" aria-hidden="true" />
      Consultar LABDEX AI
    </Link>
  );
}
