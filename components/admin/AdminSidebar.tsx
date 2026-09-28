"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Microscope,
  FlaskConical,
  ClipboardCheck,
  Workflow,
  FileStack,
  Tags,
  Users,
  Settings,
  Sparkles,
} from "lucide-react";

const SECTIONS = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/admin" },
  { icon: Tags, label: "Categorías", href: "/admin/categorias" },
  { icon: Microscope, label: "Microorganismos", href: "/admin/microorganismos" },
  { icon: FlaskConical, label: "Medios de cultivo", href: "/admin/medios" },
  { icon: ClipboardCheck, label: "Pruebas", href: "/admin/pruebas" },
  { icon: Workflow, label: "Procedimientos", href: "/admin/procedimientos" },
  { icon: FileStack, label: "Análisis clínicos", href: "/admin/analisis" },
  { icon: FileStack, label: "Documentos", href: "/admin/documentos" },
];

const SYSTEM = [
  { icon: Sparkles, label: "LABDEX AI", href: "/admin/ai" },
  { icon: Users, label: "Usuarios", href: null },
  { icon: Settings, label: "Configuración", href: null },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <>
      <aside className="hidden w-60 shrink-0 border-r border-border px-3 py-6 md:block">
        <p className="px-3 text-xs font-medium uppercase tracking-wide text-text-faint">
          Contenido
        </p>
        <nav className="mt-2 flex flex-col gap-0.5" aria-label="Contenido administrativo">
          {SECTIONS.map((item) => (
            <SidebarItem
              key={item.label}
              {...item}
              active={isActive(pathname, item.href)}
            />
          ))}
        </nav>

        <p className="mt-6 px-3 text-xs font-medium uppercase tracking-wide text-text-faint">
          Sistema
        </p>
        <nav className="mt-2 flex flex-col gap-0.5" aria-label="Sistema administrativo">
          {SYSTEM.map((item) => (
            <SidebarItem
              key={item.label}
              {...item}
              active={isActive(pathname, item.href)}
            />
          ))}
        </nav>
      </aside>

      <nav
        className="flex w-full gap-2 overflow-x-auto border-b border-border bg-bg-raised px-4 py-3 md:hidden"
        aria-label="Administración"
      >
        {SECTIONS.filter((item) => item.href).map((item) => (
          <MobileAdminItem key={item.label} {...item} active={isActive(pathname, item.href)} />
        ))}
        {SYSTEM.filter((item) => item.href).map((item) => (
          <MobileAdminItem key={item.label} {...item} active={isActive(pathname, item.href)} />
        ))}
      </nav>
    </>
  );
}

function isActive(pathname: string | null, href: string | null) {
  if (!href) return false;
  return href === "/admin" ? pathname === "/admin" : pathname?.startsWith(href);
}

function SidebarItem({
  icon: Icon,
  label,
  href,
  active,
}: {
  icon: typeof LayoutDashboard;
  label: string;
  href: string | null;
  active?: boolean;
}) {
  if (!href) {
    return (
      <button
        disabled
        title="Disponible en una próxima fase"
        className="flex cursor-not-allowed items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm text-text-faint"
      >
        <Icon className="size-4" />
        {label}
      </button>
    );
  }

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors
        ${active ? "bg-surface-2 text-text" : "text-text-muted hover:bg-surface-2 hover:text-text"}`}
    >
      <Icon className="size-4" />
      {label}
    </Link>
  );
}

function MobileAdminItem({
  icon: Icon,
  label,
  href,
  active,
}: {
  icon: typeof LayoutDashboard;
  label: string;
  href: string | null;
  active?: boolean;
}) {
  if (!href) return null;

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-md border px-3 text-sm font-medium transition-colors
        ${active ? "border-primary bg-primary text-white" : "border-border bg-surface text-text-muted hover:border-accent hover:text-text"}`}
    >
      <Icon className="size-4" aria-hidden="true" />
      {label}
    </Link>
  );
}
