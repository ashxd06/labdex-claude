import { Check, Loader2 } from "lucide-react";

const KNOWN_STEPS = ["Archivo recibido", "PDF identificado", "Subida completada"];
const IN_PROGRESS_STEPS = [
  "Extrayendo contenido",
  "Analizando páginas visuales",
  "Organizando el material de estudio",
];

/**
 * Estado de procesamiento (Fase 6, §12). El backend procesa el documento de
 * forma síncrona en una sola petición, así que no hay una señal real de
 * progreso incremental: en vez de inventar un porcentaje, se muestran los
 * pasos ya garantizados como completados y el resto agrupado bajo un
 * indicador indeterminado, con honestidad sobre lo que sí y no se sabe.
 */
export function ProcessingOverlay() {
  return (
    <div className="rounded-lg border border-border bg-surface p-6">
      <p className="text-sm font-medium text-text">Procesando material…</p>
      <ul className="mt-3 flex flex-col gap-2">
        {KNOWN_STEPS.map((step) => (
          <li key={step} className="flex items-center gap-2 text-sm text-text-muted">
            <Check className="size-4 shrink-0 text-success" aria-hidden="true" />
            {step}
          </li>
        ))}
        <li className="flex items-center gap-2 text-sm text-text">
          <Loader2 className="size-4 shrink-0 animate-spin text-accent" aria-hidden="true" />
          {IN_PROGRESS_STEPS.join(" · ")}
        </li>
      </ul>
      <p className="mt-3 text-xs text-text-faint">
        Esto puede tardar varios minutos en documentos largos. No cierres esta ventana.
      </p>
    </div>
  );
}
