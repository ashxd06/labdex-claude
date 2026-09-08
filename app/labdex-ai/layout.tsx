import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { requireAiSession } from "@/lib/labdex-ai/session";

/**
 * LABDEX AI exige sesión iniciada (ver lib/labdex-ai/session.ts) porque el
 * historial de conversaciones se guarda por usuario, pero a diferencia de
 * `/laboratorio` NO es un módulo de datos clínicos: cualquier cuenta con
 * sesión iniciada puede usarlo. Se mantienen Header y Footer globales
 * (Fase 5, §22): no se rompe la identidad visual existente de LABDEX.
 */
export default async function LabdexAiLayout({ children }: { children: React.ReactNode }) {
  await requireAiSession("/labdex-ai");

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <Header />
      <div className="mx-auto flex w-full max-w-7xl flex-1">{children}</div>
      <Footer />
    </div>
  );
}
