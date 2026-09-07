"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  TestTube,
  ClipboardList,
  FileCheck2,
  FileStack,
  Settings,
} from "lucide-react";

const LINKS = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/laboratorio" },
  { icon: Users, label: "Pacientes", href: "/laboratorio/pacientes" },
  { icon: TestTube, label: "Muestras", href: "/laboratorio/muestras" },
  { icon: ClipboardList, label: "Solicitudes", href: "/laboratorio/solicitudes" },
  { icon: FileCheck2, label: "Resultados", href: "/laboratorio/resultados" },
  { icon: FileStack, label: "Informes", href: "/laboratorio/informes" },
  { icon: Settings, label: "Configuración", href: "/laboratorio/configuracion" },
];

export function LabSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-56 shrink-0 border-r border-border px-3 py-6 md:block">
      <nav className="flex flex-col gap-0.5">
        {LINKS.map((link) => {
          const active =
            link.href === "/laboratorio" ? pathname === "/laboratorio" : pathname?.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${
                active ? "bg-surface-2 text-text" : "text-text-muted hover:bg-surface-2 hover:text-text"
              }`}
            >
              <link.icon className="size-4" />
              {link.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
