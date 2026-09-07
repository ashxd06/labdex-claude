"use client";

import { Suspense, useActionState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Logo } from "@/components/layout/Logo";
import { Footer } from "@/components/layout/Footer";
import { Card, CardBody } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { loginAction, type AuthActionState } from "@/app/actions/auth";

const initialState: AuthActionState = { status: "idle" };

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/";

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <div className="flex flex-1 flex-col items-center justify-center gap-8 px-4 py-12">
        <Logo />

        <Card className="w-full max-w-sm">
          <CardBody>
            <h1 className="text-lg font-semibold text-text">Iniciar sesión</h1>
            <p className="mt-1 text-sm text-text-muted">
              Accede a tu cuenta de LABDEX.
            </p>

            <form action={formAction} className="mt-6 flex flex-col gap-4">
              <input type="hidden" name="next" value={next} />
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
                autoComplete="current-password"
                required
              />

              {state.status === "error" && (
                <p role="alert" className="text-sm text-danger">
                  {state.message}
                </p>
              )}

              <Button type="submit" fullWidth loading={pending}>
                {pending ? "Iniciando sesión…" : "Iniciar sesión"}
              </Button>
            </form>
          </CardBody>
        </Card>

        <p className="text-sm text-text-muted">
          ¿No tienes una cuenta?{" "}
          <Link href="/registro" className="font-medium text-primary hover:text-primary-hover">
            Crear cuenta
          </Link>
        </p>
      </div>
      <Footer />
    </div>
  );
}
