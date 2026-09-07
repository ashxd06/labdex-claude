"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { updateLabSettings } from "@/lib/lab/resultsAndReports";
import { LabAssetField } from "@/components/lab/LabAssetField";
import type { LabSettings } from "@/lib/supabase/labTypes";

const initialState = { status: "idle" as const };

export function LabSettingsForm({
  settings,
  logoUrl,
  signatureUrl,
  sealUrl,
  isAdmin,
}: {
  settings: LabSettings;
  logoUrl: string | null;
  signatureUrl: string | null;
  sealUrl: string | null;
  isAdmin: boolean;
}) {
  const [state, formAction, pending] = useActionState(updateLabSettings, initialState);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardBody>
          <form action={formAction} className="flex flex-col gap-4">
            <fieldset disabled={!isAdmin} className="contents">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input label="Nombre del laboratorio" name="lab_name" defaultValue={settings.lab_name} />
                <Input label="Teléfono" name="phone" defaultValue={settings.phone ?? ""} />
                <Input label="Correo" name="email" type="email" defaultValue={settings.email ?? ""} />
                <Input label="Sitio web" name="website" defaultValue={settings.website ?? ""} />
                <div className="sm:col-span-2">
                  <Input label="Dirección" name="address" defaultValue={settings.address ?? ""} />
                </div>
                <Input
                  label="Nombre del profesional responsable"
                  name="responsible_name"
                  defaultValue={settings.responsible_name ?? ""}
                />
                <Input
                  label="Título profesional"
                  name="responsible_title"
                  defaultValue={settings.responsible_title ?? ""}
                />
                <Input
                  label="N.º de registro/colegiatura"
                  name="responsible_license"
                  defaultValue={settings.responsible_license ?? ""}
                />
              </div>

              {state.status === "error" && <p className="text-sm text-danger">{state.message}</p>}
              {state.status === "success" && <p className="text-sm text-success">{state.message}</p>}

              <div>
                <Button type="submit" loading={pending}>
                  Guardar configuración
                </Button>
              </div>
            </fieldset>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="flex flex-col gap-6">
          <h2 className="text-sm font-semibold text-text">Identidad visual del laboratorio</h2>
          <LabAssetField
            field="logo"
            label="Logo"
            currentPath={settings.logo_path}
            currentUrl={logoUrl}
            disabled={!isAdmin}
          />
          <LabAssetField
            field="signature"
            label="Firma"
            currentPath={settings.signature_path}
            currentUrl={signatureUrl}
            disabled={!isAdmin}
          />
          <LabAssetField
            field="seal"
            label="Sello"
            currentPath={settings.seal_path}
            currentUrl={sealUrl}
            disabled={!isAdmin}
          />
          {!isAdmin && (
            <p className="text-xs text-text-faint">
              Solo un administrador puede modificar la configuración del laboratorio.
            </p>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
