import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { requireEstudioSession } from "@/lib/estudio/shared";

/**
 * El Hub de Estudio contiene materiales privados del estudiante (Fase 6,
 * §25): a diferencia del resto de `/estudio` en fases anteriores (un
 * placeholder público), este módulo exige sesión iniciada, igual que
 * `/laboratorio`. La comprobación en servidor se suma a la del middleware
 * y a las políticas RLS de Postgres/Storage.
 */
export default async function EstudioLayout({ children }: { children: React.ReactNode }) {
  await requireEstudioSession("/estudio");

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <Header />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6 lg:px-8">{children}</main>
      <Footer />
    </div>
  );
}
