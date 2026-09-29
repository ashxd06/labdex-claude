"use client";

import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { usePathname } from "next/navigation";

export const NAV_LINKS = [
  { href: "/contenido", label: "Contenido" },
  { href: "/laboratorio", label: "Laboratorio" },
  { href: "/calculadoras", label: "Calculadoras" },
  { href: "/reto-diario", label: "Reto diario" },
  { href: "/estudio", label: "Estudio" },
];

export function Navigation({
  onNavigate,
  orientation = "horizontal",
}: {
  onNavigate?: () => void;
  orientation?: "horizontal" | "vertical";
}) {
  const pathname = usePathname();
  const moreActive = pathname.startsWith("/labdex-ai") || pathname.startsWith("/contenido/documentos");

  return (
    <nav
      className={`flex ${orientation === "vertical" ? "flex-col gap-1" : "items-center gap-0.5"}`}
      aria-label="Navegación principal"
    >
      {NAV_LINKS.map((link) => {
        const isActive = link.href === "/"
          ? pathname === "/"
          : pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={onNavigate}
            aria-current={isActive ? "page" : undefined}
            className={`whitespace-nowrap rounded-md px-2.5 py-2 text-sm font-medium transition-colors
              ${
                isActive
                  ? "text-text bg-surface-2"
                  : "text-text-muted hover:text-text hover:bg-surface-2"
              }`}
          >
            {link.label}
          </Link>
        );
      })}
      <details className={`group relative ${orientation === "vertical" ? "" : "shrink-0"}`}>
        <summary className={`flex cursor-pointer list-none items-center gap-1 whitespace-nowrap rounded-md px-2.5 py-2 text-sm font-medium transition-colors hover:bg-surface-2 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 ${moreActive ? "bg-surface-2 text-text" : "text-text-muted"}`}>
          Más <ChevronDown className="size-3.5 transition-transform group-open:rotate-180" aria-hidden="true" />
        </summary>
        <div className={`z-40 rounded-lg border border-border bg-surface p-1.5 shadow-[var(--ldx-shadow)] ${orientation === "vertical" ? "relative mt-1 ml-2" : "absolute right-0 top-full mt-2 min-w-52"}`}>
          <Link
            href="/labdex-ai"
            onClick={(event) => {
              event.currentTarget.closest("details")?.removeAttribute("open");
              onNavigate?.();
            }}
            aria-current={pathname === "/labdex-ai" ? "page" : undefined}
            className="block rounded-md px-3 py-2 text-sm text-text-muted hover:bg-surface-2 hover:text-text"
          >
            Asistente LABDEX AI
          </Link>
          <Link
            href="/contenido/documentos"
            onClick={(event) => {
              event.currentTarget.closest("details")?.removeAttribute("open");
              onNavigate?.();
            }}
            aria-current={pathname.startsWith("/contenido/documentos") ? "page" : undefined}
            className="block rounded-md px-3 py-2 text-sm text-text-muted hover:bg-surface-2 hover:text-text"
          >
            Documentos de consulta
          </Link>
        </div>
      </details>
    </nav>
  );
}
