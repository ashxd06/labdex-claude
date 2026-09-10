"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Ban } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { issueReport, voidReport } from "@/lib/lab/resultsAndReports";

export function ReportActions({
  reportId,
  status,
  canIssue,
  pendingReason,
}: {
  reportId: string;
  status: string;
  canIssue: boolean;
  pendingReason: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleIssue() {
    startTransition(async () => {
      await issueReport(reportId);
      router.refresh();
    });
  }

  function handleVoid() {
    startTransition(async () => {
      await voidReport(reportId);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {status === "borrador" && (
          <Button
            variant="secondary"
            size="sm"
            onClick={handleIssue}
            loading={pending}
            disabled={!canIssue}
            title={!canIssue && pendingReason ? pendingReason : undefined}
          >
            <CheckCircle2 className="size-4" /> Emitir informe
          </Button>
        )}
        {status !== "anulado" && (
          <Button variant="ghost" size="sm" onClick={handleVoid} loading={pending}>
            <Ban className="size-4" /> Anular
          </Button>
        )}
      </div>
      {status === "borrador" && !canIssue && pendingReason && (
        <p className="text-xs text-text-faint">{pendingReason}</p>
      )}
    </div>
  );
}
