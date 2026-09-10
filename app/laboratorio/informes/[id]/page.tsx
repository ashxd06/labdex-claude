import { notFound } from "next/navigation";
import Link from "next/link";
import { Download } from "lucide-react";
import { getReportById, getOrderWithDetails } from "@/lib/lab/queries";
import { calculateAge } from "@/lib/lab/shared";
import { evaluateReportIssuance } from "@/lib/lab/workflow";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { StatusBadge } from "@/components/lab/StatusBadge";
import { ResultFlag } from "@/components/lab/ResultFlag";
import { ReportActions } from "@/components/lab/ReportActions";

export const revalidate = 0;

export default async function ReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const report = await getReportById(id);
  if (!report) notFound();

  const details = await getOrderWithDetails(report.order_id);
  if (!details || !details.patient) notFound();
  const { order, patient, sample, items } = details;
  const issuance = evaluateReportIssuance(order.status);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-mono text-lg font-semibold text-text">{report.report_number}</h1>
          <p className="mt-1 text-sm text-text-muted">
            Creado el {new Date(report.created_at).toLocaleDateString("es")}
          </p>
        </div>
        <StatusBadge status={report.status} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-text">Paciente</h2>
          </CardHeader>
          <CardBody className="flex flex-col gap-1 text-sm text-text-muted">
            <Link href={`/laboratorio/pacientes/${patient.id}`} className="font-medium text-text hover:text-primary">
              {patient.first_name} {patient.last_name}
            </Link>
            <p>Documento: {patient.document_id || "—"}</p>
            <p>Edad: {calculateAge(patient.birth_date) ?? "—"}</p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-text">Muestra</h2>
          </CardHeader>
          <CardBody className="flex flex-col gap-1 text-sm text-text-muted">
            {sample ? (
              <>
                <p className="font-mono text-xs text-text">{sample.sample_code}</p>
                <p>{sample.sample_type}</p>
              </>
            ) : (
              "Sin muestra asociada."
            )}
          </CardBody>
        </Card>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-text">Resultados</h2>
        <div className="mt-2 overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-2 text-text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Examen</th>
                <th className="px-4 py-3 font-medium">Resultado</th>
                <th className="px-4 py-3 font-medium">Unidad</th>
                <th className="px-4 py-3 font-medium">Valores de referencia</th>
                <th className="px-4 py-3 font-medium">Interpretación</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((item) => (
                <tr key={item.id} className="bg-surface">
                  <td className="px-4 py-3 text-text">{item.clinical_analyses.name}</td>
                  <td className="px-4 py-3 text-text-muted">{item.lab_results?.result_value || "—"}</td>
                  <td className="px-4 py-3 text-text-muted">{item.lab_results?.unit || "—"}</td>
                  <td className="px-4 py-3 text-text-muted">
                    {item.lab_results?.reference_range_text || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <ResultFlag flag={item.lab_results?.flag ?? null} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <a
          href={`/laboratorio/informes/${id}/pdf`}
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-hover"
        >
          <Download className="size-4" /> Descargar PDF
        </a>
        <ReportActions reportId={id} status={report.status} canIssue={issuance.canIssue} pendingReason={issuance.reason} />
      </div>
    </div>
  );
}
