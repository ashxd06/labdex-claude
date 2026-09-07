"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

interface SearchResult {
  type: string;
  label: string;
  href: string;
}

/**
 * Buscador global de LABDEX.
 * - Mientras el usuario escribe, hace una búsqueda ligera con debounce
 *   (300ms) contra /api/search y muestra un menú de resultados agrupados
 *   por tipo, sin disparar una consulta por cada tecla.
 * - Al enviar el formulario (Enter) navega a /buscar con la búsqueda
 *   completa, paginada.
 */
export function SearchBar({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.trim().length < 2) {
      return;
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`);
        if (!res.ok) return;
        const data = await res.json();
        setResults(data.results ?? []);
        setOpen(true);
      } catch {
        // La búsqueda en vivo es una mejora de experiencia; si falla,
        // el usuario siempre puede pulsar Enter para ir a /buscar.
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setOpen(false);
    router.push(query.trim() ? `/buscar?q=${encodeURIComponent(query.trim())}` : "/buscar");
  }

  function handleSelect(href: string) {
    setOpen(false);
    router.push(href);
  }

  function goToFullResults() {
    setOpen(false);
    router.push(query.trim() ? `/buscar?q=${encodeURIComponent(query.trim())}` : "/buscar");
  }

  return (
    <div ref={containerRef} className={`relative ${compact ? "w-full" : ""}`}>
      <form onSubmit={handleSubmit} className={compact ? "w-full" : ""}>
        <label
          className={`group flex items-center gap-2 rounded-md border border-border bg-surface px-3 text-text-muted transition-colors focus-within:border-primary
            ${compact ? "w-full py-2" : "w-64 py-2"}`}
        >
          <Search className="size-4 shrink-0" aria-hidden="true" />
          <span className="sr-only">Buscar en LABDEX</span>
          <input
            type="search"
            name="q"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => results.length > 0 && setOpen(true)}
            placeholder="Buscar microorganismos, pruebas, procedimientos…"
            className="w-full bg-transparent text-sm placeholder:text-text-faint outline-none"
            autoComplete="off"
          />
        </label>
      </form>

      {open && query.trim().length >= 2 && results.length > 0 && (
        <div className="absolute z-40 mt-1 w-full min-w-[18rem] overflow-hidden rounded-md border border-border bg-surface shadow-[var(--ldx-shadow)]">
          {results.map((r, i) => (
            <button
              key={`${r.href}-${i}`}
              onClick={() => handleSelect(r.href)}
              className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm text-text hover:bg-surface-2"
            >
              <span className="truncate">{r.label}</span>
              <span className="shrink-0 text-xs text-text-faint">{r.type}</span>
            </button>
          ))}
          <button
            onClick={goToFullResults}
            type="button"
            className="w-full border-t border-border px-3 py-2 text-left text-xs text-accent hover:bg-surface-2"
          >
            Ver todos los resultados →
          </button>
        </div>
      )}
    </div>
  );
}
