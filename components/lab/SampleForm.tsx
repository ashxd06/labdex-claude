"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { createSample } from "@/lib/lab/actions";
import { SAMPLE_TYPES } from "@/lib/supabase/labTypes";
import type { Patient } from "@/lib/supabase/labTypes";

const initialState = { status: "idle" as const };

const CONDITIONS = [
  { value: "adecuada", label: "Adecuada" },
  { value: "hemolizada", label: "Hemolizada" },
  { value: "lipemica", label: "Lipémica" },
  { value: "icterica", label: "Ictérica" },
  { value: "insuficiente", label: "Insuficiente" },
  { value: "contaminada", label: "Contaminada" },
  { value: "otra", label: "Otra" },
];

export function SampleForm({
  patients,
  defaultPatientId,
}: {
  patients: Pick<Patient, "id" | "first_name" | "last_name" | "internal_code" | "document_id">[];
  defaultPatientId?: string;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(createSample, initialState);

  useEffect(() => {
    if (state.status === "success" && state.id) {
      router.push("/laboratorio/muestras");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.status]);

  return (
    <Card>
      <CardBody>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-muted">Paciente *</label>
            <select
              name="patient_id"
              defaultValue={defaultPatientId ?? ""}
              required
              className="rounded-md border border-border bg-surface px-3.5 py-2.5 text-sm text-text outline-none focus:border-primary"
            >
              <option value="" disabled>
                Selecciona un paciente
              </option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.first_name} {p.last_name} ({p.internal_code})
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-muted">Tipo de muestra *</label>
            <select
              name="sample_type"
              required
              defaultValue=""
              className="rounded-md border border-border bg-surface px-3.5 py-2.5 text-sm text-text outline-none focus:border-primary"
            >
              <option value="" disabled>
                Selecciona un tipo
              </option>
              {SAMPLE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Fecha de toma" name="collected_date" type="date" />
            <Input label="Hora de toma" name="collected_time" type="time" />
            <Input label="Fecha de recepción" name="received_date" type="date" />
            <Input label="Hora de recepción" name="received_time" type="time" />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-muted">Condición</label>
            <select
              name="condition"
              defaultValue="adecuada"
              className="rounded-md border border-border bg-surface px-3.5 py-2.5 text-sm text-text outline-none focus:border-primary"
            >
              {CONDITIONS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-muted">Observaciones</label>
            <textarea
              name="notes"
              rows={3}
              className="rounded-md border border-border bg-surface px-3.5 py-2.5 text-sm text-text outline-none focus:border-primary"
            />
          </div>

          {state.status === "error" && (
            <p role="alert" className="text-sm text-danger">
              {state.message}
            </p>
          )}

          <div>
            <Button type="submit" loading={pending}>
              Registrar muestra
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
