import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function Pagination({
  page,
  totalPages,
  buildHref,
}: {
  page: number;
  totalPages: number;
  buildHref: (page: number) => string;
}) {
  if (totalPages <= 1) return null;

  return (
    <nav className="mt-8 flex items-center justify-center gap-2" aria-label="Paginación">
      <Link
        href={buildHref(Math.max(1, page - 1))}
        aria-disabled={page <= 1}
        className={`flex items-center gap-1 rounded-md border border-border px-3 py-2 text-sm ${
          page <= 1 ? "pointer-events-none opacity-40" : "text-text-muted hover:bg-surface-2 hover:text-text"
        }`}
      >
        <ChevronLeft className="size-4" /> Anterior
      </Link>
      <span className="px-2 text-sm text-text-faint">
        Página {page} de {totalPages}
      </span>
      <Link
        href={buildHref(Math.min(totalPages, page + 1))}
        aria-disabled={page >= totalPages}
        className={`flex items-center gap-1 rounded-md border border-border px-3 py-2 text-sm ${
          page >= totalPages ? "pointer-events-none opacity-40" : "text-text-muted hover:bg-surface-2 hover:text-text"
        }`}
      >
        Siguiente <ChevronRight className="size-4" />
      </Link>
    </nav>
  );
}
