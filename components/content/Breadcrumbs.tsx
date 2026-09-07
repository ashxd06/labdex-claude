import Link from "next/link";
import { ChevronRight } from "lucide-react";

export interface Crumb {
  label: string;
  href?: string;
}

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Ruta de navegación" className="flex items-center gap-1.5 overflow-x-auto text-sm">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <span key={index} className="flex items-center gap-1.5 whitespace-nowrap">
            {index > 0 && <ChevronRight className="size-3.5 shrink-0 text-text-faint" aria-hidden="true" />}
            {item.href && !isLast ? (
              <Link href={item.href} className="text-text-muted hover:text-text">
                {item.label}
              </Link>
            ) : (
              <span aria-current={isLast ? "page" : undefined} className={isLast ? "text-text" : "text-text-muted"}>
                {item.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
