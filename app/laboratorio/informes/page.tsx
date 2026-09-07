import Link from "next/link";
import { FileStack } from "lucide-react";
import { listReports } from "@/lib/lab/queries";
import { Pagination } from "@/components/content/Pagination";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/lab/StatusBadge";
import type { LabReport } from "@/lib/supabase/labTypes";

export const revalidate = 0;

type ReportRow = LabReport & { patients: { first_name: string; last_name: string } | null };

export default async function InformesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page } = await searchParams;
  const currentPage = Number.parseInt(page ?? "1", 10) || 1;
  const { rows, total, totalPages } = await listReports({ page: currentPage, pageSize: 20 });
  const reports = rows as unknown as ReportRow[];

  function buildHref(targetPage: number) {
    return `/laboratorio/informes?page=${targetPage}`;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold text-text">
          <FileStack className="size-5 text-primary" /> Informes
        </h1>
        <p className="mt-1 text-sm text-text-muted">{total} generados</p>
      </div>

      {reports.length === 0 ? (
        <EmptyState
          icon={FileStack}
          title="No hay informes generados todavía."
          description="Genera un informe desde el detalle de una solicitud."
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-2 text-text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Número</th>
                  <th className="px-4 py-3 font-medium">Paciente</th>
                  <th className="px-4 py-3 font-medium">Fecha</th>
                  <th className="px-4 py-3 font-medium">Responsable</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {reports.map((r) => (
                  <tr key={r.id} className="bg-surface hover:bg-surface-2/60">
                    <td className="px-4 py-3">
                      <Link href={`/laboratorio/informes/${r.id}`} className="font-mono text-xs text-primary hover:text-primary-hover">
                        {r.report_number}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-text">
                      {r.patients ? `${r.patients.first_name} ${r.patients.last_name}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-text-muted">
                      {new Date(r.created_at).toLocaleDateString("es")}
                    </td>
                    <td className="px-4 py-3 text-text-muted">{r.responsible_name || "—"}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={r.status} />
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
