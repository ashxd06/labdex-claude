"use client";

import { useActionState } from "react";
import { KeyRound, Save } from "lucide-react";
import { updatePasswordAction, updateProfileNameAction } from "@/app/actions/profile";
import type { AuthActionState } from "@/app/actions/auth";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

const initialState: AuthActionState = { status: "idle" };

function Feedback({ state }: { state: AuthActionState }) {
  if (state.status === "idle" || !state.message) return null;
  return (
    <p
      role={state.status === "error" ? "alert" : "status"}
      className={`text-sm ${state.status === "error" ? "text-danger" : "text-success"}`}
      aria-live="polite"
    >
      {state.message}
    </p>
  );
}

export function ProfileSettings({ fullName, email }: { fullName: string; email: string }) {
  const [nameState, saveName, namePending] = useActionState(updateProfileNameAction, initialState);
  const [passwordState, savePassword, passwordPending] = useActionState(updatePasswordAction, initialState);

  return (
    <div className="mt-6 grid gap-5">
      <Card>
        <CardBody>
          <h2 className="text-base font-semibold text-text">Datos personales</h2>
          <p className="mt-1 text-sm text-text-muted">Actualiza el nombre que aparece en tu perfil.</p>
          <form action={saveName} className="mt-5 flex flex-col gap-4">
            <Input
              label="Nombre para mostrar"
              name="fullName"
              type="text"
              autoComplete="name"
              defaultValue={fullName}
              minLength={2}
              maxLength={80}
              required
            />
            <div className="flex flex-col gap-1.5">
              <label htmlFor="profile-email" className="text-sm font-medium text-text-muted">Correo electrónico</label>
              <input
                id="profile-email"
                value={email}
                type="email"
                readOnly
                aria-describedby="email-note"
                className="rounded-md border border-border bg-surface-2 px-3.5 py-2.5 text-sm text-text outline-none"
              />
              <p id="email-note" className="text-xs text-text-faint">El correo de acceso no se puede editar desde aquí.</p>
            </div>
            <Feedback state={nameState} />
            <Button type="submit" loading={namePending} className="w-full sm:w-fit">
              <Save className="size-4" /> Guardar nombre
            </Button>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
              <KeyRound className="size-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-base font-semibold text-text">Seguridad</h2>
              <p className="mt-1 text-sm text-text-muted">Cambia tu contraseña periódicamente y no la compartas.</p>
            </div>
          </div>
          <form action={savePassword} className="mt-5 flex flex-col gap-4">
            <Input
              label="Nueva contraseña"
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              hint="Usa al menos 8 caracteres."
              required
            />
            <Input
              label="Confirmar nueva contraseña"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
            />
            <Feedback state={passwordState} />
            <Button type="submit" variant="secondary" loading={passwordPending} className="w-full sm:w-fit">
              Cambiar contraseña
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
