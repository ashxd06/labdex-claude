import Link from "next/link";
import { SampleDataBadge } from "@/components/content/SampleDataBadge";

export function SimpleContentCard({
  href,
  title,
  subtitle,
  description,
  uppercase,
  sample,
}: {
  href: string;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  uppercase?: boolean;
  sample?: boolean;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-5 transition-colors hover:border-accent"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className={`text-sm font-semibold text-text ${uppercase ? "uppercase tracking-wide" : ""}`}>
          {title}
        </h3>
        <SampleDataBadge show={sample} />
      </div>
      {subtitle && <p className="text-xs text-text-faint">{subtitle}</p>}
      {description && <p className="line-clamp-2 text-sm text-text-muted">{description}</p>}
      <span className="mt-1 text-sm font-medium text-accent">Ver información →</span>
    </Link>
  );
}
