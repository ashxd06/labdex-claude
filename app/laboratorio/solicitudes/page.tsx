import Link from "next/link";
import { ClipboardList, Plus } from "lucide-react";
import { listOrders } from "@/lib/lab/queries";
import { Pagination } from "@/components/content/Pagination";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/lab/StatusBadge";
import type { LabOrder } from "@/lib/supabase/labTypes";

export const revalidate = 0;

type OrderRow = LabOrder & { patients: { first_name: string; last_name: string } | null };

const STATUS_OPTIONS = [
  { value: "todos", label: "Todos" },
  { value: "pendiente", label: "Pendiente" },
  { value: "en_proceso", label: "En proceso" },
  { value: "completada", label: "Completada" },
  { value: "cancelada", label: "Cancelada" },
];

export default async function SolicitudesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const { status, page } = await searchParams;
  const currentPage = Number.parseInt(page ?? "1", 10) || 1;
  const { rows, total, totalPages } = await listOrders({ status, page: currentPage, pageSize: 20 });
  const orders = rows as unknown as OrderRow[];

  function buildHref(targetPage: number) {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    params.set("page", String(targetPage));
    return `/laboratorio/solicitudes?${params.toString()}`;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-text">
            <ClipboardList className="size-5 text-primary" /> Solicitudes
          </h1>
          <p className="mt-1 text-sm text-text-muted">{total} registradas</p>
        </div>
        <Link href="/laboratorio/solicitudes/nueva">
          <Button size="sm">
            <Plus className="size-4" /> Nueva solicitud
          </Button>
        </Link>
      </div>

      <form className="flex items-center gap-1 rounded-md border border-border bg-surface p-1 w-fit">
        {STATUS_OPTIONS.map((opt) => (
          <Link
            key={opt.value}
            href={`/laboratorio/solicitudes?status=${opt.value}`}
            className={`rounded px-3 py-1.5 text-sm transition-colors ${
              (status ?? "todos") === opt.value ? "bg-primary-soft text-primary" : "text-text-muted hover:text-text"
            }`}
          >
            {opt.label}
          </Link>
        ))}
      </form>

      {orders.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No hay solicitudes registradas todavía."
          description="Crea la primera solicitud para comenzar."
          action={
            <Link href="/laboratorio/solicitudes/nueva">
              <Button size="sm">
                <Plus className="size-4" /> Nueva solicitud
              </Button>
            </Link>
          }
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-2 text-text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Código</th>
                  <th className="px-4 py-3 font-medium">Paciente</th>
                  <th className="px-4 py-3 font-medium">Prioridad</th>
                  <th className="px-4 py-3 font-medium">Fecha</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {orders.map((o) => (
                  <tr key={o.id} className="bg-surface hover:bg-surface-2/60">
                    <td className="px-4 py-3">
                      <Link href={`/laboratorio/solicitudes/${o.id}`} className="font-mono text-xs text-primary hover:text-primary-hover">
                        {o.order_code}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-text">
                      {o.patients ? `${o.patients.first_name} ${o.patients.last_name}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-text-muted capitalize">{o.priority}</td>
                    <td className="px-4 py-3 text-text-muted">
                      {new Date(o.requested_at).toLocaleDateString("es")}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={o.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={currentPage} totalPages={totalPages} buildHref={buildHref} />
        </>
      )}
    </div>
  );
}
