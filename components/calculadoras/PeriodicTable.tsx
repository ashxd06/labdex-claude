"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Atom, Minus, Plus, Search, Trash2 } from "lucide-react";
import { ELEMENTS, ELEMENT_FAMILIES, type ElementFamily } from "@/lib/calculadoras/elements";

const familyColors: Record<ElementFamily, string> = {
  Alcalinos: "border-rose-400/50 bg-rose-500/10 text-rose-700 dark:text-rose-200",
  Alcalinotérreos: "border-orange-400/50 bg-orange-500/10 text-orange-800 dark:text-orange-200",
  "Metales de transición": "border-sky-400/50 bg-sky-500/10 text-sky-800 dark:text-sky-200",
  "Otros metales": "border-cyan-400/50 bg-cyan-500/10 text-cyan-800 dark:text-cyan-200",
  Metaloides: "border-violet-400/50 bg-violet-500/10 text-violet-800 dark:text-violet-200",
  "No metales": "border-emerald-400/50 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200",
  Halógenos: "border-amber-400/50 bg-amber-500/10 text-amber-800 dark:text-amber-200",
  "Gases nobles": "border-fuchsia-400/50 bg-fuchsia-500/10 text-fuchsia-800 dark:text-fuchsia-200",
  Lantánidos: "border-indigo-400/50 bg-indigo-500/10 text-indigo-800 dark:text-indigo-200",
  Actínidos: "border-purple-400/50 bg-purple-500/10 text-purple-800 dark:text-purple-200",
};

