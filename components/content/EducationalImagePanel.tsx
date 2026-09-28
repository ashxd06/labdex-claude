import { Eye, Sparkles } from "lucide-react";
import { LightboxImage } from "@/components/content/LightboxImage";

export function EducationalImagePanel({
  src,
  title,
  alt,
  caption,
  observation,
}: {
  src: string;
  title: string;
  alt: string;
  caption: string | null;
  observation: string | null;
}) {
  return (
    <section className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/10 via-surface to-surface p-4 sm:p-5">
      <div className="mb-4 flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <Sparkles className="size-5" aria-hidden="true" />
        </span>
        <div>
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary">
            <Eye className="size-3.5" aria-hidden="true" />
            Aprende observando
          </p>
          <h2 className="mt-1 text-base font-semibold text-text">{title}</h2>
          <p className="mt-1 text-sm text-text-muted">
            Toca la imagen para ampliarla y ver mejor sus detalles.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-[1.15fr_0.85fr] md:items-start">
        <LightboxImage
          src={src}
          alt={alt}
          caption={caption || "Imagen de apoyo para el aprendizaje"}
          fit="contain"
        />

        <div className="rounded-lg border border-border bg-surface/80 p-4">
          <p className="text-sm font-medium text-text">Primero, observa por tu cuenta</p>
          <p className="mt-1 text-sm text-text-muted">
            ¿Qué rasgo, color o patrón te ayuda a reconocer lo que muestra esta imagen?
          </p>
          {observation ? (
            <details className="mt-4 rounded-md border border-primary/20 bg-primary/5 p-3">
              <summary className="min-h-11 cursor-pointer content-center text-sm font-semibold text-primary">
                Revelar pista de observación
              </summary>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-text-muted">
                {observation}
              </p>
            </details>
          ) : (
            <p className="mt-4 rounded-md border border-border bg-surface-2 p-3 text-xs text-text-faint">
              Pronto habrá una pista para ayudarte a interpretar esta imagen.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
