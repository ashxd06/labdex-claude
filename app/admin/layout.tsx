import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/getSession";
import { isAdmin } from "@/lib/permissions";
import { Header } from "@/components/layout/Header";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

/**
 * Protección real del panel de administración.
 *
 * Esta comprobación se ejecuta en el SERVIDOR, en cada request a cualquier
 * ruta bajo /admin. `getSession()` obtiene el rol desde la tabla `profiles`
 * en Supabase (protegida por RLS), no desde algo que el cliente controle.
 *
 * El middleware ya exige sesión iniciada para entrar a /admin, pero esa es
 * solo una redirección de conveniencia. La barrera real de autorización
 * (¿es admin?) vive aquí, en el servidor, y se repite en cada acción
 * administrativa futura (Server Actions, Route Handlers) — nunca se confía
 * en ocultar un botón como único mecanismo de seguridad.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile } = await getSession();

  if (!user) {
    redirect("/login?next=/admin");
  }

  if (!isAdmin(profile)) {
    redirect("/?acceso=denegado");
  }

  return (
    <div className="min-h-dvh bg-bg">
      <Header />
      <div className="mx-auto flex max-w-7xl">
        <AdminSidebar />
        <div className="min-w-0 flex-1 px-4 py-8 sm:px-6 lg:px-8">{children}</div>
      </div>
    </div>
  );
}
