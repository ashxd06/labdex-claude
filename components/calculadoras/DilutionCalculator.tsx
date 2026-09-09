"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { SolveForPicker } from "@/components/calculadoras/SolveForPicker";
import { QuantityField } from "@/components/calculadoras/QuantityField";
import { ResultBlock } from "@/components/calculadoras/ResultBlock";
import { calculateDilution, type DilutionField, type DilutionResult } from "@/lib/calculadoras/math/dilutions";
import { CalculatorError, parseOptionalNumber } from "@/lib/calculadoras/shared";

const FIELD_OPTIONS: { value: DilutionField; label: string }[] = [
  { value: "v1", label: "V₁ (volumen inicial)" },
  { value: "c1", label: "C₁ (concentración inicial)" },
  { value: "c2", label: "C₂ (concentración final)" },
  { value: "v2", label: "V₂ (volumen final)" },
];

export function DilutionCalculator() {
  const [solveFor, setSolveFor] = useState<DilutionField>("v1");
  const [values, setValues] = useState({ c1: "", v1: "", c2: "", v2: "" });
  const [result, setResult] = useState<DilutionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleChange(field: keyof typeof values, value: string) {
    setValues((prev) => ({ ...prev, [field]: value }));
  }

  function handleSolveForChange(field: DilutionField) {
    setSolveFor(field);
    setResult(null);
    setError(null);
  }

  function handleCalculate() {
    setError(null);
    try {
      const parsed = {
        c1: parseOptionalNumber(values.c1, "C₁"),
        v1: parseOptionalNumber(values.v1, "V₁"),
        c2: parseOptionalNumber(values.c2, "C₂"),
        v2: parseOptionalNumber(values.v2, "V₂"),
      };
      const calculated = calculateDilution({ solveFor, ...parsed });
      setResult(calculated);
    } catch (err) {
      setResult(null);
      setError(err instanceof CalculatorError ? err.message : "No se pudo calcular. Revisa los valores ingresados.");
    }
  }

  function handleClear() {
    setValues({ c1: "", v1: "", c2: "", v2: "" });
    setResult(null);
    setError(null);
  }

  return (
    <div className="flex flex-col gap-6">
      <SolveForPicker options={FIELD_OPTIONS} value={solveFor} onChange={handleSolveForChange} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <QuantityField
          label="Concentración inicial (C₁)"
          unit="%"
          value={values.c1}
          onChange={(v) => handleChange("c1", v)}
          isTarget={solveFor === "c1"}
          hint="Concentración de la solución de partida."
        />
        <QuantityField
          label="Volumen inicial (V₁)"
          unit="mL"
          value={values.v1}
          onChange={(v) => handleChange("v1", v)}
          isTarget={solveFor === "v1"}
        />
        <QuantityField
          label="Concentración final (C₂)"
          unit="%"
          value={values.c2}
          onChange={(v) => handleChange("c2", v)}
          isTarget={solveFor === "c2"}
          hint="Concentración de la solución que quieres preparar."
        />
        <QuantityField
          label="Volumen final (V₂)"
          unit="mL"
          value={values.v2}
          onChange={(v) => handleChange("v2", v)}
          isTarget={solveFor === "v2"}
        />
      </div>

      {error && <p className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}

      <div className="flex gap-2">
        <Button onClick={handleCalculate}>Calcular</Button>
        <Button variant="secondary" onClick={handleClear}>
          Limpiar
        </Button>
      </div>

      {result && (
        <ResultBlock
          steps={result}
          resultLabel={FIELD_OPTIONS.find((o) => o.value === solveFor)!.label}
          resultValue={result.value}
          resultUnit={solveFor === "c1" || solveFor === "c2" ? "%" : "mL"}
          extra={[{ label: "Diluyente a añadir", value: result.diluent, unit: "mL" }]}
        />
      )}
    </div>
  );
}
