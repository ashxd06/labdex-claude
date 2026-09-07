import { Badge } from "@/components/ui/Badge";

const STATUS_CONFIG: Record<string, { label: string; tone: "primary" | "accent" | "success" | "warning" | "danger" | "neutral" }> = {
  // muestras / genérico
  pendiente: { label: "Pendiente", tone: "warning" },
  recibida: { label: "Recibida", tone: "primary" },
  en_proceso: { label: "En proceso", tone: "primary" },
  procesada: { label: "Procesada", tone: "success" },
  rechazada: { label: "Rechazada", tone: "danger" },
  // solicitudes
  completada: { label: "Completada", tone: "success" },
  cancelada: { label: "Cancelada", tone: "danger" },
  // resultados
  ingresado: { label: "Ingresado", tone: "primary" },
  validado: { label: "Validado", tone: "accent" },
  informado: { label: "Informado", tone: "success" },
  // informes
  borrador: { label: "Borrador", tone: "neutral" },
  emitido: { label: "Emitido", tone: "success" },
  anulado: { label: "Anulado", tone: "danger" },
};

export function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] ?? { label: status, tone: "neutral" as const };
  return <Badge tone={config.tone}>{config.label}</Badge>;
}
