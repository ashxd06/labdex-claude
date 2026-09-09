import { AlertTriangle, BookMarked, Lightbulb, ListChecks, NotebookText } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import type { StudyMaterialContent } from "@/lib/estudio/types";

function SectionHeader({ icon: Icon, title }: { icon: typeof BookMarked; title: string }) {
  return (
    <CardHeader className="flex items-center gap-2">
      <Icon className="size-4 text-accent" aria-hidden="true" />
      <h2 className="text-sm font-semibold uppercase tracking-wide text-text">{title}</h2>
    </CardHeader>
  );
}

export function ProcessingNotesBanner({ notes }: { notes: string[] }) {
  if (notes.length === 0) return null;
  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-warning-soft bg-warning-soft/40 p-4 text-sm text-warning">
      {notes.map((note, index) => (
        <p key={index} className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {note}
        </p>
      ))}
    </div>
  );
}

export function SummaryCard({ summary }: { summary: StudyMaterialContent["summary"] }) {
  return (
    <Card>
      <SectionHeader icon={NotebookText} title="Resumen" />
      <CardBody className="flex flex-col gap-4">
        {summary.length === 0 ? (
          <p className="text-sm text-text-muted">No se pudo generar un resumen para este material.</p>
        ) : (
          summary.map((section, index) => (
            <div key={index}>
              <h3 className="text-sm font-medium text-text">{section.heading}</h3>
              <p className="mt-1 text-sm leading-relaxed whitespace-pre-line text-text-muted">{section.content}</p>
            </div>
          ))
        )}
      </CardBody>
    </Card>
  );
}

export function KeyConceptsCard({ keyConcepts }: { keyConcepts: StudyMaterialContent["keyConcepts"] }) {
  return (
    <Card>
      <SectionHeader icon={BookMarked} title="Conceptos clave" />
      <CardBody>
        {keyConcepts.length === 0 ? (
          <p className="text-sm text-text-muted">No se detectaron conceptos clave en este material.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {keyConcepts.map((concept, index) => (
              <li key={index}>
                <p className="text-sm font-medium uppercase tracking-wide text-text">
                  {concept.term}
                  {concept.pages && <span className="ml-2 text-xs font-normal text-text-faint">p. {concept.pages}</span>}
                </p>
                <p className="mt-0.5 text-sm text-text-muted">{concept.definition}</p>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}

export function MustRememberCard({ mustRemember }: { mustRemember: StudyMaterialContent["mustRemember"] }) {
  return (
    <Card>
      <SectionHeader icon={ListChecks} title="Lo que debes recordar" />
      <CardBody>
        {mustRemember.length === 0 ? (
          <p className="text-sm text-text-muted">No se identificaron puntos destacados todavía.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {mustRemember.map((item, index) => (
              <li key={index} className="flex items-start gap-2 text-sm text-text">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />
                <span>
                  {item.text}
                  {item.pages && <span className="ml-1.5 text-xs text-text-faint">(p. {item.pages})</span>}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}

export function ExplanationCard({ explanation }: { explanation: string }) {
  return (
    <Card>
      <SectionHeader icon={Lightbulb} title="Explícame el tema" />
      <CardBody>
        <p className="text-sm leading-relaxed whitespace-pre-line text-text-muted">
          {explanation || "No se pudo generar una explicación para este material."}
        </p>
      </CardBody>
    </Card>
  );
}
