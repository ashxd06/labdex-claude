import { redirect } from "next/navigation";
import { ShieldCheck, Mail, LogOut } from "lucide-react";
import { getSession } from "@/lib/auth/getSession";
import { getRoleLabel } from "@/lib/permissions";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { logoutAction } from "@/app/actions/auth";

export default async function PerfilPage() {
  const { user, profile } = await getSession();

  // Doble verificación en el servidor: aunque el middleware ya redirige,
  // la página nunca debe confiar solo en eso.
  if (!user) {
    redirect("/login?next=/perfil");
  }

  const displayName = profile?.full_name || "Sin nombre registrado";

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <Header />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-semibold text-text">Mi perfil</h1>
        <p className="mt-1 text-sm text-text-muted">
          Información básica de tu cuenta en LABDEX.
        </p>

        <Card className="mt-8">
          <CardHeader className="flex items-center gap-3">
            <span className="flex size-12 items-center justify-center rounded-full bg-primary-soft text-lg font-semibold text-primary">
              {displayName.charAt(0).toUpperCase()}
            </span>
            <div>
              <p className="text-sm font-semibold text-text">{displayName}</p>
              <Badge
                tone={
                  profile?.role === "admin" ? "accent" : profile?.role === "lab_staff" ? "primary" : "neutral"
                }
              >
                {getRoleLabel(profile)}
              </Badge>
            </div>
          </CardHeader>
          <CardBody className="flex flex-col gap-4">
            <div className="flex items-center gap-3 text-sm text-text-muted">
              <Mail className="size-4" />
              <span>{user.email}</span>
            </div>
            {profile?.role === "admin" && (
              <div className="flex items-center gap-3 text-sm text-text-muted">
                <ShieldCheck className="size-4 text-accent" />
                <span>Tienes permisos de administración.</span>
              </div>
            )}
          </CardBody>
        </Card>

        <div className="mt-6 rounded-lg border border-dashed border-border p-4 text-sm text-text-faint">
          La edición de nombre, foto, preferencias, tema, historial y
          favoritos se habilitará en una próxima fase.
        </div>

        <form action={logoutAction} className="mt-8">
          <Button type="submit" variant="secondary">
            <LogOut className="size-4" /> Cerrar sesión
          </Button>
        </form>
      </main>
      <Footer />
    </div>
  );
}
