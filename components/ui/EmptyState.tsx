import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";
import type { ReactNode } from "react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border py-14 text-center">
      <Icon className="size-8 text-text-faint" aria-hidden="true" />
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-text">{title}</p>
        {description && (
          <p className="max-w-sm text-sm text-text-muted">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
