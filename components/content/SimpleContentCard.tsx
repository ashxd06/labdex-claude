import Image from "next/image";
import Link from "next/link";
import { SampleDataBadge } from "@/components/content/SampleDataBadge";

export function SimpleContentCard({
  href,
  title,
  subtitle,
  description,
  uppercase,
  sample,
  image,
}: {
  href: string;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  uppercase?: boolean;
  sample?: boolean;
  image?: string | null;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-5 transition-colors hover:border-accent"
    >
      {image && (
        <Image
          src={image}
          alt=""
          width={720}
          height={405}
          unoptimized
          className="h-40 w-full rounded-md bg-surface-2 object-contain"
        />
      )}
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
