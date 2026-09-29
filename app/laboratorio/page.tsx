import Link from "next/link";
import { AlertTriangle, Users, TestTube, ClipboardList, FileCheck2, FileStack, Plus, Clock3 } from "lucide-react";
import { getDashboardStats, getRecentActivity, getOldestOpenOrders } from "@/lib/lab/queries";
import { StatusBadge } from "@/components/lab/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";

export const revalidate = 0;

export default async function LaboratorioDashboard() {
  const [stats, activity, oldest] = await Promise.all([
    getDashboardStats(),
    getRecentActivity(),
    getOldestOpenOrders(),
  ]);

  const quickActions = [
    { label: "Nuevo paciente", href: "/laboratorio/pacientes/nuevo", icon: Users },
    { label: "Nueva muestra", href: "/laboratorio/muestras/nueva", icon: TestTube },
    { label: "Nueva solicitud", href: "/laboratorio/solicitudes/nueva", icon: ClipboardList },
    { label: "Revisar resultados", href: "/laboratorio/resultados?status=pendientes", icon: FileCheck2 },
  ];

  const cards = [
    { icon: ClipboardList, label: "Solicitudes abiertas", value: stats.pendingOrders, href: "/laboratorio/solicitudes?status=abiertas" },
    { icon: AlertTriangle, label: "Urgentes", value: stats.urgentOrders, href: "/laboratorio/solicitudes?status=abiertas&priority=urgente", urgent: true },
    { icon: FileCheck2, label: "Resultados por revisar", value: stats.pendingResults, href: "/laboratorio/resultados?status=pendientes" },
    { icon: Users, label: "Pacientes", value: stats.patients, href: "/laboratorio/pacientes" },
    { icon: TestTube, label: "Muestras", value: stats.samples, href: "/laboratorio/muestras" },
    { icon: FileStack, label: "Informes emitidos", value: stats.issuedReports, href: "/laboratorio/informes" },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold text-text">Laboratorio</h1>
        <p className="mt-1 text-sm text-text-muted">Centro operativo del laboratorio clínico.</p>
      </div>

      {stats.hasErrors && (
        <div role="status" className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm text-text">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
          <span>Algunos indicadores no pudieron cargarse. Se muestran como “—” para no confundir un error con cero registros.</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <StatCard key={card.label} {...card} />
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        {quickActions.map((action) => (
          <Link key={action.href} href={action.href} className="flex min-h-11 items-center gap-2 rounded-md border border-border bg-surface px-4 py-2.5 text-sm text-text transition-colors hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60">
            <Plus className="size-4" aria-hidden="true" /> {action.label}
          </Link>
        ))}
      </div>

      <section>
        <div className="flex items-center gap-2">
          <Clock3 className="size-4 text-primary" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-text">Solicitudes abiertas más antiguas</h2>
        </div>
        {oldest.error ? (
          <p className="mt-3 rounded-lg border border-border bg-surface p-4 text-sm text-text-muted">No se pudieron cargar las solicitudes abiertas.</p>
        ) : oldest.rows.length === 0 ? (
          <div className="mt-3"><EmptyState icon={ClipboardList} title="No hay solicitudes abiertas." description="Las solicitudes pendientes o en proceso aparecerán aquí." /></div>
        ) : (
          <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {oldest.rows.map((row) => (
              <Link key={row.id} href={`/laboratorio/solicitudes/${row.id}`} className="rounded-lg border border-border bg-surface p-4 transition-colors hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs text-primary">{row.orderCode}</span>
                  <div className="flex items-center gap-2">
                    {row.priority === "urgente" && <PriorityBadge />}
                    <StatusBadge status={row.status} />
                  </div>
                </div>
                <p className="mt-3 truncate text-sm font-medium text-text">{row.patientName}</p>
                <p className="mt-1 text-xs text-text-muted">Desde {formatLabDate(row.date)}</p>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-sm font-semibold text-text">Solicitudes recientes</h2>
        {activity.error ? (
          <p className="mt-3 rounded-lg border border-border bg-surface p-4 text-sm text-text-muted">No se pudo cargar la actividad reciente.</p>
        ) : activity.rows.length === 0 ? (
          <div className="mt-3"><EmptyState icon={ClipboardList} title="Sin actividad todavía." description="Registra un paciente y crea una solicitud para empezar." /></div>
        ) : (
          <>
            <div className="mt-3 space-y-3 sm:hidden">
              {activity.rows.map((row) => (
                <Link key={row.id} href={`/laboratorio/solicitudes/${row.id}`} className="block rounded-lg border border-border bg-surface p-4 transition-colors hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs text-text-muted">{formatLabDate(row.date)}</span>
                    <div className="flex items-center gap-2">{row.priority === "urgente" && <PriorityBadge />}<StatusBadge status={row.status} /></div>
                  </div>
                  <p className="mt-2 truncate text-sm font-medium text-text">{row.patientName}</p>
                  <div className="mt-3 flex items-center justify-between gap-3 text-xs">
                    <span className="font-mono text-primary">{row.orderCode}</span>
                    <span className="text-text-faint">Informe: {row.reportNumber ?? "—"}</span>
                  </div>
                </Link>
              ))}
            </div>
            <div className="mt-3 hidden overflow-x-auto rounded-lg border border-border sm:block">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface-2 text-text-muted"><tr><th className="px-4 py-3 font-medium">Fecha</th><th className="px-4 py-3 font-medium">Paciente</th><th className="px-4 py-3 font-medium">Solicitud</th><th className="px-4 py-3 font-medium">Prioridad / estado</th><th className="px-4 py-3 font-medium">Informe</th></tr></thead>
                <tbody className="divide-y divide-border">
                  {activity.rows.map((row) => (
                    <tr key={row.id} className="bg-surface hover:bg-surface-2/60">
                      <td className="px-4 py-3 text-text-muted">{formatLabDate(row.date)}</td>
                      <td className="px-4 py-3 text-text">{row.patientName}</td>
                      <td className="px-4 py-3"><Link href={`/laboratorio/solicitudes/${row.id}`} className="font-mono text-xs text-primary hover:text-primary-hover">{row.orderCode}</Link></td>
                      <td className="px-4 py-3"><div className="flex items-center gap-2">{row.priority === "urgente" && <PriorityBadge />}<StatusBadge status={row.status} /></div></td>
                      <td className="px-4 py-3 font-mono text-xs text-text-faint">{row.reportNumber ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, href, urgent = false }: {
  icon: typeof Users;
  label: string;
  value: number | null;
  href: string;
  urgent?: boolean;
}) {
  const displayValue = value ?? "—";
  return (
    <Link href={href} aria-label={`${label}: ${value === null ? "no disponible" : value}. Abrir sección de ${label.toLowerCase()}`} className={`group flex min-h-20 items-center gap-3 rounded-lg border bg-surface p-4 transition-colors hover:bg-surface-2/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 ${urgent ? "border-warning/50 hover:border-warning" : "border-border hover:border-accent"}`}>
      <span className={`flex size-9 shrink-0 items-center justify-center rounded-md ${urgent ? "bg-warning/10 text-warning" : "bg-primary-soft text-primary"}`}><Icon className="size-4" aria-hidden="true" /></span>
      <div className="min-w-0"><p className="text-xl font-semibold tabular-nums text-text">{displayValue}</p><p className="text-xs text-text-muted">{label}</p></div>
    </Link>
  );
}

function PriorityBadge() {
  return <span className="rounded-full bg-warning/10 px-2 py-1 text-[11px] font-medium text-warning">Urgente</span>;
}

function formatLabDate(value: string) {
  return new Intl.DateTimeFormat("es-PE", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Lima" }).format(new Date(value));
}
