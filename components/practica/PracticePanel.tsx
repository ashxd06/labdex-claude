"use client";

import { useState } from "react";
import { RefreshCw, CheckCircle2, XCircle, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { generateExercise } from "@/lib/practica/generator";
import { generateMolarityExercise } from "@/lib/practica/molarity";
import type { PracticeCategory, PracticeDifficulty, PracticeExercise } from "@/lib/practica/types";

function parseNumber(value: string): number | null {
  const normalized = value.trim().replace(",", ".");
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function createExercise(category: PracticeCategory, difficulty: PracticeDifficulty): PracticeExercise {
  return category === "molaridad"
    ? generateMolarityExercise(Math.floor(Math.random() * 2 ** 31), difficulty)
    : generateExercise(category, difficulty);
}

export function PracticePanel() {
  const [category, setCategory] = useState<PracticeCategory>("diluciones");
  const [difficulty, setDifficulty] = useState<PracticeDifficulty>("basico");
  const [exercise, setExercise] = useState<PracticeExercise>(() => generateExercise("diluciones", "basico"));
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<"correct" | "incorrect" | null>(null);
  const [showProcedure, setShowProcedure] = useState(false);

  function newExercise(nextCategory = category, nextDifficulty = difficulty) {
    setCategory(nextCategory);
    setDifficulty(nextDifficulty);
    setExercise(createExercise(nextCategory, nextDifficulty));
    setAnswer("");
    setFeedback(null);
    setShowProcedure(false);
  }

  function checkAnswer() {
    const value = parseNumber(answer);
    if (value === null) return;
    setFeedback(Math.abs(value - exercise.answer.value) <= exercise.answer.tolerance ? "correct" : "incorrect");
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm font-medium text-text-muted">
          Tema
          <select value={category} onChange={(event) => newExercise(event.target.value as PracticeCategory, difficulty)} className="rounded-md border border-border bg-surface px-3.5 py-2.5 text-text outline-none focus:border-primary">
            <option value="diluciones">Diluciones</option>
            <option value="concentraciones">Concentraciones</option>
            <option value="molaridad">Molaridad y soluciones</option>
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-text-muted">
          Dificultad
          <select value={difficulty} onChange={(event) => newExercise(category, event.target.value as PracticeDifficulty)} className="rounded-md border border-border bg-surface px-3.5 py-2.5 text-text outline-none focus:border-primary">
            <option value="basico">Básico</option>
            <option value="tecnico">Técnico</option>
            <option value="examen">Examen</option>
          </select>
        </label>
      </div>

      <div className="rounded-lg border border-border bg-surface p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-accent">Ejercicio aleatorio</p>
            <h2 className="mt-2 text-lg font-semibold text-text">Resuelve el problema</h2>
          </div>
          <Button type="button" variant="secondary" size="sm" onClick={() => newExercise()}>
            <RefreshCw className="size-4" aria-hidden="true" /> Nuevo
          </Button>
        </div>

        <p className="mt-5 text-base leading-7 text-text">{exercise.statement}</p>

        <div className="mt-6 max-w-sm">
          <Input label={`${exercise.answerLabel} (${exercise.answer.unit})`} value={answer} onChange={(event) => setAnswer(event.target.value)} inputMode="decimal" placeholder="Escribe tu respuesta" onKeyDown={(event) => { if (event.key === "Enter") checkAnswer(); }} />
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <Button type="button" onClick={checkAnswer} disabled={parseNumber(answer) === null}>Comprobar</Button>
          <Button type="button" variant="ghost" onClick={() => setShowProcedure((value) => !value)}>
            <BookOpen className="size-4" aria-hidden="true" /> {showProcedure ? "Ocultar procedimiento" : "Ver procedimiento"}
          </Button>
        </div>

        {feedback === "correct" && (
          <div className="mt-5 flex items-center gap-2 rounded-md border border-border bg-surface-2 p-3 text-sm text-success">
            <CheckCircle2 className="size-5" aria-hidden="true" /> Correcto. Buen cálculo.
          </div>
        )}
        {feedback === "incorrect" && (
          <div className="mt-5 flex items-center gap-2 rounded-md border border-border bg-surface-2 p-3 text-sm text-danger">
            <XCircle className="size-5" aria-hidden="true" /> Aún no. Revisa la fórmula y vuelve a intentarlo.
          </div>
        )}

        {showProcedure && (
          <div className="mt-5 rounded-md border border-border bg-bg p-4">
            <p className="text-sm font-semibold text-text">Procedimiento</p>
            <p className="mt-2 text-sm font-medium text-accent">{exercise.formula}</p>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6 text-text-muted">
              {exercise.procedure.map((step) => <li key={step}>{step}</li>)}
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}
