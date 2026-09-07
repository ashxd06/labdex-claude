"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { addOrderItem } from "@/lib/lab/actions";
import type { ClinicalAnalysis } from "@/lib/supabase/types";

export function AddAnalysisForm({
  orderId,
  availableAnalyses,
}: {
  orderId: string;
  availableAnalyses: ClinicalAnalysis[];
}) {
  const [selected, setSelected] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function handleAdd() {
    if (!selected) return;
    startTransition(async () => {
      const result = await addOrderItem(orderId, selected);
      if (result.status === "error") {
        setError(result.message ?? "No se pudo agregar el análisis.");
        return;
      }
      setSelected("");
      router.refresh();
    });
  }

  if (availableAnalyses.length === 0) {
    return <p className="text-sm text-text-faint">No hay más análisis disponibles para agregar.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="w-full max-w-xs rounded-md border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:border-primary"
        >
          <option value="">Seleccionar análisis…</option>
          {availableAnalyses.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
        <Button variant="secondary" size="sm" onClick={handleAdd} loading={pending}>
          <Plus className="size-3.5" /> Agregar análisis
        </Button>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
