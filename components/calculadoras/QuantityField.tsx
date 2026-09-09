"use client";

import { Info } from "lucide-react";
import { Input } from "@/components/ui/Input";

/**
 * Campo numérico con unidad fija a la derecha (Fase 5.1, §5/§15: "[ 10 ] [ % ]").
 * Cuando `isTarget` es true, el campo se deshabilita y muestra que su valor
 * se calculará, en vez de pedírselo al usuario.
 */
export function QuantityField({
  label,
  unit,
  value,
  onChange,
  isTarget = false,
  hint,
  error,
}: {
  label: string;
  unit: string;
  value: string;
  onChange: (value: string) => void;
  isTarget?: boolean;
  hint?: string;
  error?: string;
}) {
  return (
    <div>
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <Input
            label={label}
            type="number"
            inputMode="decimal"
            value={isTarget ? "" : value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={isTarget ? "Se calculará" : "0"}
            disabled={isTarget}
            error={error}
          />
        </div>
        <span className="mb-2.5 shrink-0 rounded-md border border-border bg-surface-2 px-3 py-2.5 text-sm text-text-muted">
          {unit}
        </span>
      </div>
      {hint && !error && (
        <p className="mt-1 flex items-start gap-1 text-xs text-text-faint">
          <Info className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
          {hint}
        </p>
      )}
    </div>
  );
}
