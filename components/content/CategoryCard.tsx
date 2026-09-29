import Link from "next/link";
import { ArrowRight, type LucideIcon } from "lucide-react";
import {
  Microscope,
  Droplets,
  FlaskConical,
  Bug,
  ShieldCheck,
  ScanEye,
  Tags,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  microscope: Microscope,
  droplets: Droplets,
  "flask-conical": FlaskConical,
  bug: Bug,
  "shield-check": ShieldCheck,
  "scan-eye": ScanEye,
};

export function CategoryCard({
  slug,
  name,
  description,
  icon,
  count,
}: {
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  /** `null` significa que la consulta del conteo falló — nunca se usa `0`
   * para representar un error (Fase 7, §2/§31). */
  count: number | null;
}) {
  const Icon = (icon && ICONS[icon]) || Tags;

  const cardClass = `flex flex-col items-center gap-3 rounded-xl border border-border bg-surface p-6 text-center shadow-[var(--ldx-shadow)] transition-colors sm:p-8 ${
    count === 0 ? "" : "group hover:border-accent"
  }`;

  const content = (
    <>
      <span className="flex size-14 items-center justify-center rounded-full bg-primary-soft text-primary">
        <Icon className="size-6" aria-hidden="true" />
      </span>
      <h2 className="text-base font-semibold uppercase tracking-wide text-text">{name}</h2>
      {description && <p className="text-sm text-text-muted">{description}</p>}
      <p className="font-mono text-xs text-text-muted">
        {count === null
          ? "Conteo no disponible"
          : `${count} ${count === 1 ? "contenido publicado" : "contenidos publicados"}`}
      </p>
      {count === 0 ? (
        <span className="mt-1 rounded-full bg-surface-2 px-3 py-1 text-xs font-medium text-text-muted">
          Contenido en preparación
        </span>
      ) : (
        <span className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-accent">
          Explorar <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
        </span>
      )}
    </>
  );

  if (count === 0) {
    return <div className={cardClass} aria-label={`${name}: contenido en preparación`}>
      {content}
    </div>;
  }

  return <Link href={`/contenido/${slug}`} className={cardClass}>{content}</Link>;
}
