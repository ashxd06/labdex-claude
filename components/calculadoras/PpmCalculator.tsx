"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ResultBlock } from "@/components/calculadoras/ResultBlock";
import { convertPpmPercent, type PpmDirection, type PpmConversionResult } from "@/lib/calculadoras/math/ppm";
import { CalculatorError, parseOptionalNumber } from "@/lib/calculadoras/shared";

const DIRECTIONS: { value: PpmDirection; label: string }[] = [
  { value: "ppmToPercent", label: "ppm → %" },
  { value: "percentToPpm", label: "% → ppm" },
];

export function PpmCalculator() {
  const [direction, setDirection] = useState<PpmDirection>("ppmToPercent");
  const [value, setValue] = useState("");
  const [result, setResult] = useState<PpmConversionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleDirectionChange(next: PpmDirection) {
    setDirection(next);
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
      setResult(convertPpmPercent(parsed, direction));
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

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="mb-1.5 text-sm font-medium text-text-muted">Dirección de la conversión</p>
        <div className="flex flex-wrap gap-1.5 rounded-lg border border-border bg-surface-2 p-1" role="tablist">
          {DIRECTIONS.map((option) => {
            const active = option.value === direction;
            return (
              <button
                key={option.value}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => handleDirectionChange(option.value)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors
                  ${active ? "bg-surface text-text shadow-sm" : "text-text-muted hover:text-text"}`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="max-w-xs">
        <Input
          label={direction === "ppmToPercent" ? "Valor en ppm" : "Valor en %"}
          type="number"
          inputMode="decimal"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="0"
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
          resultLabel="Resultado"
          resultValue={result.result}
          resultUnit={result.resultUnit}
        />
      )}
    </div>
  );
}
