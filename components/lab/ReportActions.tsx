"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Ban } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { issueReport, voidReport } from "@/lib/lab/resultsAndReports";

export function ReportActions({ reportId, status }: { reportId: string; status: string }) {
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
    <>
      {status === "borrador" && (
        <Button variant="secondary" size="sm" onClick={handleIssue} loading={pending}>
          <CheckCircle2 className="size-4" /> Emitir informe
        </Button>
      )}
      {status !== "anulado" && (
        <Button variant="ghost" size="sm" onClick={handleVoid} loading={pending}>
          <Ban className="size-4" /> Anular
        </Button>
      )}
    </>
  );
}
