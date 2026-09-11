"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  SearchCheck,
  Wand2,
  ScanSearch,
  RotateCcw,
  CheckCheck,
  X,
  AlertTriangle,
  Info,
} from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { getResourceConfig } from "@/lib/content/resourceConfigs";
import { getAssistableFields } from "@/lib/labdex-ai/admin/validation";
import { runAssistantAction, checkDuplicatesAction } from "@/lib/labdex-ai/admin/actions";
import type { AssistantMode, AssistantResult, ConsistencyFinding, DuplicateMatch, FieldProposal, FieldStatus } from "@/lib/labdex-ai/admin/types";
import { FIELD_STATUS_LABELS } from "@/lib/labdex-ai/admin/types";

/**
 * Asistente LABDEX de contenido, embebido directamente arriba del
 * formulario de cada tipo de contenido del CMS (categorías,
 * microorganismos, medios, pruebas, procedimientos, análisis clínicos,
 * documentos) — no una página de chatbot aparte.
 *
 * REGLA NO NEGOCIABLE: este componente nunca llama a `createRecord` ni a
 * `updateRecord`. "Aplicar" solo escribe valores en los inputs del
 * formulario (por `name`, vía el DOM) para que el administrador los vea,
 * los pueda seguir editando, y decida cuándo pulsar el botón "Guardar"
 * normal del formulario — ese es el único camino hacia Supabase.
 */

const STATUS_TONE: Record<FieldStatus, "success" | "danger" | "warning" | "accent" | "primary"> = {
  correcto: "success",
  posible_error: "danger",
  revisar: "warning",
  falta: "accent",
  inconsistencia: "danger",
  propuesta: "primary",
};

const SEVERITY_TONE: Record<ConsistencyFinding["severity"], "danger" | "warning" | "neutral"> = {
  alta: "danger",
  media: "warning",
  baja: "neutral",
};

const MODE_META: { mode: AssistantMode; label: string; icon: typeof Sparkles; needsExisting: boolean }[] = [
  { mode: "generar", label: "Generar contenido", icon: Sparkles, needsExisting: false },
  { mode: "revisar", label: "Revisar contenido", icon: SearchCheck, needsExisting: true },
  { mode: "mejorar", label: "Mejorar contenido", icon: Wand2, needsExisting: true },
  { mode: "comparar", label: "Comparar / Verificar", icon: ScanSearch, needsExisting: true },
];

function readFormValues(form: HTMLFormElement, keys: string[]): Record<string, string | null> {
  const values: Record<string, string | null> = {};
  for (const key of keys) {
    const el = form.elements.namedItem(key);
    if (!el) {
      values[key] = null;
    } else if (el instanceof HTMLInputElement && el.type === "checkbox") {
      values[key] = el.checked ? "true" : "false";
    } else if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
      values[key] = el.value.trim() || null;
    } else {
      values[key] = null;
    }
  }
  return values;
}

function applyValueToForm(form: HTMLFormElement, key: string, value: string) {
  const el = form.elements.namedItem(key);
  if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement)) {
    return;
  }
  if (el instanceof HTMLInputElement && el.type === "checkbox") {
    el.checked = value.toLowerCase() === "true";
  } else {
    el.value = value;
  }
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

