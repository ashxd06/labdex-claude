import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Header } from "@/components/layout/Header";
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
    <div className="min-h-dvh bg-bg">
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-semibold text-text">Microbiología</h1>
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
    </div>
  );
}
