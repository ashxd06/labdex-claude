"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Logo } from "@/components/layout/Logo";
import { Footer } from "@/components/layout/Footer";
import { Card, CardBody } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { registerAction, type AuthActionState } from "@/app/actions/auth";

const initialState: AuthActionState = { status: "idle" };

export default function RegistroPage() {
  const [state, formAction, pending] = useActionState(registerAction, initialState);

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <div className="flex flex-1 flex-col items-center justify-center gap-8 px-4 py-12">
        <Logo />

        <Card className="w-full max-w-sm">
          <CardBody>
            <h1 className="text-lg font-semibold text-text">Crear cuenta</h1>
            <p className="mt-1 text-sm text-text-muted">
              Regístrate para acceder a LABDEX.
            </p>

            {state.status === "success" ? (
              <div className="mt-6 flex flex-col gap-4">
                <p role="status" className="text-sm text-success">
                  {state.message}
                </p>
                <Link href="/login">
                  <Button fullWidth>Ir a iniciar sesión</Button>
                </Link>
              </div>
            ) : (
              <form action={formAction} className="mt-6 flex flex-col gap-4">
                <Input label="Nombre" name="fullName" type="text" autoComplete="name" required />
                <Input
                  label="Correo electrónico"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                />
                <Input
                  label="Contraseña"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  hint="Mínimo 8 caracteres."
                  required
                  minLength={8}
                />
                <Input
                  label="Confirmar contraseña"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                />

                {state.status === "error" && (
                  <p role="alert" className="text-sm text-danger">
                    {state.message}
                  </p>
                )}

                <Button type="submit" fullWidth loading={pending}>
                  {pending ? "Creando cuenta…" : "Crear cuenta"}
                </Button>
              </form>
            )}
          </CardBody>
        </Card>

        <p className="text-sm text-text-muted">
          ¿Ya tienes una cuenta?{" "}
          <Link href="/login" className="font-medium text-primary hover:text-primary-hover">
            Iniciar sesión
          </Link>
        </p>
      </div>
      <Footer />
    </div>
  );
}
