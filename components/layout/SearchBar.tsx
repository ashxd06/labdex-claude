"use client";

import { Search } from "lucide-react";

/**
 * Buscador global de LABDEX.
 * En esta fase es solo la interfaz: la búsqueda real sobre microorganismos,
 * pruebas, medios de cultivo, etc. se conectará cuando exista contenido
 * (Fase 2+).
 */
export function SearchBar({ compact = false }: { compact?: boolean }) {
  return (
    <label
      className={`group flex items-center gap-2 rounded-md border border-border bg-surface px-3 text-text-muted transition-colors focus-within:border-primary
        ${compact ? "w-full py-2" : "w-64 py-2"}`}
    >
      <Search className="size-4 shrink-0" aria-hidden="true" />
      <span className="sr-only">Buscar en LABDEX</span>
      <input
        type="search"
        placeholder="Buscar microorganismos, pruebas, procedimientos…"
        disabled
        title="La búsqueda global estará disponible cuando se cargue contenido"
        className="w-full bg-transparent text-sm placeholder:text-text-faint outline-none disabled:cursor-not-allowed"
      />
    </label>
  );
}
