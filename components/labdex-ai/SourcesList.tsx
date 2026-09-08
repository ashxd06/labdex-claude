"use client";

import Link from "next/link";
import { BookOpenCheck, Sparkles, ExternalLink } from "lucide-react";
import type { ClientSource } from "@/lib/labdex-ai/citations";

const TYPE_LABELS: Record<ClientSource["sourceType"], string> = {
  microorganism: "Microbiología",
  culture_media: "Medios de cultivo",
  test: "Pruebas de laboratorio",
  procedure: "Procedimientos",
  analysis: "Análisis clínicos",
  document: "Documentos",
};

/**
 * Muestra las fuentes oficiales de LABDEX usadas en una respuesta, o el
 * aviso de que se usó conocimiento general cuando no hubo ninguna
 * (Fase 5, §6-7). Diferencia visualmente ambos casos.
 */
export function SourcesList({
  sources,
  usedGeneralKnowledge,
}: {
  sources: ClientSource[];
  usedGeneralKnowledge: boolean;
}) {
  if (sources.length === 0) {
    return (
      <div className="mt-2 flex items-start gap-2 rounded-md border border-warning-soft bg-warning-soft/40 px-3 py-2 text-xs text-warning">
        <Sparkles className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
        <span>Información general generada por IA. No corresponde necesariamente a contenido oficial de LABDEX.</span>
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-md border border-border bg-surface-2/60 p-3">
      <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-text-faint">
        <BookOpenCheck className="size-3.5 text-accent" aria-hidden="true" />
        Fuentes LABDEX
      </p>
      <ul className="mt-2 flex flex-col gap-1.5">
        {sources.map((source) => (
          <li key={`${source.sourceType}-${source.sourceId}`}>
            <Link
              href={source.url}
              target="_blank"
              className="group flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm text-text transition-colors hover:bg-surface-2"
            >
              <span className="flex flex-col">
                <span className="font-medium uppercase tracking-wide">{source.title}</span>
                <span className="text-xs text-text-faint">
                  {source.category ? `${TYPE_LABELS[source.sourceType]} · ${source.category}` : TYPE_LABELS[source.sourceType]}
                </span>
              </span>
              <ExternalLink className="size-3.5 shrink-0 text-text-faint group-hover:text-accent" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
      {usedGeneralKnowledge && (
        <p className="mt-2 text-xs text-text-faint">
          Parte de esta respuesta también incluye información general de IA.
        </p>
      )}
    </div>
  );
}
