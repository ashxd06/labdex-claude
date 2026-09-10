import { ArrowDown, ArrowUp, Minus } from "lucide-react";

/**
 * Muestra la interpretación de un resultado (Fase 4, §6-7): LABDEX nunca
 * inventa un rango de referencia, así que este indicador solo aparece
 * cuando `lab_results.flag` ya fue calculado (resultado numérico + rango
 * estructurado disponible, ver `computeFlag` en
 * `lib/lab/resultsAndReports.ts`). Si no hay flag, se muestra un guion:
 * ausencia de dato, no "normal por defecto".
 */
export function ResultFlag({ flag }: { flag: "bajo" | "normal" | "alto" | null }) {
  if (!flag) return <span className="text-text-faint">—</span>;

  if (flag === "alto") {
    return (
      <span className="inline-flex items-center gap-1 text-sm font-medium text-danger">
        <ArrowUp className="size-3.5" aria-hidden="true" /> Alto
      </span>
    );
  }
  if (flag === "bajo") {
    return (
      <span className="inline-flex items-center gap-1 text-sm font-medium text-warning">
        <ArrowDown className="size-3.5" aria-hidden="true" /> Bajo
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-sm text-success">
      <Minus className="size-3.5" aria-hidden="true" /> Normal
    </span>
  );
}
