"use client";

import { Sparkles, GraduationCap, Microscope, FlaskConical } from "lucide-react";
import type { AiMode } from "@/lib/labdex-ai/types";

const MODES: { value: AiMode; label: string; icon: typeof Sparkles }[] = [
  { value: "general", label: "General", icon: Sparkles },
  { value: "estudio", label: "Estudio", icon: GraduationCap },
  { value: "microbiologia", label: "Microbiología", icon: Microscope },
  { value: "laboratorio", label: "Laboratorio", icon: FlaskConical },
];

export function ModeSelector({
  value,
  onChange,
  disabled,
}: {
  value: AiMode;
  onChange: (mode: AiMode) => void;
  disabled?: boolean;
}) {
  return (
    <div
      className="flex flex-wrap gap-1.5 rounded-lg border border-border bg-surface-2 p-1"
      role="tablist"
      aria-label="Modo de LABDEX AI"
    >
      {MODES.map(({ value: mode, label, icon: Icon }) => {
        const active = mode === value;
        return (
          <button
            key={mode}
            type="button"
            role="tab"
            aria-selected={active}
            disabled={disabled}
            onClick={() => onChange(mode)}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60
              ${active ? "bg-surface text-text shadow-sm" : "text-text-muted hover:text-text"}`}
          >
            <Icon className="size-3.5" aria-hidden="true" />
            {label}
          </button>
        );
      })}
    </div>
  );
}
