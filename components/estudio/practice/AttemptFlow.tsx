"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, Sparkles, CheckCircle2, XCircle, RotateCcw, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { Loading } from "@/components/ui/Loading";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";

type AttemptMode = "practica" | "examen" | "repaso_errores";
type ExamDifficulty = "easy" | "normal" | "hard";

interface QuestionPromptView {
  id: string;
  question: string;
  options: string[];
  sourcePages: string | null;
  difficulty: ExamDifficulty;
}

interface QuestionRevealView extends QuestionPromptView {
  correctAnswerIndex: number;
  explanation: string;
}

interface AttemptSummary {
  id: string;
  mode: AttemptMode;
  totalQuestions: number;
  correctCount: number;
  incorrectCount: number;
  scorePercent: number;
  status: "en_progreso" | "finalizado";
  startedAt: string;
  finishedAt: string | null;
}

interface AnswerState {
  selectedIndex: number;
  correct?: boolean;
  reveal?: QuestionRevealView;
}

const COUNT_OPTIONS = [5, 10, 20];
const DIFFICULTY_LABELS: Record<ExamDifficulty, string> = { easy: "Fácil", normal: "Normal", hard: "Difícil" };

type Step = "setup" | "session" | "results" | "review";

/**
 * Componente compartido para los tres modos de práctica (Fase 6.1, §14 y
 * §16-21): "practica" (feedback inmediato), "examen" (sin feedback hasta el
 * final) y "repaso_errores" (feedback inmediato, arrancado directamente
 * desde un intento previo). El único cambio de comportamiento entre modos
 * es CUÁNDO se revela la respuesta correcta — la mecánica de navegación y
 * puntaje es la misma para no triplicar código.
 */
