import { notFound } from "next/navigation";
import { FileText, AlertTriangle } from "lucide-react";
import { Breadcrumbs } from "@/components/content/Breadcrumbs";
import { Badge } from "@/components/ui/Badge";
import { Loading } from "@/components/ui/Loading";
import { OpenOriginalButton } from "@/components/estudio/OpenOriginalButton";
import { STATUS_LABELS, STATUS_TONES } from "@/components/estudio/statusMeta";
import {
  ProcessingNotesBanner,
  SummaryCard,
  KeyConceptsCard,
  MustRememberCard,
  ExplanationCard,
} from "@/components/estudio/StudySections";
import { MaterialChat } from "@/components/estudio/MaterialChat";
import { getSession } from "@/lib/auth/getSession";
import { estudioClient } from "@/lib/estudio/shared";
import { toMaterialContent, toSummaryView, type StudyMaterialRecord } from "@/lib/estudio/types";

export const dynamic = "force-dynamic";

async function loadMaterial(id: string, userId: string) {
  const supabase = await estudioClient();
  const { data } = await supabase
    .from("study_materials")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (!data) return null;
  const record = data as unknown as StudyMaterialRecord;
  return { material: toSummaryView(record), content: toMaterialContent(record) };
}

export default async function StudySpacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user } = await getSession();
  // El layout de /estudio ya exige sesión; se repite la comprobación por
  // tipos y como defensa adicional (Fase 6, §25).
  if (!user) notFound();

  const data = await loadMaterial(id, user.id);
  if (!data) notFound();

  const { material, content } = data;

  return (
    <div>
      <Breadcrumbs
        items={[{ label: "Inicio", href: "/" }, { label: "Estudio", href: "/estudio" }, { label: material.title }]}
      />

      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="size-5 text-accent" aria-hidden="true" />
            <h1 className="text-2xl font-semibold text-text">{material.title}</h1>
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-text-muted">
            <Badge tone={STATUS_TONES[material.status]}>{STATUS_LABELS[material.status]}</Badge>
            {material.pageCount && <span>{material.pageCount} páginas</span>}
            {material.truncated && <span className="text-warning">· procesado parcialmente</span>}
          </p>
        </div>

        <OpenOriginalButton materialId={material.id} />
      </div>

      {material.status === "error" && (
        <div className="mt-6 flex items-start gap-2 rounded-lg border border-danger/30 bg-danger-soft p-4 text-sm text-danger">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{material.errorMessage || "No pudimos procesar completamente este material."}</span>
        </div>
      )}

      {(material.status === "subiendo" || material.status === "procesando") && (
        <div className="mt-6">
          <Loading label="Este material todavía se está procesando…" />
        </div>
      )}

      {content && (
        <div className="mt-6 flex flex-col gap-6">
          <ProcessingNotesBanner notes={content.processingNotes} />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="flex flex-col gap-6">
              <SummaryCard summary={content.summary} />
              <KeyConceptsCard keyConcepts={content.keyConcepts} />
              <MustRememberCard mustRemember={content.mustRemember} />
              <ExplanationCard explanation={content.simpleExplanation} />
            </div>

            <div>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-text">
                Pregúntale a tu material
              </h2>
              <MaterialChat materialId={material.id} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