export function ContentAssistantPanel({
  resourceKey,
  formId,
  isEdit,
  excludeId,
}: {
  resourceKey: string;
  formId: string;
  isEdit: boolean;
  excludeId?: string;
}) {
  const config = getResourceConfig(resourceKey);
  const assistableFields = getAssistableFields(config.fields);

  const [expanded, setExpanded] = useState(false);
  const [activeMode, setActiveMode] = useState<AssistantMode | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AssistantResult | null>(null);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [edited, setEdited] = useState<Record<string, string>>({});
  const [applied, setApplied] = useState<Record<string, boolean>>({});
  const [duplicates, setDuplicates] = useState<DuplicateMatch[] | null>(null);

  function getForm(): HTMLFormElement | null {
    return document.getElementById(formId) as HTMLFormElement | null;
  }

  function resetResult() {
    setResult(null);
    setSelected({});
    setEdited({});
    setApplied({});
    setError(null);
  }

  async function runMode(mode: AssistantMode, opts?: { skipDuplicateCheck?: boolean }) {
    const form = getForm();
    if (!form) return;

    const currentValues = readFormValues(form, assistableFields.map((f) => f.key));
    const titleValue = (currentValues[config.titleField] ?? readFormValues(form, [config.titleField])[config.titleField]) || "";

    if (mode === "generar" && !titleValue?.trim()) {
      setError(`Escribe primero "${config.fields.find((f) => f.key === config.titleField)?.label ?? config.titleField}" en el formulario para poder generar contenido.`);
      return;
    }

    const hasAnyContent = Object.values(currentValues).some((v) => v && v.trim().length > 0);
    if (mode !== "generar" && !hasAnyContent) {
      setError("El formulario todavía está vacío. Escribe o genera contenido primero.");
      return;
    }

    if (mode === "generar" && !opts?.skipDuplicateCheck && !isEdit) {
      const dupCheck = await checkDuplicatesAction(resourceKey, titleValue, excludeId);
      if (dupCheck.status === "success" && dupCheck.matches.length > 0) {
        setDuplicates(dupCheck.matches);
        setActiveMode(mode);
        return;
      }
    }
    setDuplicates(null);

    setActiveMode(mode);
    setPending(true);
    resetResult();

    const titleFieldValue = readFormValues(form, [config.titleField])[config.titleField];
    const seed = mode === "generar" ? titleFieldValue ?? undefined : undefined;

    const response = await runAssistantAction(resourceKey, mode, currentValues, seed);
    setPending(false);

    if (response.status !== "success") {
      setError(response.status === "error" ? response.message : "Ocurrió un error inesperado.");
      return;
    }

    setResult(response.result);
    const defaultSelected: Record<string, boolean> = {};
    for (const field of response.result.fields) {
      defaultSelected[field.key] = field.status !== "correcto" && field.proposed !== null && field.proposed !== field.current;
    }
    setSelected(defaultSelected);
  }

  function handleApplyFields(fields: FieldProposal[]) {
    const form = getForm();
    if (!form) return;
    const appliedNow: Record<string, boolean> = { ...applied };
    for (const field of fields) {
      const value = edited[field.key] ?? field.proposed;
      if (value === null || value === undefined) continue;
      applyValueToForm(form, field.key, value);
      appliedNow[field.key] = true;
    }
    setApplied(appliedNow);
  }

  function handleApplyFinding(finding: ConsistencyFinding) {
    const form = getForm();
    if (!form || !finding.suggestedField || finding.suggestedValue === undefined) return;
    applyValueToForm(form, finding.suggestedField, finding.suggestedValue);
    setApplied((prev) => ({ ...prev, [finding.suggestedField as string]: true }));
  }

  const applicableFields = (result?.fields ?? []).filter((f) => f.proposed !== null);

  return (
    <Card>
      <CardHeader>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex w-full items-center justify-between text-left"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="size-5 text-accent" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-text">Asistente LABDEX</h2>
          </div>
          <span className="text-xs text-text-faint">{expanded ? "Ocultar" : "Mostrar"}</span>
        </button>
      </CardHeader>

      {expanded && (
        <CardBody className="flex flex-col gap-4">
          <p className="text-sm text-text-muted">
            Genera, revisa, mejora o verifica este {config.labelSingular.toLowerCase()} con IA. Nunca guarda nada por
            sí solo: revisa cada propuesta y aplícala tú al formulario antes de pulsar Guardar.
          </p>

          <div className="flex flex-wrap gap-2">
            {MODE_META.map(({ mode, label, icon: Icon, needsExisting }) => (
              <Button
                key={mode}
                variant={activeMode === mode ? "primary" : "secondary"}
                size="sm"
                loading={pending && activeMode === mode}
                disabled={pending}
                onClick={() => runMode(mode)}
                title={needsExisting ? "Usa el contenido actual del formulario" : undefined}
              >
                <Icon className="size-4" aria-hidden="true" />
                {label}
              </Button>
            ))}
          </div>

          {duplicates && duplicates.length > 0 && activeMode === "generar" && (
            <div className="rounded-md border border-warning/40 bg-warning-soft p-3 text-sm">
              <p className="flex items-center gap-1.5 font-medium text-warning">
                <AlertTriangle className="size-4" aria-hidden="true" /> Posible contenido existente
              </p>
              <ul className="mt-1.5 flex flex-col gap-1">
                {duplicates.map((d) => (
                  <li key={d.id}>
                    <Link href={d.adminPath} target="_blank" className="text-text underline hover:text-primary">
                      Ver existente: {d.title}
                    </Link>
                  </li>
                ))}
              </ul>
              <Button size="sm" variant="secondary" className="mt-2" onClick={() => runMode("generar", { skipDuplicateCheck: true })}>
                Continuar de todos modos
              </Button>
            </div>
          )}

          {error && <p className="text-sm text-danger">{error}</p>}

          {result && result.overallNote && (
            <p className="flex items-start gap-1.5 rounded-md border border-border bg-surface-2 p-3 text-sm text-text-muted">
              <Info className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" /> {result.overallNote}
            </p>
          )}

          {result && result.fields.length > 0 && (
            <div className="flex flex-col gap-3">
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-left text-sm">
                  <thead className="bg-surface-2 text-text-muted">
                    <tr>
                      <th className="px-3 py-2 font-medium">
                        <span className="sr-only">Aplicar</span>
                      </th>
                      <th className="px-3 py-2 font-medium">Campo</th>
                      <th className="px-3 py-2 font-medium">Estado</th>
                      <th className="px-3 py-2 font-medium">Actual</th>
                      <th className="px-3 py-2 font-medium">Propuesta</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {result.fields.map((field) => (
                      <tr key={field.key} className="bg-surface align-top">
                        <td className="px-3 py-2">
                          {field.proposed !== null && (
                            <input
                              type="checkbox"
                              checked={Boolean(selected[field.key])}
                              onChange={(e) => setSelected((prev) => ({ ...prev, [field.key]: e.target.checked }))}
                              className="size-4 rounded border-border-strong accent-[var(--ldx-primary)]"
                              aria-label={`Seleccionar ${field.label}`}
                            />
                          )}
                        </td>
                        <td className="px-3 py-2 font-medium text-text">{field.label}</td>
                        <td className="px-3 py-2">
                          <Badge tone={STATUS_TONE[field.status]}>{FIELD_STATUS_LABELS[field.status]}</Badge>
                          {applied[field.key] && (
                            <span className="ml-1.5 text-xs text-success">
                              <CheckCheck className="inline size-3.5" aria-hidden="true" /> Aplicado
                            </span>
                          )}
                        </td>
                        <td className="max-w-56 whitespace-pre-wrap px-3 py-2 text-text-muted">
                          {field.current || <span className="text-text-faint">—</span>}
                        </td>
                        <td className="max-w-72 px-3 py-2">
                          {field.proposed !== null ? (
                            <textarea
                              value={edited[field.key] ?? field.proposed}
                              onChange={(e) => setEdited((prev) => ({ ...prev, [field.key]: e.target.value }))}
                              rows={Math.min(6, Math.max(2, Math.ceil((edited[field.key] ?? field.proposed).length / 40)))}
                              className="w-full rounded-md border border-border bg-bg px-2 py-1.5 text-sm text-text outline-none focus:border-primary"
                            />
                          ) : (
                            <span className="text-text-faint">Sin cambios</span>
                          )}
                          <p className="mt-1 text-xs text-text-faint">{field.explanation}</p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => handleApplyFields(applicableFields)}>
                  <CheckCheck className="size-4" aria-hidden="true" /> Aplicar todo
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleApplyFields(applicableFields.filter((f) => selected[f.key]))}
                >
                  Aplicar seleccionados
                </Button>
                <Button size="sm" variant="ghost" onClick={() => activeMode && runMode(activeMode)}>
                  <RotateCcw className="size-4" aria-hidden="true" /> Regenerar
                </Button>
                <Button size="sm" variant="ghost" onClick={resetResult}>
                  <X className="size-4" aria-hidden="true" /> Rechazar
                </Button>
              </div>
            </div>
          )}

          {result && result.findings.length > 0 && (
            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold text-text">Hallazgos</h3>
              {result.findings.map((finding, i) => (
                <div key={i} className="rounded-md border border-border bg-surface p-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={SEVERITY_TONE[finding.severity]}>{finding.severity}</Badge>
                    {finding.requiresExternalVerification && (
                      <Badge tone="accent">Requiere verificación con el inserto/método/laboratorio</Badge>
                    )}
                  </div>
                  <p className="mt-1.5 text-text">{finding.description}</p>
                  {finding.fieldsInvolved.length > 0 && (
                    <p className="mt-1 text-xs text-text-faint">
                      Campos involucrados: {finding.fieldsInvolved.join(", ")}
                    </p>
                  )}
                  {finding.suggestedField && finding.suggestedValue && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-xs text-text-muted">
                        Corrección sugerida para {finding.suggestedFieldLabel}: “{finding.suggestedValue}”
                      </span>
                      <Button size="sm" variant="secondary" onClick={() => handleApplyFinding(finding)}>
                        Aplicar corrección
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardBody>
      )}
    </Card>
  );
}
