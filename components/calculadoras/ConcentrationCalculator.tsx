"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { SolveForPicker } from "@/components/calculadoras/SolveForPicker";
import { QuantityField } from "@/components/calculadoras/QuantityField";
import { ResultBlock } from "@/components/calculadoras/ResultBlock";
import {
  calculateConcentrationMV,
  type ConcentrationField,
  type ConcentrationResult,
} from "@/lib/calculadoras/math/concentration";
import { CalculatorError, parseOptionalNumber } from "@/lib/calculadoras/shared";

const FIELD_OPTIONS: { value: ConcentrationField; label: string; unit: string }[] = [
  { value: "porcentaje", label: "Concentración % m/v", unit: "%" },
  { value: "soluto", label: "Gramos de soluto", unit: "g" },
  { value: "solucion", label: "mL de solución", unit: "mL" },
];

export function ConcentrationCalculator() {
  const [solveFor, setSolveFor] = useState<ConcentrationField>("porcentaje");
  const [values, setValues] = useState({ soluto: "", solucion: "", porcentaje: "" });
  const [result, setResult] = useState<ConcentrationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleChange(field: keyof typeof values, value: string) {
    setValues((prev) => ({ ...prev, [field]: value }));
  }

  function handleSolveForChange(field: ConcentrationField) {
    setSolveFor(field);
    setResult(null);
    setError(null);
  }

  function handleCalculate() {
    setError(null);
    try {
      const parsed = {
        soluto: parseOptionalNumber(values.soluto, "Gramos de soluto"),
        solucion: parseOptionalNumber(values.solucion, "mL de solución"),
        porcentaje: parseOptionalNumber(values.porcentaje, "Concentración %"),
      };
      setResult(calculateConcentrationMV({ solveFor, ...parsed }));
    } catch (err) {
      setResult(null);
      setError(err instanceof CalculatorError ? err.message : "No se pudo calcular. Revisa los valores ingresados.");
    }
  }

  function handleClear() {
    setValues({ soluto: "", solucion: "", porcentaje: "" });
    setResult(null);
    setError(null);
  }

  const activeOption = FIELD_OPTIONS.find((o) => o.value === solveFor)!;

  return (
    <div className="flex flex-col gap-6">
      <SolveForPicker
        options={FIELD_OPTIONS.map(({ value, label }) => ({ value, label }))}
        value={solveFor}
        onChange={handleSolveForChange}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <QuantityField
          label="Gramos de soluto"
          unit="g"
          value={values.soluto}
          onChange={(v) => handleChange("soluto", v)}
          isTarget={solveFor === "soluto"}
        />
        <QuantityField
          label="mL de solución"
          unit="mL"
          value={values.solucion}
          onChange={(v) => handleChange("solucion", v)}
          isTarget={solveFor === "solucion"}
          hint="Volumen total de la solución, no solo del disolvente añadido."
        />
        <QuantityField
          label="Concentración % m/v"
          unit="%"
          value={values.porcentaje}
          onChange={(v) => handleChange("porcentaje", v)}
          isTarget={solveFor === "porcentaje"}
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
        <ResultBlock steps={result} resultLabel={activeOption.label} resultValue={result.value} resultUnit={activeOption.unit} />
      )}
    </div>
  );
}
