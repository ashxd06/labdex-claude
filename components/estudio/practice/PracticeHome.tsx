"use client";

import { useEffect, useState } from "react";
import { BrainCircuit, ListChecks, GraduationCap, History } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";

interface ProgressResponse {
  flashcards: { total: number; studied: number };
  questions: { total: number; answered: number; correct: number; incorrect: number };
  exams: { completed: number; bestScore: number | null };
  lastStudiedAt: string | null;
}

interface AttemptSummary {
  id: string;
  mode: "practica" | "examen" | "repaso_errores";
  totalQuestions: number;
  correctCount: number;
  scorePercent: number;
  status: "en_progreso" | "finalizado";
  startedAt: string;
}

const MODE_LABELS: Record<AttemptSummary["mode"], string> = {
  practica: "Práctica",
  examen: "Examen",
  repaso_errores: "Repaso de errores",
};

export function PracticeHome({
  materialId,
  onSelect,
}: {
  materialId: string;
  onSelect: (view: "flashcards" | "practica" | "examen") => void;
}) {
  const [progress, setProgress] = useState<ProgressResponse | null>(null);
  const [history, setHistory] = useState<AttemptSummary[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [progressRes, historyRes] = await Promise.all([
        fetch(`/api/estudio/materials/${materialId}/progress`).then((r) => (r.ok ? r.json() : null)),
        fetch(`/api/estudio/materials/${materialId}/attempts`).then((r) => (r.ok ? r.json() : null)),
      ]);
      if (cancelled) return;
      if (progressRes) setProgress(progressRes);
      if (historyRes) setHistory(historyRes.attempts.filter((a: AttemptSummary) => a.status === "finalizado"));
    })();
    return () => {
      cancelled = true;
    };
  }, [materialId]);

  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <PracticeCard
          icon={BrainCircuit}
          title="Flashcards"
          description="Repasa conceptos importantes."
          actionLabel="Empezar"
          onClick={() => onSelect("flashcards")}
        />
        <PracticeCard
          icon={ListChecks}
          title="Preguntas"
          description="Practica lo aprendido."
          actionLabel="Practicar"
          onClick={() => onSelect("practica")}
        />
        <PracticeCard
          icon={GraduationCap}
          title="Modo examen"
          description="Pon a prueba tus conocimientos."
          actionLabel="Comenzar examen"
          onClick={() => onSelect("examen")}
        />
      </div>

      {progress && (
        <Card>
          <CardBody>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-text">Progreso</h3>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <ProgressStat
                label="Flashcards"
                value={`${progress.flashcards.studied} / ${progress.flashcards.total || 0}`}
              />
              <ProgressStat label="Preguntas respondidas" value={String(progress.questions.answered)} />
              <ProgressStat label="Exámenes" value={String(progress.exams.completed)} />
              <ProgressStat
                label="Mejor resultado"
                value={progress.exams.bestScore !== null ? `${progress.exams.bestScore}%` : "—"}
              />
            </div>
          </CardBody>
        </Card>
      )}

      {history && history.length > 0 && (
        <div>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-text">
            <History className="size-4 text-accent" aria-hidden="true" />
            Historial
          </h3>
          <div className="flex flex-col gap-2">
            {history.slice(0, 8).map((attempt) => (
              <div
                key={attempt.id}
                className="flex items-center justify-between rounded-md border border-border bg-surface px-4 py-2.5 text-sm"
              >
                <div>
                  <span className="font-medium text-text">{MODE_LABELS[attempt.mode]}</span>
                  <span className="ml-2 text-text-faint">
                    {new Date(attempt.startedAt).toLocaleDateString("es", { day: "2-digit", month: "2-digit", year: "numeric" })}
                  </span>
                </div>
                <span className="font-medium text-text">{attempt.scorePercent}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PracticeCard({
  icon: Icon,
  title,
  description,
  actionLabel,
  onClick,
}: {
  icon: typeof BrainCircuit;
  title: string;
  description: string;
  actionLabel: string;
  onClick: () => void;
}) {
  return (
    <Card>
      <CardBody className="flex flex-col gap-3">
        <Icon className="size-6 text-accent" aria-hidden="true" />
        <div>
          <h3 className="text-sm font-semibold text-text">{title}</h3>
          <p className="mt-0.5 text-sm text-text-muted">{description}</p>
        </div>
        <Button size="sm" variant="secondary" onClick={onClick} className="mt-1 self-start">
          {actionLabel}
        </Button>
      </CardBody>
    </Card>
  );
}

function ProgressStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-text-faint">{label}</p>
      <p className="mt-0.5 text-lg font-semibold text-text">{value}</p>
    </div>
  );
}
