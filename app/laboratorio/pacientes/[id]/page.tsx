import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, TestTube, ClipboardList, FileStack, Mail, Phone, MapPin } from "lucide-react";
import { getPatientById, getPatientHistory } from "@/lib/lab/queries";
import { calculateAge } from "@/lib/lab/shared";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { StatusBadge } from "@/components/lab/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";

export const revalidate = 0;

export default async function PatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const patient = await getPatientById(id);
  if (!patient) notFound();

  const { samples, orders, reports } = await getPatientHistory(id);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-text">
              {patient.first_name} {patient.last_name}
            </h1>
            {patient.is_demo && <Badge tone="warning">DEMO</Badge>}
          </div>
          <p className="mt-1 font-mono text-xs text-text-faint">{patient.internal_code}</p>
        </div>
        <Link href={`/laboratorio/pacientes/${id}/editar`}>
          <Button variant="secondary" size="sm">
            <Pencil className="size-4" /> Editar paciente
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <h2 className="text-sm font-semibold text-text">Datos personales</h2>
          </CardHeader>
          <CardBody className="flex flex-col gap-2 text-sm text-text-muted">
            <p>Documento: {patient.document_id || "—"}</p>
            <p>Fecha de nacimiento: {patient.birth_date || "—"}</p>
            <p>Edad: {calculateAge(patient.birth_date) ?? "—"}</p>
            <p>Sexo: {patient.sex ?? "—"}</p>
          </CardBody>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <h2 className="text-sm font-semibold text-text">Contacto</h2>
          </CardHeader>
          <CardBody className="flex flex-col gap-2 text-sm text-text-muted">
            <p className="flex items-center gap-2">
              <Phone className="size-3.5" /> {patient.phone || "—"}
            </p>
            <p className="flex items-center gap-2">
              <Mail className="size-3.5" /> {patient.email || "—"}
            </p>
            <p className="flex items-center gap-2">
              <MapPin className="size-3.5" /> {patient.address || "—"}
            </p>
          </CardBody>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <h2 className="text-sm font-semibold text-text">Acciones</h2>
          </CardHeader>
          <CardBody className="flex flex-col gap-2">
            <Link href={`/laboratorio/muestras/nueva?patient_id=${id}`}>
              <Button variant="secondary" size="sm" fullWidth>
                <TestTube className="size-4" /> Registrar muestra
              </Button>
            </Link>
            <Link href={`/laboratorio/solicitudes/nueva?patient_id=${id}`}>
              <Button variant="secondary" size="sm" fullWidth>
                <ClipboardList className="size-4" /> Crear solicitud
              </Button>
            </Link>
          </CardBody>
        </Card>
      </div>

      {patient.notes && (
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-text">Observaciones</h2>
          </CardHeader>
          <CardBody className="text-sm text-text-muted">{patient.notes}</CardBody>
        </Card>
      )}

      <HistorySection
        title="Muestras"
        icon={TestTube}
        emptyText="Sin muestras registradas."
        items={samples.map((s) => ({
          id: s.id,
          primary: s.sample_code,
          secondary: s.sample_type,
          status: s.status,
          date: s.created_at,
        }))}
      />

      <HistorySection
        title="Solicitudes"
        icon={ClipboardList}
        emptyText="Sin solicitudes registradas."
        items={orders.map((o) => ({
          id: o.id,
          primary: o.order_code,
          secondary: o.doctor_name || "Sin médico solicitante",
          status: o.status,
          date: o.requested_at,
          href: `/laboratorio/solicitudes/${o.id}`,
        }))}
      />

      <HistorySection
        title="Informes"
        icon={FileStack}
        emptyText="Sin informes generados."
        items={reports.map((r) => ({
          id: r.id,
          primary: r.report_number,
          secondary: r.responsible_name || "",
          status: r.status,
          date: r.created_at,
          href: `/laboratorio/informes/${r.id}`,
        }))}
      />
    </div>
  );
}

function HistorySection({
  title,
  icon: Icon,
  emptyText,
  items,
}: {
  title: string;
  icon: typeof TestTube;
  emptyText: string;
  items: { id: string; primary: string; secondary: string; status: string; date: string; href?: string }[];
}) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-text">{title}</h2>
      {items.length === 0 ? (
        <div className="mt-2">
          <EmptyState icon={Icon} title={emptyText} />
        </div>
      ) : (
        <div className="mt-2 flex flex-col gap-2">
          {items.map((item) => {
            const content = (
              <>
                <div>
                  <p className="font-mono text-xs text-text">{item.primary}</p>
                  {item.secondary && <p className="text-xs text-text-faint">{item.secondary}</p>}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-text-faint">
                    {new Date(item.date).toLocaleDateString("es")}
                  </span>
                  <StatusBadge status={item.status} />
                </div>
              </>
            );
            return item.href ? (
              <Link
                key={item.id}
                href={item.href}
                className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface px-4 py-3 transition-colors hover:border-accent"
              >
                {content}
              </Link>
            ) : (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface px-4 py-3"
              >
                {content}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
