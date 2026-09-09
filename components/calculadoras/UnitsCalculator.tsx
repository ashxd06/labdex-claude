"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ResultBlock } from "@/components/calculadoras/ResultBlock";
import {
  convertUnits,
  UNITS_BY_CATEGORY,
  type Unit,
  type UnitCategory,
  type UnitConversionResult,
} from "@/lib/calculadoras/math/units";
import { CalculatorError, parseOptionalNumber } from "@/lib/calculadoras/shared";

const CATEGORY_LABELS: Record<UnitCategory, string> = {
  masa: "Masa",
  volumen: "Volumen",
  concentracion: "Concentración",
};

const CATEGORIES: UnitCategory[] = ["masa", "volumen", "concentracion"];

export function UnitsCalculator() {
  const [category, setCategory] = useState<UnitCategory>("masa");
  const [from, setFrom] = useState<Unit>("g");
  const [to, setTo] = useState<Unit>("mg");
  const [value, setValue] = useState("");
  const [result, setResult] = useState<UnitConversionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleCategoryChange(next: UnitCategory) {
    setCategory(next);
    const units = UNITS_BY_CATEGORY[next];
    setFrom(units[0]);
    setTo(units[1] ?? units[0]);
    setResult(null);
    setError(null);
  }

  function handleCalculate() {
    setError(null);
    try {
      const parsed = parseOptionalNumber(value, "Valor");
      if (parsed === undefined) {
        throw new CalculatorError("Ingresa un valor para convertir.");
      }
      setResult(convertUnits(parsed, from, to));
    } catch (err) {
      setResult(null);
      setError(err instanceof CalculatorError ? err.message : "No se pudo calcular. Revisa el valor ingresado.");
    }
  }

  function handleClear() {
    setValue("");
    setResult(null);
    setError(null);
  }

  const units = UNITS_BY_CATEGORY[category];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="mb-1.5 text-sm font-medium text-text-muted">Categoría</p>
        <div className="flex flex-wrap gap-1.5 rounded-lg border border-border bg-surface-2 p-1" role="tablist">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              role="tab"
              aria-selected={cat === category}
              onClick={() => handleCategoryChange(cat)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                cat === category ? "bg-surface text-text shadow-sm" : "text-text-muted hover:text-text"
              }`}
            >
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <Input
            label="Valor"
            type="number"
            inputMode="decimal"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="0"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-text-muted" htmlFor="unit-from">
            De
          </label>
          <select
            id="unit-from"
            value={from}
            onChange={(event) => setFrom(event.target.value as Unit)}
            className="rounded-md border border-border bg-surface px-3.5 py-2.5 text-sm text-text outline-none focus:border-primary"
          >
            {units.map((unit) => (
              <option key={unit} value={unit}>
                {unit}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-text-muted" htmlFor="unit-to">
            A
          </label>
          <select
            id="unit-to"
            value={to}
            onChange={(event) => setTo(event.target.value as Unit)}
            className="rounded-md border border-border bg-surface px-3.5 py-2.5 text-sm text-text outline-none focus:border-primary"
          >
            {units.map((unit) => (
              <option key={unit} value={unit}>
                {unit}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && <p className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}

      <div className="flex gap-2">
        <Button onClick={handleCalculate}>Calcular</Button>
        <Button variant="secondary" onClick={handleClear}>
          Limpiar
        </Button>
      </div>

      {result && (
        <ResultBlock steps={result} resultLabel={`${result.inputValue} ${result.from} =`} resultValue={result.result} resultUnit={result.to} />
      )}
    </div>
  );
}
