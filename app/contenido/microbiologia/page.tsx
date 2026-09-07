import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Breadcrumbs } from "@/components/content/Breadcrumbs";
import { listResourceRows } from "@/lib/content/queries";
import { KIND_SECTIONS } from "@/lib/content/kindSlugs";
import type { Microorganism } from "@/lib/supabase/types";

export const revalidate = 0;

export default async function MicrobiologiaPage() {
  const microorganisms = await listResourceRows<Microorganism>("microorganisms", {
    onlyActive: true,
  });

  const countByKind = Object.fromEntries(
    KIND_SECTIONS.map((s) => [s.kind, microorganisms.filter((m) => m.kind === s.kind).length])
  );

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <Header />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-10 sm:px-6 lg:px-8">
        <Breadcrumbs
          items={[
            { label: "Inicio", href: "/" },
            { label: "Contenido", href: "/contenido" },
            { label: "Microbiología" },
          ]}
        />
        <h1 className="mt-3 text-2xl font-semibold text-text">Microbiología</h1>
        <p className="mt-1 max-w-xl text-sm text-text-muted">
          Bacterias, hongos, virus y parásitos de importancia clínica.
        </p>

        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {KIND_SECTIONS.map((section) => (
            <Link
              key={section.slug}
              href={`/contenido/microbiologia/${section.slug}`}
              className="group flex flex-col gap-2 rounded-lg border border-border bg-surface p-6 transition-colors hover:border-accent"
            >
              <h2 className="text-base font-semibold text-text">{section.label}</h2>
              <p className="font-mono text-xs text-text-faint">
                {countByKind[section.kind] ?? 0} contenidos
              </p>
              <span className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-accent">
                Explorar <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
