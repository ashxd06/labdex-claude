import { notFound } from "next/navigation";
import Link from "next/link";
import { FileStack } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Breadcrumbs } from "@/components/content/Breadcrumbs";
import { getResourceRowBySlug, listResourceRows } from "@/lib/content/queries";
import { EmptyState } from "@/components/ui/EmptyState";
import { SampleDataBadge } from "@/components/content/SampleDataBadge";
import type { Category, LaboratoryTest, Procedure, ClinicalAnalysis } from "@/lib/supabase/types";

export const revalidate = 0;

export default async function CategoryDetailPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category: slug } = await params;
  const category = await getResourceRowBySlug<Category>("categories", slug);
  if (!category || !category.is_active) notFound();

  const [tests, procedures, analyses] = await Promise.all([
    listResourceRows<LaboratoryTest>("laboratory_tests", { onlyActive: true, categoryId: category.id }),
    listResourceRows<Procedure>("procedures", { onlyActive: true, categoryId: category.id }),
    listResourceRows<ClinicalAnalysis>("clinical_analyses", { onlyActive: true, categoryId: category.id }),
  ]);

  const hasContent = tests.length > 0 || procedures.length > 0 || analyses.length > 0;

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <Header />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6 lg:px-8">
        <Breadcrumbs
          items={[
            { label: "Inicio", href: "/" },
            { label: "Contenido", href: "/contenido" },
            { label: category.name },
          ]}
        />
        <h1 className="mt-3 text-2xl font-semibold uppercase tracking-wide text-text">
          {category.name}
        </h1>
        {category.description && (
          <p className="mt-1 max-w-xl text-sm text-text-muted">{category.description}</p>
        )}

        {!hasContent ? (
          <div className="mt-8">
            <EmptyState
              icon={FileStack}
              title="Este módulo se construirá en una próxima fase."
              description="La estructura ya está preparada. El contenido se añadirá desde el panel de administración."
            />
          </div>
        ) : (
          <div className="mt-8 flex flex-col gap-8">
            {analyses.length > 0 && (
              <ContentGroup
                title="Análisis clínicos"
                items={analyses.map((a) => ({ name: a.name, href: `/contenido/analisis/${a.slug}`, sample: a.is_sample_data }))}
              />
            )}
            {tests.length > 0 && (
              <ContentGroup
                title="Pruebas de laboratorio"
                items={tests.map((t) => ({ name: t.name, href: `/contenido/pruebas/${t.slug}`, sample: t.is_sample_data }))}
              />
            )}
            {procedures.length > 0 && (
              <ContentGroup
                title="Procedimientos"
                items={procedures.map((p) => ({ name: p.name, href: `/contenido/procedimientos/${p.slug}`, sample: p.is_sample_data }))}
              />
            )}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

function ContentGroup({
  title,
  items,
}: {
  title: string;
  items: { name: string; href: string; sample: boolean }[];
}) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-text">{title}</h2>
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {items.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className="flex items-center justify-between gap-2 rounded-md border border-border bg-surface px-4 py-3 text-sm text-text transition-colors hover:border-accent"
          >
            {item.name}
            <SampleDataBadge show={item.sample} />
          </Link>
        ))}
      </div>
    </div>
  );
}
