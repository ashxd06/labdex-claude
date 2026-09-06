"use client";

import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

/**
 * Buscador global de LABDEX. Envía la consulta a /buscar, que hace una
 * búsqueda básica sobre microorganismos, medios, pruebas, procedimientos,
 * análisis y documentos. Se podrá mejorar más adelante con LABDEX AI y
 * búsqueda semántica.
 */
export function SearchBar({ compact = false }: { compact?: boolean }) {
  const router = useRouter();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const q = String(formData.get("q") || "").trim();
    router.push(q ? `/buscar?q=${encodeURIComponent(q)}` : "/buscar");
  }

  return (
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
          placeholder="Buscar microorganismos, pruebas, procedimientos…"
          className="w-full bg-transparent text-sm placeholder:text-text-faint outline-none"
        />
      </label>
    </form>
  );
}