export function AttemptFlow({
  materialId,
  mode,
  onBack,
}: {
  materialId: string;
  mode: "practica" | "examen";
  onBack: () => void;
}) {
  const [step, setStep] = useState<Step>("setup");
  const [error, setError] = useState<string | null>(null);

  // Setup
  const [availableQuestions, setAvailableQuestions] = useState<number | null>(null);
  const [count, setCount] = useState(10);
  const [difficulty, setDifficulty] = useState<ExamDifficulty | "">("");
  const [generating, setGenerating] = useState(false);
  const [starting, setStarting] = useState(false);

  // Session
  const [attempt, setAttempt] = useState<AttemptSummary | null>(null);
  const [activeMode, setActiveMode] = useState<AttemptMode>(mode);
  const [questions, setQuestions] = useState<QuestionPromptView[]>([]);
  const [answers, setAnswers] = useState<Record<string, AnswerState>>({});
  const [current, setCurrent] = useState(0);
  const [confirmExit, setConfirmExit] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [finishing, setFinishing] = useState(false);

  // Review
  const [reviewItems, setReviewItems] = useState<
    | {
        question: QuestionPromptView;
        answer: { selectedIndex: number; isCorrect: boolean } | null;
        reveal: QuestionRevealView | null;
      }[]
    | null
  >(null);

  const loadAvailableQuestions = useCallback(async () => {
    try {
      const res = await fetch(`/api/estudio/materials/${materialId}/questions`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "No se pudieron cargar las preguntas.");
      setAvailableQuestions(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ocurrió un error inesperado.");
    }
  }, [materialId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/estudio/materials/${materialId}/questions`);
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) throw new Error(data?.error || "No se pudieron cargar las preguntas.");
        setAvailableQuestions(data.total);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Ocurrió un error inesperado.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [materialId]);

  async function handleGenerateQuestions() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch(`/api/estudio/materials/${materialId}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "No se pudieron generar preguntas.");
      await loadAvailableQuestions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ocurrió un error inesperado.");
    } finally {
      setGenerating(false);
    }
  }

  async function startAttempt(params: {
    mode: AttemptMode;
    count?: number;
    difficulty?: string;
    sourceAttemptId?: string;
  }) {
    setStarting(true);
    setError(null);
    try {
      const res = await fetch(`/api/estudio/materials/${materialId}/attempts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "No se pudo iniciar la sesión.");

      setAttempt(data.attempt);
      setActiveMode(data.attempt.mode);
      setQuestions(data.questions);
      setAnswers({});
      setCurrent(0);
      setReviewItems(null);
      setStep("session");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ocurrió un error inesperado.");
    } finally {
      setStarting(false);
    }
  }

  async function handleSelectOption(questionId: string, optionIndex: number) {
    if (answers[questionId] || submitting || !attempt) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/estudio/materials/${materialId}/attempts/${attempt.id}/answers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId, selectedIndex: optionIndex }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "No se pudo registrar tu respuesta.");

      setAnswers((prev) => ({
        ...prev,
        [questionId]: { selectedIndex: optionIndex, correct: data.correct, reveal: data.reveal },
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ocurrió un error inesperado.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleFinish() {
    if (!attempt) return;
    setFinishing(true);
    setError(null);
    try {
      const res = await fetch(`/api/estudio/materials/${materialId}/attempts/${attempt.id}/finish`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "No se pudo finalizar el intento.");
      setAttempt(data.attempt);
      setStep("results");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ocurrió un error inesperado.");
    } finally {
      setFinishing(false);
    }
  }

  async function loadReview() {
    if (!attempt) return;
    setError(null);
    try {
      const res = await fetch(`/api/estudio/materials/${materialId}/attempts/${attempt.id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "No se pudo cargar la revisión.");
      setReviewItems(data.items);
      setStep("review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ocurrió un error inesperado.");
    }
  }

  function requestExit() {
    if (attempt && attempt.status === "en_progreso") {
      setConfirmExit(true);
    } else {
      onBack();
    }
  }

  const header = (
    <button
      onClick={step === "session" ? requestExit : onBack}
      className="mb-4 flex items-center gap-1.5 text-sm text-text-muted transition-colors hover:text-text"
    >
      <ChevronLeft className="size-4" aria-hidden="true" />
      Practicar
    </button>
  );

  const title = mode === "examen" ? "Modo examen" : "Preguntas";

  if (step === "setup") {
    return (
      <div>
        {header}
        <h2 className="text-lg font-semibold text-text">{title}</h2>
        <p className="mt-1 text-sm text-text-muted">
          {mode === "examen"
            ? "Pon a prueba tus conocimientos. No verás la respuesta correcta hasta terminar."
            : "Responde preguntas de este material y recibe corrección al instante."}
        </p>

        {error && <p className="mt-4 text-sm text-danger">{error}</p>}

        <Card className="mt-6 max-w-md">
          <CardBody className="flex flex-col gap-4">
            {availableQuestions === null ? (
              <Loading label="Cargando…" />
            ) : (
              <>
                <p className="text-sm text-text-muted">
                  {availableQuestions} pregunta{availableQuestions === 1 ? "" : "s"} disponible
                  {availableQuestions === 1 ? "" : "s"} para este material.
                </p>

                <label className="flex flex-col gap-1.5 text-sm font-medium text-text-muted">
                  Preguntas
                  <select
                    value={count}
                    onChange={(e) => setCount(Number(e.target.value))}
                    className="rounded-md border border-border bg-surface px-2.5 py-2 text-sm text-text outline-none focus:border-primary"
                  >
                    {COUNT_OPTIONS.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </label>

                {mode === "examen" && (
                  <label className="flex flex-col gap-1.5 text-sm font-medium text-text-muted">
                    Dificultad
                    <select
                      value={difficulty}
                      onChange={(e) => setDifficulty(e.target.value as ExamDifficulty | "")}
                      className="rounded-md border border-border bg-surface px-2.5 py-2 text-sm text-text outline-none focus:border-primary"
                    >
                      <option value="">Todas</option>
                      {(Object.keys(DIFFICULTY_LABELS) as ExamDifficulty[]).map((d) => (
                        <option key={d} value={d}>
                          {DIFFICULTY_LABELS[d]}
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                <div className="flex flex-col gap-2 pt-1">
                  {availableQuestions === 0 && (
                    <p className="text-sm text-warning">Todavía no hay preguntas generadas para este material.</p>
                  )}
                  <Button variant="secondary" size="sm" loading={generating} onClick={handleGenerateQuestions}>
                    <Sparkles className="size-4" aria-hidden="true" />
                    Generar {availableQuestions === 0 ? "preguntas" : "nuevas preguntas"}
                  </Button>
                  <Button
                    loading={starting}
                    disabled={!availableQuestions}
                    onClick={() =>
                      startAttempt({
                        mode,
                        count,
                        difficulty: mode === "examen" && difficulty ? difficulty : undefined,
                      })
                    }
                  >
                    {mode === "examen" ? "Comenzar examen" : "Practicar"}
                  </Button>
                </div>
              </>
            )}
          </CardBody>
        </Card>
      </div>
    );
  }

  if (step === "session") {
    if (questions.length === 0 || !attempt) return null;
    const question = questions[current];
    const answer = answers[question.id];
    const answeredCount = Object.keys(answers).length;
    const isLast = current === questions.length - 1;
    const isExam = activeMode === "examen";

    return (
      <div>
        <button
          onClick={requestExit}
          className="mb-4 flex items-center gap-1.5 text-sm text-text-muted transition-colors hover:text-text"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
          Salir
        </button>

        <p className="mb-3 text-sm font-medium text-text-muted">
          Pregunta {current + 1} / {questions.length}
        </p>

        {error && <p className="mb-3 text-sm text-danger">{error}</p>}

        <Card className="max-w-2xl">
          <CardBody className="flex flex-col gap-4">
            <p className="text-base font-medium text-text">{question.question}</p>

            <div className="flex flex-col gap-2">
              {question.options.map((option, optionIndex) => {
                const isSelected = answer?.selectedIndex === optionIndex;
                const showCorrectness = !isExam && answer !== undefined;
                const isCorrectOption = showCorrectness && answer?.reveal?.correctAnswerIndex === optionIndex;
                const isWrongSelected = showCorrectness && isSelected && !answer?.correct;

                return (
                  <button
                    key={optionIndex}
                    disabled={Boolean(answer) || submitting}
                    onClick={() => handleSelectOption(question.id, optionIndex)}
                    className={`flex items-center gap-2.5 rounded-md border px-3.5 py-2.5 text-left text-sm transition-colors
                      ${
                        isCorrectOption
                          ? "border-success bg-success-soft text-success"
                          : isWrongSelected
                          ? "border-danger bg-danger-soft text-danger"
                          : isSelected
                          ? "border-primary bg-primary-soft text-primary"
                          : "border-border bg-surface text-text hover:border-border-strong"
                      }
                      disabled:cursor-not-allowed`}
                  >
                    {showCorrectness && isCorrectOption && (
                      <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
                    )}
                    {showCorrectness && isWrongSelected && <XCircle className="size-4 shrink-0" aria-hidden="true" />}
                    <span>{option}</span>
                  </button>
                );
              })}
            </div>

            {!isExam && answer?.reveal && (
              <div
                className={`rounded-md border p-3 text-sm ${
                  answer.correct
                    ? "border-success/30 bg-success-soft text-success"
                    : "border-danger/30 bg-danger-soft text-danger"
                }`}
              >
                <p className="font-medium">{answer.correct ? "✓ Correcto" : "✗ Incorrecto"}</p>
                <p className="mt-1 text-text">{answer.reveal.explanation}</p>
                {answer.reveal.sourcePages && (
                  <p className="mt-1 text-xs text-text-faint">Página(s) {answer.reveal.sourcePages}</p>
                )}
              </div>
            )}

            {isExam && answer && <p className="text-sm text-text-muted">Respuesta registrada.</p>}

            <div className="flex items-center justify-between pt-2">
              <Button variant="ghost" size="sm" disabled={current === 0} onClick={() => setCurrent((i) => i - 1)}>
                Anterior
              </Button>
              {isLast ? (
                <Button size="sm" loading={finishing} onClick={handleFinish}>
                  Finalizar
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={!isExam && !answer}
                  onClick={() => setCurrent((i) => i + 1)}
                >
                  Siguiente
                </Button>
              )}
            </div>

            {isExam && (
              <p className="text-center text-xs text-text-faint">
                {answeredCount} / {questions.length} respondidas
              </p>
            )}
          </CardBody>
        </Card>

        <Modal open={confirmExit} onClose={() => setConfirmExit(false)} title="¿Salir del examen?">
          <p className="text-sm text-text-muted">Tu progreso de este intento se perderá.</p>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setConfirmExit(false)}>
              Continuar examen
            </Button>
            <Button variant="danger" size="sm" onClick={onBack}>
              Salir
            </Button>
          </div>
        </Modal>
      </div>
    );
  }

  if (step === "results" && attempt) {
    return (
      <div>
        {header}
        <Card className="max-w-lg">
          <CardBody className="flex flex-col items-center gap-3 py-10 text-center">
            <p className="text-sm font-medium uppercase tracking-wide text-text-muted">
              {activeMode === "examen" ? "Examen finalizado" : "Sesión finalizada"}
            </p>
            <p className="text-4xl font-semibold text-text">{attempt.scorePercent}%</p>
            <p className="text-sm text-text-muted">
              {attempt.correctCount} / {attempt.totalQuestions} correctas
            </p>
            {attempt.incorrectCount > 0 && (
              <p className="text-sm text-text-faint">
                Tuviste {attempt.incorrectCount} error{attempt.incorrectCount === 1 ? "" : "es"}.
              </p>
            )}

            {error && <p className="text-sm text-danger">{error}</p>}

            <div className="mt-3 flex flex-wrap justify-center gap-2">
              <Button variant="secondary" size="sm" onClick={loadReview}>
                <ListChecks className="size-4" aria-hidden="true" />
                Ver respuestas
              </Button>
              {attempt.incorrectCount > 0 && (
                <Button size="sm" onClick={() => startAttempt({ mode: "repaso_errores", sourceAttemptId: attempt.id })}>
                  Repasar errores
                </Button>
              )}
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setStep("setup");
                  setAttempt(null);
                }}
              >
                <RotateCcw className="size-4" aria-hidden="true" />
                Repetir
              </Button>
              <Button variant="ghost" size="sm" onClick={onBack}>
                Volver a estudiar
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  if (step === "review" && reviewItems) {
    return (
      <div>
        <button
          onClick={() => setStep("results")}
          className="mb-4 flex items-center gap-1.5 text-sm text-text-muted transition-colors hover:text-text"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
          Volver al resultado
        </button>

        <h2 className="mb-4 text-lg font-semibold text-text">Revisión</h2>

        <div className="flex flex-col gap-4">
          {reviewItems.map((item, i) => {
            const isCorrect = item.answer?.isCorrect;
            return (
              <Card key={item.question.id}>
                <CardBody className="flex flex-col gap-2">
                  <p className="text-sm font-medium text-text-muted">Pregunta {i + 1}</p>
                  <p className="text-sm font-medium text-text">{item.question.question}</p>

                  {item.answer ? (
                    <>
                      <p className={`text-sm ${isCorrect ? "text-success" : "text-danger"}`}>
                        Tu respuesta: {item.question.options[item.answer.selectedIndex]}
                        {isCorrect ? " ✓" : " ✗"}
                      </p>
                      {!isCorrect && item.reveal && (
                        <p className="text-sm text-success">
                          Respuesta correcta: {item.reveal.options[item.reveal.correctAnswerIndex]}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-text-faint">No respondiste esta pregunta.</p>
                  )}

                  {item.reveal && (
                    <div className="mt-1 rounded-md border border-border bg-bg p-3 text-sm text-text-muted">
                      {item.reveal.explanation}
                      {item.reveal.sourcePages && (
                        <p className="mt-1 text-xs text-text-faint">Página(s) {item.reveal.sourcePages}</p>
                      )}
                    </div>
                  )}
                </CardBody>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div>
      {header}
      <EmptyState title="No se pudo cargar la sesión" description={error ?? undefined} />
    </div>
  );
}
