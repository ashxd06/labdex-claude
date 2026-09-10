"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Loader2 } from "lucide-react";
import { updateSampleStatus } from "@/lib/lab/actions";
import { allowedSampleStatusTransitions } from "@/lib/lab/workflow";
import type { SampleStatus } from "@/lib/supabase/labTypes";

const STATUS_ACTION_LABELS: Record<SampleStatus, string> = {
  pendiente: "Marcar recibida",
  recibida: "Marcar recibida",
  en_proceso: "Marcar en proceso",
  procesada: "Marcar procesada",
  rechazada: "Rechazar muestra",
};

/**
 * Acciones rápidas de la fila de una muestra en `/laboratorio/muestras`
 * (Fase 4, §3): solo ofrece las transiciones válidas desde el estado
 * actual (ver `lib/lab/workflow.ts`), nunca todas — así no se puede saltar
 * de "recibida" directo a "procesada" por accidente.
 */
export function SampleRowActions({ sampleId, status }: { sampleId: string; status: SampleStatus }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const options = allowedSampleStatusTransitions(status);
  if (options.length === 0) return <span className="text-text-faint">—</span>;

  function handleSelect(next: SampleStatus) {
    setOpen(false);
    startTransition(async () => {
      await updateSampleStatus(sampleId, next);
      router.refresh();
    });
  }

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={pending}
        aria-label="Cambiar estado de la muestra"
        aria-expanded={open}
        className="rounded-md p-1.5 text-text-muted hover:bg-surface-2 hover:text-text disabled:opacity-50"
      >
        {pending ? (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        ) : (
          <MoreHorizontal className="size-4" aria-hidden="true" />
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-1 w-44 rounded-md border border-border bg-surface py-1 shadow-lg">
            {options.map((next) => (
              <button
                key={next}
                type="button"
                onClick={() => handleSelect(next)}
                className="block w-full px-3 py-2 text-left text-sm text-text hover:bg-surface-2"
              >
                {STATUS_ACTION_LABELS[next]}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
