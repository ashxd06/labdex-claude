import { notFound } from "next/navigation";
import Link from "next/link";
import { getOrderWithDetails, getAvailableAnalysesForOrder } from "@/lib/lab/queries";
import { calculateAge } from "@/lib/lab/shared";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { StatusBadge } from "@/components/lab/StatusBadge";
import { AddAnalysisForm } from "@/components/lab/AddAnalysisForm";
import { ResultEntry } from "@/components/lab/ResultEntry";
import { OrderActions } from "@/components/lab/OrderActions";
import { EmptyState } from "@/components/ui/EmptyState";
import { ClipboardList } from "lucide-react";

export const revalidate = 0;

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const details = await getOrderWithDetails(id);
  if (!details) notFound();

  const { order, patient, sample, items, report } = details;
  const availableAnalyses = await getAvailableAnalysesForOrder(id);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-mono text-lg font-semibold text-text">{order.order_code}</h1>
          <p className="mt-1 text-sm text-text-muted">
            Solicitada el {new Date(order.requested_at).toLocaleDateString("es")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {order.priority === "urgente" && <Badge tone="danger">Urgente</Badge>}
          <StatusBadge status={order.status} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-text">Paciente</h2>
          </CardHeader>
          <CardBody className="flex flex-col gap-1 text-sm text-text-muted">
            {patient ? (
              <>
                <Link href={`/laboratorio/pacientes/${patient.id}`} className="font-medium text-text hover:text-primary">
                  {patient.first_name} {patient.last_name}
                </Link>
                <p>Edad: {calculateAge(patient.birth_date) ?? "—"}</p>
                <p>Documento: {patient.document_id || "—"}</p>
              </>
            ) : (
              "—"
            )}
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
                <StatusBadge status={sample.status} />
              </>
            ) : (
              <p>Sin muestra asociada.</p>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-text">Solicitud</h2>
          </CardHeader>
          <CardBody className="flex flex-col gap-1 text-sm text-text-muted">
            <p>Médico: {order.doctor_name || "—"}</p>
            <p className="capitalize">Prioridad: {order.priority}</p>
            {order.clinical_notes && <p>Notas: {order.clinical_notes}</p>}
          </CardBody>
        </Card>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text">Análisis solicitados</h2>
        </div>

        <div className="mt-3 flex flex-col gap-3">
          {items.length === 0 ? (
            <EmptyState icon={ClipboardList} title="Sin análisis agregados todavía." />
          ) : (
            items.map((item) => <ResultEntry key={item.id} orderId={id} item={item} />)
          )}
        </div>

        <div className="mt-4">
          <AddAnalysisForm orderId={id} availableAnalyses={availableAnalyses} />
        </div>
      </div>

      <OrderActions
        orderId={id}
        patientId={order.patient_id}
        status={order.status}
        hasReport={Boolean(report)}
      />

      {report && (
        <p className="text-sm text-text-muted">
          Informe generado:{" "}
          <Link href={`/laboratorio/informes/${report.id}`} className="font-mono text-primary hover:text-primary-hover">
            {report.report_number}
          </Link>
        </p>
      )}
    </div>
  );
}
