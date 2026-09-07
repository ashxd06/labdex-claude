import Link from "next/link";
import { FileCheck2 } from "lucide-react";
import { listResults } from "@/lib/lab/queries";
import { Pagination } from "@/components/content/Pagination";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/lab/StatusBadge";

export const revalidate = 0;

const STATUS_OPTIONS = [
  { value: "todos", label: "Todos" },
  { value: "pendiente", label: "Pendiente" },
  { value: "ingresado", label: "Ingresado" },
  { value: "validado", label: "Validado" },
  { value: "informado", label: "Informado" },
];

interface ResultRow {
  id: string;
  result_value: string | null;
  status: string;
  created_at: string;
  lab_order_items: {
    analysis_id: string;
    result_type: string;
    clinical_analyses: { name: string } | null;
    lab_orders: { id: string; order_code: string; patients: { first_name: string; last_name: string } | null } | null;
  } | null;
}

export default async function ResultadosPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const { status, page } = await searchParams;
  const currentPage = Number.parseInt(page ?? "1", 10) || 1;
  const { rows, total, totalPages } = await listResults({ status, page: currentPage, pageSize: 20 });
  const results = rows as unknown as ResultRow[];

  function buildHref(targetPage: number) {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    params.set("page", String(targetPage));
    return `/laboratorio/resultados?${params.toString()}`;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold text-text">
          <FileCheck2 className="size-5 text-primary" /> Resultados
        </h1>
        <p className="mt-1 text-sm text-text-muted">{total} registrados</p>
      </div>

      <div className="flex items-center gap-1 rounded-md border border-border bg-surface p-1 w-fit">
        {STATUS_OPTIONS.map((opt) => (
          <Link
            key={opt.value}
            href={`/laboratorio/resultados?status=${opt.value}`}
            className={`rounded px-3 py-1.5 text-sm transition-colors ${
              (status ?? "todos") === opt.value ? "bg-primary-soft text-primary" : "text-text-muted hover:text-text"
            }`}
          >
            {opt.label}
          </Link>
        ))}
      </div>

      {results.length === 0 ? (
        <EmptyState icon={FileCheck2} title="No hay resultados registrados todavía." />
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-2 text-text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Solicitud</th>
                  <th className="px-4 py-3 font-medium">Paciente</th>
                  <th className="px-4 py-3 font-medium">Análisis</th>
                  <th className="px-4 py-3 font-medium">Resultado</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {results.map((r) => {
                  const orderItem = r.lab_order_items;
                  const order = orderItem?.lab_orders;
                  const patient = order?.patients;
                  return (
                    <tr key={r.id} className="bg-surface hover:bg-surface-2/60">
                      <td className="px-4 py-3">
                        {order && (
                          <Link
                            href={`/laboratorio/solicitudes/${order.id}`}
                            className="font-mono text-xs text-primary hover:text-primary-hover"
                          >
                            {order.order_code}
                          </Link>
                        )}
                      </td>
                      <td className="px-4 py-3 text-text">
                        {patient ? `${patient.first_name} ${patient.last_name}` : "—"}
                      </td>
                      <td className="px-4 py-3 text-text-muted">
                        {orderItem?.clinical_analyses?.name ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-text-muted">{r.result_value || "—"}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={r.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination page={currentPage} totalPages={totalPages} buildHref={buildHref} />
        </>
      )}
    </div>
  );
}
