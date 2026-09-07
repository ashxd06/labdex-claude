import Link from "next/link";
import { KIND_VALUE_TO_LABEL, KIND_VALUE_TO_SLUG } from "@/lib/content/kindSlugs";
import { SampleDataBadge } from "@/components/content/SampleDataBadge";
import { Badge } from "@/components/ui/Badge";
import type { Microorganism } from "@/lib/supabase/types";

export function MicroorganismCard({ item }: { item: Microorganism }) {
  return (
    <Link
      href={`/contenido/microbiologia/${KIND_VALUE_TO_SLUG[item.kind]}/${item.slug}`}
      className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-5 transition-colors hover:border-accent"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-text">
          {item.scientific_name}
        </h3>
        <Badge tone="primary">{KIND_VALUE_TO_LABEL[item.kind]}</Badge>
      </div>
      {item.common_name && <p className="text-sm text-text-muted">{item.common_name}</p>}
      {item.description && (
        <p className="line-clamp-2 text-sm text-text-muted">{item.description}</p>
      )}
      <SampleDataBadge show={item.is_sample_data} />
    </Link>
  );
}
