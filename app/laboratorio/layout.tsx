import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { LabSidebar } from "@/components/lab/LabSidebar";
import { requireLabSession } from "@/lib/lab/shared";

/**
 * El módulo de Laboratorio contiene datos clínicos sensibles y nunca es de
 * lectura pública. Esta comprobación en servidor se suma a la del
 * middleware (que exige sesión antes de llegar aquí) y a las políticas RLS
 * de Postgres (que exigen `authenticated` en cada tabla) — tres capas, no
 * solo ocultar un enlace en la interfaz.
 */
export default async function LaboratorioLayout({ children }: { children: React.ReactNode }) {
  await requireLabSession("/laboratorio");

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <Header />
      <div className="mx-auto flex w-full max-w-7xl flex-1">
        <LabSidebar />
        <div className="min-w-0 flex-1 px-4 py-8 sm:px-6 lg:px-8">{children}</div>
      </div>
      <Footer />
    </div>
  );
}
