"use client";

import { useEffect, useState } from "react";
import { BrainCircuit, ListChecks, GraduationCap, History, Sparkles, Target } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

interface ProgressResponse {
  flashcards: { total: number; studied: number };
  questions: { total: number; answered: number; correct: number; incorrect: number };
  exams: { completed: number; bestScore: number | null };
  lastStudiedAt: string | null;
}

type MasteryLevel = "necesita_repaso" | "en_progreso" | "dominado";

interface TopicMastery {
  topic: string;
  timesAnswered: number;
  accuracyPercent: number;
  level: MasteryLevel | null;
  hasEnoughData: boolean;
}

interface Recommendation {
  topic: string;
  level: MasteryLevel;
  accuracyPercent: number;
  message: string;
  suggestedCount: number;
}

interface PerformanceResponse {
  hasEnoughData: boolean;
  totalAnswered: number;
  overallAccuracyPercent: number;
  topics: TopicMastery[];
  masteryCounts: { dominado: number; en_progreso: number; necesita_repaso: number };
  recommendations: Recommendation[];
}

interface AttemptSummary {
  id: string;
  mode: "practica" | "examen" | "repaso_errores" | "inteligente";
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
  inteligente: "Repaso inteligente",
};

const LEVEL_META: Record<MasteryLevel, { label: string; tone: "danger" | "warning" | "success"; dot: string }> = {
  necesita_repaso: { label: "Necesita repaso", tone: "danger", dot: "🔴" },
  en_progreso: { label: "En progreso", tone: "warning", dot: "🟡" },
  dominado: { label: "Dominado", tone: "success", dot: "🟢" },
};

// Mínimo de respuestas totales antes de mostrar cualquier análisis de
// dominio (Fase 6.2, §25-26): coincide con MIN_ANSWERS_FOR_SIGNAL del
// backend (lib/estudio/adaptive/mastery.ts); se repite aquí solo para el
// mensaje de "faltan N respuestas", no para decidir nada — la decisión real
// (`hasEnoughData`) siempre viene calculada del servidor.
const MIN_ANSWERS_FOR_SIGNAL = 5;

export function PracticeHome({
  materialId,
  onSelect,
}: {
  materialId: string;
  onSelect: (view: "flashcards" | "practica" | "examen" | "inteligente") => void;
}) {
  const [progress, setProgress] = useState<ProgressResponse | null>(null);
  const [performance, setPerformance] = useState<PerformanceResponse | null>(null);
  const [history, setHistory] = useState<AttemptSummary[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [progressRes, performanceRes, historyRes] = await Promise.all([
        fetch(`/api/estudio/materials/${materialId}/progress`).then((r) => (r.ok ? r.json() : null)),
        fetch(`/api/estudio/materials/${materialId}/performance`).then((r) => (r.ok ? r.json() : null)),
        fetch(`/api/estudio/materials/${materialId}/attempts`).then((r) => (r.ok ? r.json() : null)),
      ]);
      if (cancelled) return;
      if (progressRes) setProgress(progressRes);
      if (performanceRes) setPerformance(performanceRes);
      if (historyRes) setHistory(historyRes.attempts.filter((a: AttemptSummary) => a.status === "finalizado"));
    })();
    return () => {
      cancelled = true;
    };
  }, [materialId]);

  const topicsWithData = performance?.topics.filter((t) => t.hasEnoughData) ?? [];

  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
        <PracticeCard
          icon={Sparkles}
          title="Repaso inteligente"
          description="LABDEX elige qué practicar según tu historial."
          actionLabel="Empezar"
          onClick={() => onSelect("inteligente")}
        />
      </div>

      {performance && !performance.hasEnoughData && (
        <Card>
          <CardBody className="flex flex-col items-start gap-2">
            <p className="text-sm font-medium text-text">Todavía estamos conociendo tu forma de estudiar.</p>
            <p className="text-sm text-text-muted">
              Responde algunas preguntas más ({performance.totalAnswered} / {MIN_ANSWERS_FOR_SIGNAL}) para que LABDEX
              pueda identificar tus puntos fuertes y débiles.
            </p>
            <Button size="sm" variant="secondary" onClick={() => onSelect("practica")} className="mt-1">
              Practicar ahora
            </Button>
          </CardBody>
        </Card>
      )}

      {performance && performance.hasEnoughData && performance.recommendations.length > 0 && (
        <div>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-text">
            <Target className="size-4 text-accent" aria-hidden="true" />
            Recomendado para ti
          </h3>
          <div className="flex flex-col gap-2">
            {performance.recommendations.map((rec) => (
              <Card key={rec.topic}>
                <CardBody className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span aria-hidden="true">{LEVEL_META[rec.level].dot}</span>
                    <p className="text-sm text-text">{rec.message}</p>
                  </div>
                  <Button size="sm" onClick={() => onSelect("inteligente")}>
                    Empezar repaso
                  </Button>
                </CardBody>
              </Card>
            ))}
          </div>
        </div>
      )}

      {topicsWithData.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-text">Tus puntos débiles</h3>
          <div className="flex flex-col gap-2">
            {topicsWithData.map((topic) => (
              <div
                key={topic.topic}
                className="flex items-center justify-between rounded-md border border-border bg-surface px-4 py-2.5 text-sm"
              >
                <div className="flex items-center gap-2">
                  <span aria-hidden="true">{topic.level ? LEVEL_META[topic.level].dot : "⚪"}</span>
                  <span className="text-text">{topic.topic}</span>
                </div>
                <span className="font-medium text-text">{topic.accuracyPercent}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

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

            {performance && performance.hasEnoughData && (
              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4">
                <span className="text-xs text-text-faint">Dominio:</span>
                <Badge tone="success">Dominado {performance.masteryCounts.dominado}</Badge>
                <Badge tone="warning">En progreso {performance.masteryCounts.en_progreso}</Badge>
                <Badge tone="danger">Necesita repaso {performance.masteryCounts.necesita_repaso}</Badge>
              </div>
            )}
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
