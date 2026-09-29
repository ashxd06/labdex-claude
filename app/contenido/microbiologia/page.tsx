import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Breadcrumbs } from "@/components/content/Breadcrumbs";
import { listResourceRows } from "@/lib/content/queries";
import { KIND_SECTIONS } from "@/lib/content/kindSlugs";
import type { Microorganism } from "@/lib/supabase/types";
import { getActiveCategories } from "@/lib/content/getCategories";

export const revalidate = 0;

export default async function MicrobiologiaPage() {
  const [microorganisms, categories] = await Promise.all([listResourceRows<Microorganism>("microorganisms", {
    onlyActive: true,
  }), getActiveCategories()]);
  const root = categories.find((category) => category.slug === "microbiologia");
  const subcategories = categories.filter((category) => category.parent_id === root?.id);

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
          {KIND_SECTIONS.map((section) => {
            const count = countByKind[section.kind] ?? 0;
            const card = (
              <>
                <h2 className="text-base font-semibold text-text">{section.label}</h2>
                <p className="font-mono text-xs text-text-muted">
                  {count} {count === 1 ? "ficha publicada" : "fichas publicadas"}
                </p>
                {count === 0 ? (
                  <span className="mt-1 w-fit rounded-full bg-surface-2 px-3 py-1 text-xs font-medium text-text-muted">
                    Contenido en preparación
                  </span>
                ) : (
                  <span className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-accent">
                    Explorar <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                )}
              </>
            );

            return count === 0 ? (
              <div key={section.slug} className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-6 shadow-[var(--ldx-shadow)]">
                {card}
              </div>
            ) : (
              <Link
                key={section.slug}
                href={`/contenido/microbiologia/${section.slug}`}
                className="group flex flex-col gap-2 rounded-xl border border-border bg-surface p-6 shadow-[var(--ldx-shadow)] transition-colors hover:border-accent"
              >
                {card}
              </Link>
            );
          })}
        </div>

        {subcategories.length > 0 && (
          <section className="mt-10">
            <h2 className="text-lg font-semibold text-text">Explorar por categorías</h2>
            <div className="mt-4 flex flex-wrap gap-3">
              {subcategories.map((category) => (
                <Link key={category.id} href={`/contenido/microbiologia/bacterias?categoria=${encodeURIComponent(category.slug)}`} className="rounded-full border border-border bg-surface px-4 py-2 text-sm text-text-muted hover:border-accent hover:text-accent">
                  {category.name}
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
}
