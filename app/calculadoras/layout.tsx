import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

/**
 * El módulo de Calculadoras es una herramienta pública y determinista
 * (Fase 5.1, §3): no depende de Supabase ni requiere sesión iniciada,
 * igual que `/contenido` o `/estudio`.
 */
export default function CalculadorasLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <Header />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6 lg:px-8">{children}</main>
      <Footer />
    </div>
  );
}
