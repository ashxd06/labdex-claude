"use client";

import { useState } from "react";
import { BookOpenText, Dumbbell, MessagesSquare } from "lucide-react";
import {
  ProcessingNotesBanner,
  SummaryCard,
  KeyConceptsCard,
  MustRememberCard,
  ExplanationCard,
} from "@/components/estudio/StudySections";
import { MaterialChat } from "@/components/estudio/MaterialChat";
import { PracticeTab } from "@/components/estudio/practice/PracticeTab";
import type { StudyMaterialContent } from "@/lib/estudio/types";

type Tab = "comprender" | "practicar" | "chat";

const TABS: { id: Tab; label: string; icon: typeof BookOpenText }[] = [
  { id: "comprender", label: "Comprender", icon: BookOpenText },
  { id: "practicar", label: "Practicar", icon: Dumbbell },
  { id: "chat", label: "Chat", icon: MessagesSquare },
];

/**
 * Navegación por pestañas dentro del Espacio de Estudio (Fase 6.1, §3):
 * antes de esta fase, el resumen/conceptos y el chat se mostraban siempre
 * juntos en dos columnas. Ahora "Comprender" (Fase 6.0) y "Chat" (Fase 6.0)
 * son pestañas junto a la nueva "Practicar" (Fase 6.1), sin duplicar
 * ninguno de los dos componentes existentes.
 */
export function MaterialWorkspaceTabs({
  materialId,
  content,
}: {
  materialId: string;
  content: StudyMaterialContent;
}) {
  const [tab, setTab] = useState<Tab>("comprender");

  return (
    <div>
      <div className="flex gap-1 border-b border-border" role="tablist">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === id
                ? "border-accent text-accent"
                : "border-transparent text-text-muted hover:text-text"
            }`}
          >
            <Icon className="size-4" aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "comprender" && (
          <div className="flex flex-col gap-6">
            <ProcessingNotesBanner notes={content.processingNotes} />
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <SummaryCard summary={content.summary} />
              <KeyConceptsCard keyConcepts={content.keyConcepts} />
              <MustRememberCard mustRemember={content.mustRemember} />
              <ExplanationCard explanation={content.simpleExplanation} />
            </div>
          </div>
        )}

        {tab === "practicar" && <PracticeTab materialId={materialId} />}

        {tab === "chat" && (
          <div className="max-w-2xl">
            <MaterialChat materialId={materialId} />
          </div>
        )}
      </div>
    </div>
  );
}