const subscriptDigits: Record<string, string> = { "0": "₀", "1": "₁", "2": "₂", "3": "₃", "4": "₄", "5": "₅", "6": "₆", "7": "₇", "8": "₈", "9": "₉" };
const normalizeSearch = (value: string) => value.trim().toLocaleLowerCase("es").normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export function PeriodicTable() {
  const [query, setQuery] = useState("");
  const [family, setFamily] = useState("Todas");
  const [selected, setSelected] = useState<Record<string, number>>({});

  const filtered = useMemo(() => ELEMENTS.filter((element) => {
    const normalizedQuery = normalizeSearch(query);
    const matchesQuery = !normalizedQuery || [element.symbol, element.name, String(element.atomicNumber)]
      .some((value) => normalizeSearch(value).includes(normalizedQuery));
    return matchesQuery && (family === "Todas" || element.family === family);
  }), [query, family]);

  const selectedElements = ELEMENTS.filter((element) => selected[element.symbol]);
  const formula = selectedElements.map((element) => `${element.symbol}${selected[element.symbol] > 1 ? String(selected[element.symbol]).replace(/\d/g, (digit) => subscriptDigits[digit]) : ""}`).join("") || "—";
  const molarMass = selectedElements.reduce((sum, element) => sum + (element.mass ?? 0) * selected[element.symbol], 0);
  const hasSelection = selectedElements.length > 0;

  function addElement(symbol: string) {
    setSelected((previous) => ({ ...previous, [symbol]: (previous[symbol] ?? 0) + 1 }));
  }

  function removeElement(symbol: string) {
    setSelected((previous) => {
      const next = { ...previous };
      if ((next[symbol] ?? 0) <= 1) delete next[symbol];
      else next[symbol] -= 1;
      return next;
    });
  }

  const molarityHref = `/calculadoras/molaridad?masaMolar=${molarMass.toFixed(5)}&formula=${encodeURIComponent(formula)}`;

  return (
    <div className="mt-6 space-y-6">
      <section className="rounded-xl border border-border bg-surface p-4 sm:p-5" aria-label="Buscador de elementos">
        <div className="grid gap-3 sm:grid-cols-[1fr_14rem]">
          <label className="relative block">
            <span className="sr-only">Buscar por nombre, símbolo o número atómico</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-faint" aria-hidden="true" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar elemento (ej. hierro, Fe, 26)" className="w-full rounded-lg border border-border-strong bg-bg px-3 py-2.5 pl-9 text-sm text-text placeholder:text-text-faint" />
          </label>
          <label className="text-sm text-text-muted">
            <span className="sr-only">Filtrar por familia</span>
            <select value={family} onChange={(event) => setFamily(event.target.value)} className="w-full rounded-lg border border-border-strong bg-bg px-3 py-2.5 text-text">
              <option value="Todas">Todas las familias</option>
              {ELEMENT_FAMILIES.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
        </div>
        <p className="mt-3 text-xs text-text-muted">Toca un elemento para añadirlo al constructor de fórmula. En celular puedes desplazar la tabla horizontalmente.</p>
      </section>

      {(query || family !== "Todas") ? (
        <section aria-live="polite" className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {filtered.map((element) => <ElementTile key={element.symbol} element={element} count={selected[element.symbol] ?? 0} onSelect={() => element.mass !== null && addElement(element.symbol)} />)}
          {filtered.length === 0 && <p className="col-span-full rounded-lg border border-border bg-surface p-5 text-sm text-text-muted">No encontramos elementos con esa búsqueda.</p>}
        </section>
      ) : (
        <section className="overflow-x-auto rounded-xl border border-border bg-surface p-3 sm:p-5" aria-label="Tabla periódica interactiva">
          <div className="min-w-[890px]">
            <div className="grid grid-cols-[repeat(18,minmax(42px,1fr))] gap-1.5">
              {ELEMENTS.filter((element) => element.period < 8).map((element) => <div key={element.symbol} style={{ gridColumn: element.group, gridRow: element.period }}><ElementTile element={element} count={selected[element.symbol] ?? 0} onSelect={() => element.mass !== null && addElement(element.symbol)} compact /></div>)}
            </div>
            <div className="mt-4 space-y-1.5 border-t border-border pt-3">
              {([{ period: 8, label: "Lantánidos" }, { period: 9, label: "Actínidos" }] as const).map(({ period, label }) => (
                <div key={period} className="grid grid-cols-[5.5rem_repeat(14,minmax(42px,1fr))] items-stretch gap-1.5">
                  <span className="flex items-center text-[10px] font-medium text-text-muted">{label}</span>
                  {ELEMENTS.filter((element) => element.period === period).map((element) => <ElementTile key={element.symbol} element={element} count={selected[element.symbol] ?? 0} onSelect={() => element.mass !== null && addElement(element.symbol)} compact />)}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="rounded-xl border border-accent/40 bg-accent-soft/40 p-4 sm:p-5" aria-labelledby="formula-heading">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id="formula-heading" className="flex items-center gap-2 font-semibold text-text"><Atom className="size-5 text-accent" aria-hidden="true" />Constructor de fórmula</h2>
            <p className="mt-1 text-xs text-text-muted">La tabla no determina por sí sola la fórmula de un compuesto: indica las proporciones que quieras practicar.</p>
          </div>
          {hasSelection && <button type="button" onClick={() => setSelected({})} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm text-text-muted hover:bg-surface hover:text-text"><Trash2 className="size-4" aria-hidden="true" />Limpiar</button>}
        </div>
        {!hasSelection ? (
          <p className="mt-4 rounded-lg border border-dashed border-border-strong bg-surface/60 px-3 py-4 text-sm text-text-muted">Selecciona elementos de la tabla para comenzar.</p>
        ) : (
          <>
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg bg-surface px-4 py-3">
              <span className="font-mono text-2xl font-semibold text-text" aria-label={`Fórmula ${formula}`}>{formula}</span>
              <span className="text-sm text-text-muted">Masa molar aproximada: <strong className="text-text">{molarMass.toFixed(3)} g/mol</strong></span>
            </div>
            <ul className="mt-3 flex flex-wrap gap-2">
              {selectedElements.map((element) => (
                <li key={element.symbol} className="flex items-center gap-1 rounded-lg border border-border bg-surface px-2 py-1.5 text-sm">
                  <span className="min-w-14 text-text">{element.symbol} <span className="text-text-muted">× {selected[element.symbol]}</span></span>
                  <button type="button" onClick={() => removeElement(element.symbol)} aria-label={`Quitar un átomo de ${element.name}`} className="rounded p-1 text-text-muted hover:bg-bg hover:text-text"><Minus className="size-4" aria-hidden="true" /></button>
                  <button type="button" onClick={() => addElement(element.symbol)} aria-label={`Añadir un átomo de ${element.name}`} className="rounded p-1 text-text-muted hover:bg-bg hover:text-text"><Plus className="size-4" aria-hidden="true" /></button>
                </li>
              ))}
            </ul>
            <Link href={molarityHref} className="mt-4 inline-flex min-h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-hover">Usar en calculadora de molaridad <span className="ml-2" aria-hidden="true">→</span></Link>
          </>
        )}
      </section>

      <p className="text-xs leading-5 text-text-faint">Pesos atómicos estándar abreviados: CIAAW 2024. Para elementos radiactivos sin peso estándar, la masa depende del isótopo y no se incluye en este cálculo. <a href="https://ciaaw.org/abridged-atomic-weights.htm" target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-text">Consultar fuente (CIAAW)</a>.</p>
    </div>
  );
}

function ElementTile({ element, count, onSelect, compact = false }: { element: (typeof ELEMENTS)[number]; count: number; onSelect: () => void; compact?: boolean }) {
  const canCalculate = element.mass !== null;
  return (
    <button type="button" onClick={onSelect} disabled={!canCalculate} aria-pressed={count > 0} aria-label={`${element.name}, ${element.symbol}, número atómico ${element.atomicNumber}${canCalculate ? `, ${element.mass} gramos por mol` : ", sin masa estándar para cálculos"}`} title={`${element.name} · Z ${element.atomicNumber}${canCalculate ? ` · ${element.mass} g/mol` : " · masa estándar no disponible"}`} className={`relative flex w-full flex-col items-center justify-center rounded-lg border text-center transition focus-visible:z-10 ${familyColors[element.family]} ${compact ? "min-h-[3.6rem] px-0.5 py-1" : "min-h-24 p-3"} ${count > 0 ? "ring-2 ring-accent ring-offset-1 ring-offset-surface" : ""} ${canCalculate ? "cursor-pointer hover:-translate-y-0.5 hover:shadow-sm" : "cursor-not-allowed opacity-75"}`}>
      <span className="absolute left-1 top-0.5 text-[9px] leading-3 opacity-75">{element.atomicNumber}</span>
      {count > 0 && <span className="absolute right-1 top-0.5 rounded bg-accent px-1 text-[9px] font-bold leading-3 text-white">×{count}</span>}
      <span className={`${compact ? "text-base" : "text-2xl"} font-semibold leading-tight`}>{element.symbol}</span>
      {!compact && <span className="mt-1 text-xs leading-tight">{element.name}</span>}
      <span className="mt-0.5 text-[9px] leading-tight opacity-80">{canCalculate ? element.mass : "isótopo"}</span>
    </button>
  );
}
