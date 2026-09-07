"use client";

import { useActionState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/lab/StatusBadge";
import { saveResult, validateResult } from "@/lib/lab/resultsAndReports";
import { removeOrderItem } from "@/lib/lab/actions";
import { QUALITATIVE_OPTIONS, SEMIQUANTITATIVE_OPTIONS } from "@/lib/supabase/labTypes";
import type { OrderItemWithDetails } from "@/lib/lab/queries";

const initialState = { status: "idle" as const };

export function ResultEntry({ orderId, item }: { orderId: string; item: OrderItemWithDetails }) {
  const analysis = item.clinical_analyses;
  const result = item.lab_results;
  const action = saveResult.bind(null, orderId, item.id);
  const [state, formAction, pending] = useActionState(action, initialState);
  const [removing, startRemoving] = useTransition();
  const [validating, startValidating] = useTransition();
  const router = useRouter();

  function handleRemove() {
    startRemoving(async () => {
      await removeOrderItem(orderId, item.id);
      router.refresh();
    });
  }

  function handleValidate() {
    startValidating(async () => {
      await validateResult(orderId, item.id);
      router.refresh();
    });
  }

  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-text">{analysis.name}</p>
          <p className="text-xs text-text-faint capitalize">{item.result_type.replace("_", " ")}</p>
        </div>
        <div className="flex items-center gap-2">
          {result && <StatusBadge status={result.status} />}
          <button
            onClick={handleRemove}
            disabled={removing}
            aria-label="Quitar análisis"
            className="rounded-md p-1.5 text-text-muted hover:bg-danger-soft hover:text-danger disabled:opacity-50"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      <form action={formAction} className="mt-3 flex flex-col gap-3">
        {item.result_type === "cuantitativo" && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <FieldInput label="Resultado" name="result_value" defaultValue={result?.result_value ?? ""} />
            <FieldInput
              label="Unidad"
              name="unit"
              defaultValue={result?.unit ?? analysis.unit ?? ""}
            />
            <FieldInput
              label="Valor de referencia"
              name="reference_range_text"
              defaultValue={result?.reference_range_text ?? analysis.reference_range ?? ""}
            />
            <input type="hidden" name="range_min" value="" />
            <input type="hidden" name="range_max" value="" />
          </div>
        )}

        {item.result_type === "cualitativo" && (
          <div className="flex flex-col gap-1.5 sm:max-w-xs">
            <label className="text-xs font-medium text-text-muted">Resultado</label>
            <select
              name="result_value"
              defaultValue={result?.result_value ?? ""}
              className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:border-primary"
            >
              <option value="" disabled>
                Selecciona un resultado
              </option>
              {QUALITATIVE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}

        {item.result_type === "semicuantitativo" && (
          <div className="flex flex-col gap-1.5 sm:max-w-xs">
            <label className="text-xs font-medium text-text-muted">Resultado</label>
            <select
              name="result_value"
              defaultValue={result?.result_value ?? ""}
              className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:border-primary"
            >
              <option value="" disabled>
                Selecciona un resultado
              </option>
              {SEMIQUANTITATIVE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}

        {item.result_type === "descriptivo" && (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-muted">Resultado</label>
            <textarea
              name="result_value"
              defaultValue={result?.result_value ?? ""}
              rows={3}
              className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:border-primary"
            />
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-text-muted">Observación del resultado</label>
          <textarea
            name="observation"
            defaultValue={result?.observation ?? ""}
            rows={2}
            className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:border-primary"
          />
        </div>

        {state.status === "error" && <p className="text-sm text-danger">{state.message}</p>}

        <div className="flex items-center gap-2">
          <Button type="submit" size="sm" loading={pending}>
            Guardar resultado
          </Button>
          {result?.status === "ingresado" && (
            <Button variant="secondary" size="sm" onClick={handleValidate} loading={validating} type="button">
              <CheckCircle2 className="size-3.5" /> Validar
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}

function FieldInput({
  label,
  name,
  defaultValue,
}: {
  label: string;
  name: string;
  defaultValue: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-text-muted">{label}</label>
      <input
        name={name}
        defaultValue={defaultValue}
        className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:border-primary"
      />
    </div>
  );
}
