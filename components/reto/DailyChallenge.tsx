"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BookOpenCheck, Check, Flame, RotateCcw, Sparkles, X } from "lucide-react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useAuth } from "@/lib/auth/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import { cardForDate, type LearningCard } from "@/lib/reto/cards";

type Mode = "daily" | "review" | "case" | "progress";
interface SavedProgress {
  completedDates: string[];
  masteredIds: string[];
  missedIds: string[];
  lastMode?: Mode;
}
const STORAGE_KEY = "labdex-learning-progress-v1";
const EMPTY: SavedProgress = { completedDates: [], masteredIds: [], missedIds: [] };

function localDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function yesterdayKey() {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return localDateKey(date);
}
function mergeProgress(a: SavedProgress, b: SavedProgress): SavedProgress {
  return {
    completedDates: [...new Set([...a.completedDates, ...b.completedDates])].sort(),
    masteredIds: [...new Set([...a.masteredIds, ...b.masteredIds])],
    missedIds: [...new Set([...a.missedIds, ...b.missedIds])].filter((id) => !a.masteredIds.includes(id) && !b.masteredIds.includes(id)),
  };
}
function streakFor(dates: string[]) {
  const set = new Set(dates);
  const cursor = set.has(localDateKey()) ? new Date() : set.has(yesterdayKey()) ? new Date(Date.now() - 86400000) : null;
  let streak = 0;
  while (cursor && set.has(localDateKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function DailyChallenge({ cards }: { cards: LearningCard[] }) {
  const { user } = useAuth();
  const [mode, setMode] = useState<Mode>("daily");
  const [progress, setProgress] = useState<SavedProgress>(EMPTY);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [pendingReviewId, setPendingReviewId] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [syncMessage, setSyncMessage] = useState("Guardado en este dispositivo");
  const supabase = useMemo(() => createClient() as unknown as SupabaseClient, []);
  const today = localDateKey();
  const dailyCard = cardForDate(cards, today);
  const currentCard = cards.find((card) => card.id === activeCardId) ?? dailyCard;
  const reviewCards = cards.filter((card) => progress.missedIds.includes(card.id));
  const caseCards = cards.filter((card) => card.casePrompt && card.id.endsWith(":morphology"));
  const topics = [...new Set(cards.map((card) => card.topic))];

  useEffect(() => {
    let alive = true;
    let local = EMPTY;
    try {
      local = { ...EMPTY, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") } as SavedProgress;
    } catch { /* Datos locales inválidos: iniciar progreso limpio, sin bloquear el reto. */ }
    (async () => {
      let merged = local;
      if (user) {
        setSyncMessage("Sincronizando progreso…");
        const { data, error } = await supabase.from("study_learning_progress").select("state").eq("user_id", user.id).maybeSingle();
        if (!error && data?.state) merged = mergeProgress(local, data.state as SavedProgress);
        if (alive) setSyncMessage(error ? "Sin conexión; se guarda en este dispositivo" : "Sincronizado con tu cuenta");
      }
      if (!alive) return;
      setProgress(merged);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      if (user) {
        const { error } = await supabase.from("study_learning_progress").upsert({ user_id: user.id, state: merged, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
        if (alive && error) setSyncMessage("No se pudo sincronizar; tu avance sigue guardado aquí");
      }
      setLoaded(true);
    })();
    return () => { alive = false; };
  }, [user, supabase]);

  async function save(next: SavedProgress) {
    setProgress(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    if (!user) return;
    const { error } = await supabase.from("study_learning_progress").upsert({ user_id: user.id, state: next, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
    setSyncMessage(error ? "Sincronización pendiente; el avance está guardado en este dispositivo" : "Sincronizado con tu cuenta");
  }

  function rate(knewIt: boolean) {
    if (!currentCard) return;
    const completedDates = mode === "daily" ? [...new Set([...progress.completedDates, today])] : progress.completedDates;
    const next: SavedProgress = {
      ...progress,
      completedDates,
      masteredIds: knewIt ? [...new Set([...progress.masteredIds, currentCard.id])] : progress.masteredIds.filter((id) => id !== currentCard.id),
      missedIds: knewIt ? progress.missedIds.filter((id) => id !== currentCard.id) : [...new Set([...progress.missedIds, currentCard.id])],
    };
    void save(next);
    setPendingReviewId(knewIt || mode === "review" ? null : currentCard.id);
    if (mode === "review") {
      const remaining = cards.find((card) => !knewIt && card.id !== currentCard.id && next.missedIds.includes(card.id));
      setActiveCardId(remaining?.id ?? null);
      setRevealed(false);
    } else {
      setRevealed(false);
      setActiveCardId(null);
    }
  }

  function start(modeToStart: Mode, card?: LearningCard) {
    setMode(modeToStart);
    setActiveCardId(card?.id ?? null);
    setRevealed(false);
  }

  if (!cards.length) return <div className="rounded-2xl border border-border bg-surface p-6 text-sm text-text-muted">Aún no hay fichas publicadas con datos suficientes para crear preguntas. Cuando agregues contenido, aparecerá aquí automáticamente.</div>;
  const doneToday = progress.completedDates.includes(today);

  return <div className="space-y-6">
    <section className="rounded-3xl border border-border bg-gradient-to-br from-surface via-surface to-primary/10 p-5 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Aprende un poco cada día</p><h1 className="mt-2 text-3xl font-semibold text-text sm:text-4xl">Reto LABDEX</h1><p className="mt-2 max-w-xl text-sm leading-6 text-text-muted">Preguntas creadas desde las fichas educativas publicadas. Piensa tu respuesta, revélala y decide si ya la dominas o quieres repasarla.</p></div>
        <div className="flex items-center gap-2 rounded-2xl border border-orange-400/25 bg-orange-400/10 px-4 py-3 text-orange-200"><Flame className="size-5"/><span className="text-2xl font-bold">{streakFor(progress.completedDates)}</span><span className="text-xs">días<br/>de racha</span></div>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        {([ ["daily", "Reto de hoy"], ["review", `Repasar (${reviewCards.length})`], ["case", "Caso educativo"], ["progress", "Mi progreso"] ] as [Mode, string][]).map(([key, label]) => <button key={key} onClick={() => start(key)} className={`rounded-xl border px-4 py-2.5 text-sm font-medium ${mode === key ? "border-accent bg-accent/15 text-text" : "border-border bg-surface text-text-muted hover:text-text"}`}>{label}</button>)}
      </div>
    </section>

    {mode === "progress" ? <section className="grid gap-4 sm:grid-cols-3">
      <Stat label="Días completados" value={progress.completedDates.length}/><Stat label="Preguntas dominadas" value={progress.masteredIds.length}/><Stat label="Para repasar" value={reviewCards.length}/>
      <div className="rounded-2xl border border-border bg-surface p-5 sm:col-span-3"><h2 className="font-semibold">Tu calendario reciente</h2><div className="mt-4 flex flex-wrap gap-2">{Array.from({ length: 14 }, (_, index) => { const date = new Date(); date.setDate(date.getDate() - (13 - index)); const key = localDateKey(date); return <div key={key} title={key} className={`grid size-9 place-items-center rounded-lg text-xs ${progress.completedDates.includes(key) ? "bg-emerald-500/20 text-emerald-300" : "bg-surface-2 text-text-faint"}`}>{progress.completedDates.includes(key) ? <Check className="size-4"/> : date.getDate()}</div>; })}</div><p className="mt-3 text-xs text-text-muted">La racha premia completar el reto; equivocarte no la rompe. Se cuenta por día local.</p></div>
    </section> : mode === "case" ? <section className="space-y-3"><h2 className="text-lg font-semibold">Casos educativos simulados</h2><p className="text-sm text-text-muted">Son ejercicios académicos basados en fichas, no diagnósticos ni recomendaciones clínicas.</p>{currentCard?.casePrompt && mode === "case" && activeCardId ? <QuestionCard card={{ ...currentCard, prompt: currentCard.casePrompt, answer: currentCard.caseAnswer || currentCard.answer }} revealed={revealed} setRevealed={setRevealed} onRate={rate} mode={mode}/> : caseCards.length ? caseCards.map((card) => <button key={card.id} onClick={() => start("case", card)} className="w-full rounded-2xl border border-border bg-surface p-5 text-left hover:border-accent"><span className="text-xs text-accent">{card.title}</span><p className="mt-2 text-sm leading-6">{card.casePrompt}</p><span className="mt-3 inline-flex items-center gap-1 text-sm text-text-muted">Resolver caso <BookOpenCheck className="size-4"/></span></button>) : <Empty text="Agrega morfología y tinción de Gram en una ficha activa de microbiología para generar un caso educativo."/>}</section> : mode === "review" ? <section className="space-y-4"><h2 className="text-lg font-semibold">Repaso de respuestas falladas y práctica</h2>{currentCard && activeCardId ? <QuestionCard card={currentCard} revealed={revealed} setRevealed={setRevealed} onRate={rate} mode={mode}/> : reviewCards.length ? <button onClick={() => { setActiveCardId(reviewCards[0].id); setRevealed(false); }} className="rounded-xl border border-accent px-4 py-3 text-sm text-accent">Empezar repaso de {reviewCards.length} preguntas</button> : <Empty text="¡No tienes preguntas pendientes! También puedes elegir un tema abajo para practicar fichas nuevas."/>}</section> : <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">{doneToday ? "Reto completado por hoy" : "Tu pregunta de hoy"}</h2><p className="text-sm text-text-muted">{doneToday ? "Vuelve mañana para mantener tu hábito. También puedes practicar más abajo." : "Una pregunta nueva cada día · el reto se renueva a medianoche local."}</p></div>{doneToday && <span className="rounded-full bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-300">✓ Día registrado</span>}</div>
      {currentCard && mode === "daily" && !activeCardId && !doneToday ? <QuestionCard card={currentCard} revealed={revealed} setRevealed={setRevealed} onRate={rate} mode={mode}/> : doneToday && !activeCardId ? <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-5 text-sm text-text-muted">Tu actividad de hoy ya cuenta para la racha. Puedes seguir practicando sin límite en el repaso temático.</div> : null}
      {pendingReviewId && mode === "daily" && <div className="rounded-2xl border border-amber-400/25 bg-amber-400/5 p-5"><p className="font-medium">La dejamos en tu repaso para que puedas volver a ella.</p><p className="mt-1 text-sm text-text-muted">¿Quieres intentar recordarla ahora o seguir con tu día?</p><div className="mt-4 flex flex-wrap gap-2"><button onClick={() => { setMode("review"); setActiveCardId(pendingReviewId); setPendingReviewId(null); setRevealed(false); }} className="rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white">Repasar ahora</button><button onClick={() => setPendingReviewId(null)} className="rounded-xl border border-border px-4 py-2.5 text-sm text-text-muted">Dejar para después</button></div></div>}
      <div className="rounded-2xl border border-border bg-surface p-5"><div className="flex items-center gap-2"><Sparkles className="size-4 text-accent"/><h3 className="font-semibold">Practica por tema</h3></div><div className="mt-3 flex flex-wrap gap-2">{topics.map((topic) => <button key={topic} onClick={() => start("review", cards.find((card) => card.topic === topic))} className="rounded-full border border-border px-3 py-1.5 text-xs text-text-muted hover:border-accent hover:text-text">{topic}</button>)}</div><p className="mt-3 text-xs text-text-faint">Cada respuesta se contrasta con el texto de su ficha original.</p></div>
    </section>}
    <p className="text-center text-xs text-text-faint">{loaded ? syncMessage : "Cargando tu progreso…"}{user ? " · vinculado a tu cuenta" : " · inicia sesión para sincronizar entre dispositivos"}</p>
  </div>;
}

function QuestionCard({ card, revealed, setRevealed, onRate, mode }: { card: LearningCard; revealed: boolean; setRevealed: (value: boolean) => void; onRate: (knewIt: boolean) => void; mode: Mode }) {
  return <article className="rounded-2xl border border-border bg-surface p-5 sm:p-7"><div className="flex flex-wrap items-center justify-between gap-2"><span className="rounded-full bg-accent/10 px-3 py-1 text-xs text-accent">{card.topic}</span><span className="text-xs text-text-faint">{card.title}</span></div><h3 className="mt-5 text-xl font-semibold leading-8">{card.prompt}</h3>{revealed ? <div className="mt-5 space-y-4"><div className="rounded-xl border border-accent/20 bg-accent/5 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-accent">Respuesta de la ficha</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-text">{card.answer}</p></div><p className="text-sm leading-6 text-text-muted">{card.explanation}</p><Link href={card.href} className="inline-flex items-center gap-2 text-sm text-accent hover:underline">Abrir ficha completa <BookOpenCheck className="size-4"/></Link><div className="flex flex-wrap gap-2 border-t border-border pt-4"><button onClick={() => onRate(true)} className="inline-flex items-center gap-2 rounded-xl bg-emerald-500/15 px-4 py-3 text-sm font-medium text-emerald-200"><Check className="size-4"/>La sabía</button><button onClick={() => onRate(false)} className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-3 text-sm text-text-muted"><X className="size-4"/>Me equivoqué</button></div>{mode !== "daily" && <p className="text-xs text-text-faint">Si te equivocaste, queda en la lista de repaso; puedes seguir con otra o dejarlo para después.</p>}</div> : <button onClick={() => setRevealed(true)} className="mt-5 w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white hover:bg-primary-hover"><Sparkles className="mr-2 inline size-4"/>Revelar respuesta</button>}</article>;
}
function Stat({ label, value }: { label: string; value: number }) { return <div className="rounded-2xl border border-border bg-surface p-5"><p className="text-sm text-text-muted">{label}</p><p className="mt-2 text-3xl font-semibold">{value}</p></div>; }
function Empty({ text }: { text: string }) { return <div className="rounded-2xl border border-border bg-surface p-6 text-sm text-text-muted"><RotateCcw className="mb-3 size-5 text-accent"/>{text}</div>; }
