import type { LucideIcon } from "lucide-react";

export function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-lg border border-border bg-surface p-5">
      <span className="flex size-10 items-center justify-center rounded-md bg-primary-soft text-primary">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <div>
        <p className="text-2xl font-semibold tabular-nums text-text">{value}</p>
        <p className="text-sm text-text-muted">{label}</p>
      </div>
    </div>
  );
}
