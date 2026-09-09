"use client";

/**
 * Selector "¿Qué deseas calcular?" (Fase 5.1, §5/§8): permite elegir cuál
 * de las variables de la fórmula se resuelve; las demás pasan a ser campos
 * de entrada obligatorios.
 */
export function SolveForPicker<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div>
      <p className="mb-1.5 text-sm font-medium text-text-muted">¿Qué deseas calcular?</p>
      <div className="flex flex-wrap gap-1.5 rounded-lg border border-border bg-surface-2 p-1" role="tablist">
        {options.map((option) => {
          const active = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(option.value)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors
                ${active ? "bg-surface text-text shadow-sm" : "text-text-muted hover:text-text"}`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
