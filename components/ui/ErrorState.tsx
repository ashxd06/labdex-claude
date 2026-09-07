import { TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";

interface ErrorStateProps {
  title?: string;
  description?: string;
  action?: ReactNode;
}

export function ErrorState({
  title = "Algo salió mal",
  description = "No se pudo completar la solicitud. Inténtalo de nuevo.",
  action,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-danger/30 bg-danger-soft py-10 text-center">
      <TriangleAlert className="size-7 text-danger" aria-hidden="true" />
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-text">{title}</p>
        <p className="max-w-sm text-sm text-text-muted">{description}</p>
      </div>
      {action}
    </div>
  );
}
