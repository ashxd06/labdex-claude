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
  count: number;
}) {
  const Icon = (icon && ICONS[icon]) || Tags;

  return (
    <Link
      href={`/contenido/${slug}`}
      className="group flex flex-col items-center gap-3 rounded-lg border border-border bg-surface p-8 text-center transition-colors hover:border-accent"
    >
      <span className="flex size-14 items-center justify-center rounded-full bg-primary-soft text-primary">
        <Icon className="size-6" aria-hidden="true" />
      </span>
      <h2 className="text-base font-semibold uppercase tracking-wide text-text">{name}</h2>
      {description && <p className="text-sm text-text-muted">{description}</p>}
      <p className="font-mono text-xs text-text-faint">
        {count} {count === 1 ? "contenido" : "contenidos"}
      </p>
      <span className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-accent">
        Explorar <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}
