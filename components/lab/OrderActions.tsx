"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle, FileStack } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { finalizeOrder, cancelOrder } from "@/lib/lab/actions";
import { createReport } from "@/lib/lab/resultsAndReports";

export function OrderActions({
  orderId,
  patientId,
  status,
  hasReport,
  canComplete,
  pendingReason,
}: {
  orderId: string;
  patientId: string;
  status: string;
  hasReport: boolean;
  canComplete: boolean;
  pendingReason: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleFinalize() {
    startTransition(async () => {
      await finalizeOrder(orderId);
      router.refresh();
    });
  }

  function handleCancel() {
    startTransition(async () => {
      await cancelOrder(orderId);
      router.refresh();
    });
  }

  function handleGenerateReport() {
    startTransition(async () => {
      const result = await createReport(orderId, patientId);
      if (result.status === "success" && result.id) {
        router.push(`/laboratorio/informes/${result.id}`);
      }
    });
  }

  const isOpen = status !== "completada" && status !== "cancelada";

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {isOpen && (
          <Button
            variant="secondary"
            size="sm"
            onClick={handleFinalize}
            loading={pending}
            disabled={!canComplete}
            title={!canComplete && pendingReason ? pendingReason : undefined}
          >
            <CheckCircle2 className="size-4" /> Finalizar solicitud
          </Button>
        )}
        {isOpen && (
          <Button variant="ghost" size="sm" onClick={handleCancel} loading={pending}>
            <XCircle className="size-4" /> Cancelar
          </Button>
        )}
        {!hasReport && (
          <Button size="sm" onClick={handleGenerateReport} loading={pending}>
            <FileStack className="size-4" /> Generar informe
          </Button>
        )}
      </div>
      {isOpen && !canComplete && pendingReason && <p className="text-xs text-text-faint">{pendingReason}</p>}
    </div>
  );
}
