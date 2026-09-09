"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { SolveForPicker } from "@/components/calculadoras/SolveForPicker";
import { QuantityField } from "@/components/calculadoras/QuantityField";
import { ResultBlock } from "@/components/calculadoras/ResultBlock";
import { calculateMolarity, type MolarityField, type MolarityResult } from "@/lib/calculadoras/math/molarity";
import { CalculatorError, parseOptionalNumber } from "@/lib/calculadoras/shared";

const FIELD_OPTIONS: { value: MolarityField; label: string; unit: string }[] = [
  { value: "molarity", label: "Molaridad (M)", unit: "mol/L" },
  { value: "moles", label: "Moles", unit: "mol" },
  { value: "volume", label: "Volumen", unit: "L" },
];

export function MolarityCalculator() {
  const [solveFor, setSolveFor] = useState<MolarityField>("molarity");
  const [useMass, setUseMass] = useState(true);
  const [values, setValues] = useState({ mass: "", molarMass: "", moles: "", volume: "", molarity: "" });
  const [result, setResult] = useState<MolarityResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleChange(field: keyof typeof values, value: string) {
    setValues((prev) => ({ ...prev, [field]: value }));
  }

  function handleSolveForChange(field: MolarityField) {
    setSolveFor(field);
    setResult(null);
    setError(null);
  }

  function handleCalculate() {
    setError(null);
    try {
      const parsed = {
        mass: useMass ? parseOptionalNumber(values.mass, "Masa") : undefined,
        molarMass: useMass ? parseOptionalNumber(values.molarMass, "Masa molar") : undefined,
        moles: !useMass ? parseOptionalNumber(values.moles, "Moles") : undefined,
        volume: parseOptionalNumber(values.volume, "Volumen"),
        molarity: parseOptionalNumber(values.molarity, "Molaridad"),
      };
      setResult(calculateMolarity({ solveFor, ...parsed }));
    } catch (err) {
      setResult(null);
      setError(err instanceof CalculatorError ? err.message : "No se pudo calcular. Revisa los valores ingresados.");
    }
  }

  function handleClear() {
    setValues({ mass: "", molarMass: "", moles: "", volume: "", molarity: "" });
    setResult(null);
    setError(null);
  }

  const activeOption = FIELD_OPTIONS.find((o) => o.value === solveFor)!;
  const needsMoles = solveFor === "molarity" || solveFor === "volume";

  return (
    <div className="flex flex-col gap-6">
      <SolveForPicker
        options={FIELD_OPTIONS.map(({ value, label }) => ({ value, label }))}
        value={solveFor}
        onChange={handleSolveForChange}
      />

      {(needsMoles || solveFor === "moles") && (
        <div>
          <p className="mb-1.5 text-sm font-medium text-text-muted">¿Cómo quieres indicar los moles?</p>
          <div className="flex flex-wrap gap-1.5 rounded-lg border border-border bg-surface-2 p-1" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={useMass}
              onClick={() => setUseMass(true)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                useMass ? "bg-surface text-text shadow-sm" : "text-text-muted hover:text-text"
              }`}
            >
              A partir de la masa
            </button>
            {solveFor !== "moles" && (
              <button
                type="button"
                role="tab"
                aria-selected={!useMass}
                onClick={() => setUseMass(false)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  !useMass ? "bg-surface text-text shadow-sm" : "text-text-muted hover:text-text"
                }`}
              >
                Moles directamente
              </button>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {useMass || solveFor === "moles" ? (
          <>
            <QuantityField label="Masa" unit="g" value={values.mass} onChange={(v) => handleChange("mass", v)} />
            <QuantityField
              label="Masa molar"
              unit="g/mol"
              value={values.molarMass}
              onChange={(v) => handleChange("molarMass", v)}
            />
          </>
        ) : (
          <QuantityField
            label="Moles"
            unit="mol"
            value={values.moles}
            onChange={(v) => handleChange("moles", v)}
          />
        )}
        <QuantityField
          label="Volumen"
          unit="L"
          value={values.volume}
          onChange={(v) => handleChange("volume", v)}
          isTarget={solveFor === "volume"}
        />
        <QuantityField
          label="Molaridad (M)"
          unit="mol/L"
          value={values.molarity}
          onChange={(v) => handleChange("molarity", v)}
          isTarget={solveFor === "molarity"}
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
          resultLabel={activeOption.label}
          resultValue={result.value}
          resultUnit={activeOption.unit}
          extra={
            result.molesDerivedFromMass && solveFor !== "moles"
              ? [{ label: "Moles derivados de la masa", value: result.moles, unit: "mol" }]
              : undefined
          }
        />
      )}
    </div>
  );
}
