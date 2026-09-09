import type { CalculationSteps } from "@/lib/calculadoras/types";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";

/**
 * Muestra el resultado de forma educativa (Fase 5.1, §16): no solo el
 * número final, también la fórmula, la sustitución y el procedimiento.
 */
export function ResultBlock({
  steps,
  resultLabel,
  resultValue,
  resultUnit,
  extra,
}: {
  steps: CalculationSteps;
  resultLabel: string;
  resultValue: number | string;
  resultUnit?: string;
  /** Filas adicionales bajo el resultado principal (p. ej. el diluyente). */
  extra?: { label: string; value: number | string; unit?: string }[];
}) {
  return (
    <Card>
      <CardHeader>
        <p className="text-xs font-medium uppercase tracking-wide text-text-faint">Resultado</p>
        <p className="mt-1 text-2xl font-semibold text-text">
          {resultLabel} = {resultValue} {resultUnit}
        </p>
      </CardHeader>
      <CardBody className="flex flex-col gap-3 text-sm">
        {extra?.map((row) => (
          <p key={row.label} className="text-text-muted">
            <span className="font-medium text-text">{row.label}:</span> {row.value} {row.unit}
          </p>
        ))}

        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-text-faint">Fórmula</p>
          <p className="mt-0.5 font-mono text-text">{steps.formula}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-text-faint">Sustitución</p>
          <p className="mt-0.5 font-mono text-text">{steps.substitution}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-text-faint">Procedimiento</p>
          <ol className="mt-0.5 list-decimal space-y-1 pl-4 text-text-muted">
            {steps.procedure.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ol>
        </div>
      </CardBody>
    </Card>
  );
}
