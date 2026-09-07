"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { createPatient, updatePatient, type LabActionState } from "@/lib/lab/actions";
import type { Patient } from "@/lib/supabase/labTypes";

const initialState: LabActionState = { status: "idle" };

export function PatientForm({ patient }: { patient?: Patient }) {
  const isEdit = Boolean(patient?.id);
  const router = useRouter();
  const action = isEdit ? updatePatient.bind(null, patient!.id) : createPatient;
  const [state, formAction, pending] = useActionState(action, initialState);

  useEffect(() => {
    if (state.status === "success" && !isEdit && state.id) {
      router.push(`/laboratorio/pacientes/${state.id}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.status]);

  return (
    <Card>
      <CardBody>
        <form action={formAction} className="flex flex-col gap-6">
          <section className="flex flex-col gap-4">
            <h2 className="text-sm font-semibold text-text">Datos personales</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input label="Nombres *" name="first_name" defaultValue={patient?.first_name} required />
              <Input label="Apellidos *" name="last_name" defaultValue={patient?.last_name} required />
              <Input label="Documento" name="document_id" defaultValue={patient?.document_id ?? ""} />
              <Input
                label="Fecha de nacimiento"
                name="birth_date"
                type="date"
                defaultValue={patient?.birth_date ?? ""}
              />
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-text-muted">Sexo</label>
                <select
                  name="sex"
                  defaultValue={patient?.sex ?? ""}
                  className="rounded-md border border-border bg-surface px-3.5 py-2.5 text-sm text-text outline-none focus:border-primary"
                >
                  <option value="">Sin especificar</option>
                  <option value="M">Masculino</option>
                  <option value="F">Femenino</option>
                  <option value="otro">Otro</option>
                </select>
              </div>
            </div>
          </section>

          <section className="flex flex-col gap-4 border-t border-border pt-6">
            <h2 className="text-sm font-semibold text-text">Contacto</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input label="Teléfono" name="phone" defaultValue={patient?.phone ?? ""} />
              <Input label="Correo" name="email" type="email" defaultValue={patient?.email ?? ""} />
              <div className="sm:col-span-2">
                <Input label="Dirección" name="address" defaultValue={patient?.address ?? ""} />
              </div>
            </div>
          </section>

          <section className="flex flex-col gap-4 border-t border-border pt-6">
            <h2 className="text-sm font-semibold text-text">Información adicional</h2>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-text-muted">Observaciones</label>
              <textarea
                name="notes"
                defaultValue={patient?.notes ?? ""}
                rows={3}
                className="rounded-md border border-border bg-surface px-3.5 py-2.5 text-sm text-text outline-none focus:border-primary"
              />
            </div>
          </section>

          {state.status === "error" && (
            <p role="alert" className="text-sm text-danger">
              {state.message}
            </p>
          )}
          {state.status === "success" && isEdit && (
            <p role="status" className="text-sm text-success">
              {state.message}
            </p>
          )}

          <div>
            <Button type="submit" loading={pending}>
              {isEdit ? "Guardar cambios" : "Registrar paciente"}
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
