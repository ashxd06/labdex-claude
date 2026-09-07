import Link from "next/link";
import { Users, TestTube, ClipboardList, FileCheck2, FileStack, Plus } from "lucide-react";
import { getDashboardStats, getRecentActivity } from "@/lib/lab/queries";
import { StatusBadge } from "@/components/lab/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";

export const revalidate = 0;

export default async function LaboratorioDashboard() {
  const [stats, activity] = await Promise.all([getDashboardStats(), getRecentActivity()]);

  const quickActions = [
    { label: "Nuevo paciente", href: "/laboratorio/pacientes/nuevo", icon: Users },
    { label: "Nueva muestra", href: "/laboratorio/muestras/nueva", icon: TestTube },
    { label: "Nueva solicitud", href: "/laboratorio/solicitudes/nueva", icon: ClipboardList },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold text-text">Laboratorio</h1>
        <p className="mt-1 text-sm text-text-muted">Centro operativo del laboratorio clínico.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard icon={Users} label="Pacientes" value={stats.patients} />
        <StatCard icon={TestTube} label="Muestras" value={stats.samples} />
        <StatCard icon={ClipboardList} label="Solicitudes pendientes" value={stats.pendingOrders} />
        <StatCard icon={FileCheck2} label="Resultados pendientes" value={stats.pendingResults} />
        <StatCard icon={FileStack} label="Informes emitidos" value={stats.issuedReports} />
      </div>

      <div className="flex flex-wrap gap-3">
        {quickActions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="flex items-center gap-2 rounded-md border border-border bg-surface px-4 py-2.5 text-sm text-text transition-colors hover:border-accent hover:text-accent"
          >
            <Plus className="size-4" /> {action.label}
          </Link>
        ))}
      </div>

      <div>
        <h2 className="text-sm font-semibold text-text">Actividad reciente</h2>
        {activity.length === 0 ? (
          <div className="mt-3">
            <EmptyState
              icon={ClipboardList}
              title="Sin actividad todavía."
              description="Registra un paciente y crea una solicitud para empezar."
            />
          </div>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-2 text-text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Fecha</th>
                  <th className="px-4 py-3 font-medium">Paciente</th>
                  <th className="px-4 py-3 font-medium">Solicitud</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium">Informe</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {activity.map((row) => (
                  <tr key={row.id} className="bg-surface hover:bg-surface-2/60">
                    <td className="px-4 py-3 text-text-muted">
                      {new Date(row.date).toLocaleDateString("es")}
                    </td>
                    <td className="px-4 py-3 text-text">{row.patientName}</td>
                    <td className="px-4 py-3">
                      <Link href={`/laboratorio/solicitudes/${row.id}`} className="font-mono text-xs text-primary hover:text-primary-hover">
                        {row.orderCode}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-text-faint">
                      {row.reportNumber ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: number }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-surface p-4">
      <span className="flex size-9 items-center justify-center rounded-md bg-primary-soft text-primary">
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <div>
        <p className="text-xl font-semibold tabular-nums text-text">{value}</p>
        <p className="text-xs text-text-muted">{label}</p>
      </div>
    </div>
  );
}
