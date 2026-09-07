import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";

interface ModulePreviewCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  available?: boolean;
  href?: string;
  countLabel?: string;
}

export function ModulePreviewCard({
  icon: Icon,
  title,
  description,
  available = false,
  href,
  countLabel,
}: ModulePreviewCardProps) {
  const content = (
    <>
      <div className="flex items-start justify-between">
        <span className="flex size-9 items-center justify-center rounded-md bg-primary-soft text-primary">
          <Icon className="size-5" aria-hidden="true" />
        </span>
        {!available && <Badge tone="neutral">Próximamente</Badge>}
      </div>
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-text">{title}</h3>
        {description && <p className="mt-1 text-sm text-text-muted">{description}</p>}
        {countLabel && <p className="mt-2 font-mono text-xs text-text-faint">{countLabel}</p>}
      </div>
      {available && href && (
        <span className="mt-auto inline-flex items-center text-sm font-medium text-accent">
          Explorar →
        </span>
      )}
    </>
  );

  const className = `group relative flex flex-col gap-3 rounded-lg border border-border bg-surface p-5 transition-colors
        ${available ? "hover:border-accent" : "opacity-80"}`;

  if (href && available) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }

  return <div className={className}>{content}</div>;
}
