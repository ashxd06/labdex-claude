"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export const NAV_LINKS = [
  { href: "/", label: "Inicio" },
  { href: "/contenido", label: "Contenido" },
  { href: "/laboratorio", label: "Laboratorio" },
  { href: "/labdex-ai", label: "LABDEX AI" },
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

  return (
    <nav
      className={`flex ${orientation === "vertical" ? "flex-col gap-1" : "items-center gap-1"}`}
      aria-label="Navegación principal"
    >
      {NAV_LINKS.map((link) => {
        const isActive = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={onNavigate}
            aria-current={isActive ? "page" : undefined}
            className={`rounded-md px-3 py-2 text-sm font-medium transition-colors
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
    </nav>
  );
}
