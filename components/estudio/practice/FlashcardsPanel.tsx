"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, Sparkles, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { Loading } from "@/components/ui/Loading";
import { EmptyState } from "@/components/ui/EmptyState";

interface FlashcardViewModel {
  id: string;
  question: string;
  answer: string;
  sourcePages: string | null;
  timesSeen: number;
  timesKnown: number;
}

const COUNT_OPTIONS = [10, 20, 30];

export function FlashcardsPanel({ materialId, onBack }: { materialId: string; onBack: () => void }) {
  const [cards, setCards] = useState<FlashcardViewModel[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [count, setCount] = useState(10);

  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [sessionDone, setSessionDone] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/estudio/materials/${materialId}/flashcards?order=priority`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "No se pudieron cargar las flashcards.");
      setCards(data.flashcards);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ocurrió un error inesperado.");
    }
  }, [materialId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/estudio/materials/${materialId}/flashcards?order=priority`);
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) throw new Error(data?.error || "No se pudieron cargar las flashcards.");
        setCards(data.flashcards);
        setError(null);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Ocurrió un error inesperado.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [materialId]);

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch(`/api/estudio/materials/${materialId}/flashcards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "No se pudieron generar las flashcards.");
      await load();
      setIndex(0);
      setRevealed(false);
      setSessionDone(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ocurrió un error inesperado.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleReview(cardId: string, known: boolean) {
    setCards((prev) =>
      prev
        ? prev.map((c) =>
            c.id === cardId
              ? { ...c, timesSeen: c.timesSeen + 1, timesKnown: c.timesKnown + (known ? 1 : 0) }
              : c
          )
        : prev
    );

    // Avanzar de inmediato: el registro del repaso no debe bloquear la
    // experiencia de estudio (Fase 6.1, §35: fluidez, especialmente en móvil).
    if (index + 1 >= (cards?.length ?? 0)) {
      setSessionDone(true);
    } else {
      setIndex((i) => i + 1);
      setRevealed(false);
    }

    try {
      const res = await fetch(`/api/estudio/materials/${materialId}/flashcards/${cardId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ known }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        console.error(data?.error || "No se pudo registrar el repaso.");
      }
    } catch {
      // No interrumpir el estudio por un fallo de red al registrar el repaso.
    }
  }

  function restartSession() {
    setIndex(0);
    setRevealed(false);
    setSessionDone(false);
  }

  const header = (
    <button
      onClick={onBack}
      className="mb-4 flex items-center gap-1.5 text-sm text-text-muted transition-colors hover:text-text"
    >
      <ChevronLeft className="size-4" aria-hidden="true" />
      Practicar
    </button>
  );

  if (cards === null && !error) {
    return (
      <div>
        {header}
        <Loading label="Cargando flashcards…" />
      </div>
    );
  }

  if (error && cards === null) {
    return (
      <div>
        {header}
        <EmptyState title="No se pudieron cargar las flashcards" description={error} />
      </div>
    );
  }

  const list = cards ?? [];

  return (
    <div>
      {header}

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-text">Flashcards</h2>
          <p className="text-sm text-text-muted">Repasa los conceptos importantes de este material.</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            disabled={generating}
            className="rounded-md border border-border bg-surface px-2.5 py-2 text-sm text-text outline-none focus:border-primary"
            aria-label="Cantidad de flashcards a generar"
          >
            {COUNT_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <Button variant="secondary" size="sm" loading={generating} onClick={handleGenerate}>
            <Sparkles className="size-4" aria-hidden="true" />
            {list.length === 0 ? "Generar flashcards" : "Generar más"}
          </Button>
        </div>
      </div>

      {error && <p className="mb-4 text-sm text-danger">{error}</p>}

      {list.length === 0 ? (
        <EmptyState
          title="Todavía no hay flashcards"
          description="Genera un primer lote de flashcards a partir del contenido de este material."
        />
      ) : sessionDone ? (
        <Card>
          <CardBody className="flex flex-col items-center gap-4 py-10 text-center">
            <p className="text-lg font-semibold text-text">¡Repasaste todas las tarjetas!</p>
            <p className="text-sm text-text-muted">
              {list.reduce((sum, c) => sum + (c.timesKnown > 0 ? 1 : 0), 0)} / {list.length} tarjetas sabidas en total.
            </p>
            <Button variant="secondary" onClick={restartSession}>
              <RotateCcw className="size-4" aria-hidden="true" />
              Repasar de nuevo
            </Button>
          </CardBody>
        </Card>
      ) : (
        <FlashcardStudyCard
          key={list[index].id}
          card={list[index]}
          index={index}
          total={list.length}
          revealed={revealed}
          onReveal={() => setRevealed(true)}
          onAnswer={(known) => handleReview(list[index].id, known)}
        />
      )}
    </div>
  );
}

function FlashcardStudyCard({
  card,
  index,
  total,
  revealed,
  onReveal,
  onAnswer,
}: {
  card: FlashcardViewModel;
  index: number;
  total: number;
  revealed: boolean;
  onReveal: () => void;
  onAnswer: (known: boolean) => void;
}) {
  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-sm font-medium text-text-muted">
        Tarjeta {index + 1} / {total}
      </p>

      <Card className="w-full max-w-xl">
        <CardBody className="flex min-h-48 flex-col items-center justify-center gap-4 text-center">
          {!revealed ? (
            <>
              <p className="text-lg font-medium text-text">{card.question}</p>
              <Button onClick={onReveal}>Mostrar respuesta</Button>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold uppercase tracking-wide text-text-faint">Respuesta</p>
              <p className="text-base leading-relaxed text-text">{card.answer}</p>
              {card.sourcePages && <p className="text-xs text-text-faint">Página(s) {card.sourcePages}</p>}
              <div className="mt-2 flex gap-3">
                <Button variant="secondary" onClick={() => onAnswer(false)}>
                  No lo sabía
                </Button>
                <Button onClick={() => onAnswer(true)}>Lo sabía</Button>
              </div>
            </>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
