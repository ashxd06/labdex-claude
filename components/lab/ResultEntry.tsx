"use client";

import { useActionState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/lab/StatusBadge";
import { ResultFlag } from "@/components/lab/ResultFlag";
import { saveResult, validateResult } from "@/lib/lab/resultsAndReports";
import { removeOrderItem } from "@/lib/lab/actions";
import { QUALITATIVE_OPTIONS, SEMIQUANTITATIVE_OPTIONS } from "@/lib/supabase/labTypes";
import type { OrderItemWithDetails } from "@/lib/lab/queries";

const initialState = { status: "idle" as const };

export function ResultEntry({ orderId, item, canEdit }: { orderId: string; item: OrderItemWithDetails; canEdit: boolean }) {
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
          {result?.flag && <ResultFlag flag={result.flag} />}
          {canEdit && <button
            onClick={handleRemove}
            disabled={removing}
            aria-label="Quitar análisis"
            className="rounded-md p-1.5 text-text-muted hover:bg-danger-soft hover:text-danger disabled:opacity-50"
          >
            <X className="size-4" />
          </button>}
        </div>
      </div>

      <form action={formAction} className="mt-3 flex flex-col gap-3">
        {item.result_type === "cuantitativo" && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <FieldInput label="Resultado" name="result_value" defaultValue={result?.result_value ?? ""} disabled={!canEdit} type="number" />
            <FieldInput
              label="Unidad"
              name="unit"
              defaultValue={result?.unit ?? analysis.unit ?? ""}
              disabled={!canEdit}
            />
            <FieldInput
              label="Valor de referencia"
              name="reference_range_text"
              defaultValue={result?.reference_range_text ?? analysis.reference_range ?? ""}
              disabled={!canEdit}
            />
            <FieldInput label="Mínimo numérico" name="range_min" defaultValue="" disabled={!canEdit} type="number" />
            <FieldInput label="Máximo numérico" name="range_max" defaultValue="" disabled={!canEdit} type="number" />
            <p className="text-xs text-text-faint sm:col-span-3">Completa ambos límites para calcular bajo, normal o alto. El rango no se deduce automáticamente del texto.</p>
          </div>
        )}

        {item.result_type === "cualitativo" && (
          <div className="flex flex-col gap-1.5 sm:max-w-xs">
            <label className="text-xs font-medium text-text-muted">Resultado</label>
            <select
              name="result_value"
              defaultValue={result?.result_value ?? ""}
              disabled={!canEdit}
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
              disabled={!canEdit}
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
              disabled={!canEdit}
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
            disabled={!canEdit}
            className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:border-primary"
          />
        </div>

        {state.status === "error" && <p className="text-sm text-danger">{state.message}</p>}

        {canEdit && <div className="flex items-center gap-2">
          <Button type="submit" size="sm" loading={pending}>
            Guardar resultado
          </Button>
          {result?.status === "ingresado" && (
            <Button variant="secondary" size="sm" onClick={handleValidate} loading={validating} type="button">
              <CheckCircle2 className="size-3.5" /> Validar
            </Button>
          )}
        </div>}
        {!canEdit && <p className="text-xs text-text-faint">Edición bloqueada para conservar el informe validado.</p>}
      </form>
    </div>
  );
}

function FieldInput({
  label,
  name,
  defaultValue,
  disabled = false,
  type = "text",
}: {
  label: string;
  name: string;
  defaultValue: string;
  disabled?: boolean;
  type?: "text" | "number";
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-text-muted">{label}</label>
      <input
        name={name}
        type={type}
        inputMode={type === "number" ? "decimal" : undefined}
        step={type === "number" ? "any" : undefined}
        disabled={disabled}
        defaultValue={defaultValue}
        className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:border-primary"
      />
    </div>
  );
}
