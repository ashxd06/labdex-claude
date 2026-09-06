import { Loader2 } from "lucide-react";

export function Loading({ label = "Cargando…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-sm text-text-muted">
      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export function LoadingInline({ label }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-text-muted">
      <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
      {label}
    </span>
  );
}
