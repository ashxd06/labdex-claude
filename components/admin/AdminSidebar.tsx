import {
  LayoutDashboard,
  Microscope,
  FlaskConical,
  ClipboardCheck,
  Workflow,
  FileStack,
  Users,
  Settings,
} from "lucide-react";

const SECTIONS = [
  { icon: LayoutDashboard, label: "Dashboard" },
  { icon: Microscope, label: "Microorganismos" },
  { icon: FlaskConical, label: "Medios de cultivo" },
  { icon: ClipboardCheck, label: "Pruebas" },
  { icon: Workflow, label: "Procedimientos" },
  { icon: FileStack, label: "Análisis clínicos" },
  { icon: FileStack, label: "Documentos" },
];

const SYSTEM = [
  { icon: Users, label: "Usuarios" },
  { icon: Settings, label: "Configuración" },
];

export function AdminSidebar() {
  return (
    <aside className="hidden w-60 shrink-0 border-r border-border px-3 py-6 md:block">
      <p className="px-3 text-xs font-medium uppercase tracking-wide text-text-faint">
        Contenido
      </p>
      <nav className="mt-2 flex flex-col gap-0.5">
        {SECTIONS.map((item, i) => (
          <SidebarItem key={i} {...item} disabled={item.label !== "Dashboard"} />
        ))}
      </nav>

      <p className="mt-6 px-3 text-xs font-medium uppercase tracking-wide text-text-faint">
        Sistema
      </p>
      <nav className="mt-2 flex flex-col gap-0.5">
        {SYSTEM.map((item, i) => (
          <SidebarItem key={i} {...item} disabled />
        ))}
      </nav>
    </aside>
  );
}

function SidebarItem({
  icon: Icon,
  label,
  disabled,
}: {
  icon: typeof LayoutDashboard;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      disabled={disabled}
      title={disabled ? "Disponible en una próxima fase" : undefined}
      className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm transition-colors
        ${
          disabled
            ? "cursor-not-allowed text-text-faint"
            : "text-text-muted hover:bg-surface-2 hover:text-text"
        }`}
    >
      <Icon className="size-4" />
      {label}
    </button>
  );
}
