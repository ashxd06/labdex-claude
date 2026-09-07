"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { createOrder } from "@/lib/lab/actions";
import type { Patient } from "@/lib/supabase/labTypes";
import type { Sample } from "@/lib/supabase/labTypes";

const initialState = { status: "idle" as const };

export function OrderForm({
  patients,
  samples,
  defaultPatientId,
}: {
  patients: Pick<Patient, "id" | "first_name" | "last_name" | "internal_code" | "document_id">[];
  samples: Sample[];
  defaultPatientId?: string;
}) {
  const [state, formAction, pending] = useActionState(createOrder, initialState);

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
            <label className="text-sm font-medium text-text-muted">Muestra (opcional)</label>
            <select
              name="sample_id"
              defaultValue=""
              className="rounded-md border border-border bg-surface px-3.5 py-2.5 text-sm text-text outline-none focus:border-primary"
            >
              <option value="">Sin muestra asociada todavía</option>
              {samples.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.sample_code} — {s.sample_type}
                </option>
              ))}
            </select>
          </div>

          <Input label="Médico solicitante" name="doctor_name" />

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-muted">Notas clínicas</label>
            <textarea
              name="clinical_notes"
              rows={3}
              className="rounded-md border border-border bg-surface px-3.5 py-2.5 text-sm text-text outline-none focus:border-primary"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-muted">Prioridad</label>
            <select
              name="priority"
              defaultValue="normal"
              className="w-40 rounded-md border border-border bg-surface px-3.5 py-2.5 text-sm text-text outline-none focus:border-primary"
            >
              <option value="normal">Normal</option>
              <option value="urgente">Urgente</option>
            </select>
          </div>

          {state.status === "error" && (
            <p role="alert" className="text-sm text-danger">
              {state.message}
            </p>
          )}

          <div>
            <Button type="submit" loading={pending}>
              Crear solicitud
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
