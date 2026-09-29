import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Breadcrumbs } from "@/components/content/Breadcrumbs";
import { CategoryCard } from "@/components/content/CategoryCard";
import {
  listResourceRows,
  countResourceRowsResult,
  getCategoryContentCounts,
} from "@/lib/content/queries";
import type { Category } from "@/lib/supabase/types";

export const revalidate = 0;

export default async function ContenidoPage() {
  const [categories, microorganismCountResult] = await Promise.all([
    listResourceRows<Category>("categories", {
      onlyActive: true,
      orderBy: "display_order",
      ascending: true,
    }),
    countResourceRowsResult("microorganisms", true),
  ]);

  // Microbiología tiene tabla propia (microorganisms); el resto de
  // categorías muestran su contenido real vía laboratory_tests/procedures/
  // clinical_analyses filtrados por category_id (Fase 7, §1) — las mismas
  // tres tablas que ya lista /contenido/[categoria] al entrar a cada una.
  // Microbiología tiene ruta y tabla propias: mantener su acceso visible
  // aunque todavía no exista una fila de categoría activa en Supabase.
  const otherCategories = categories.filter(
    (category) => !category.parent_id && category.type !== "microbiologia" && category.slug !== "microbiologia"
  );
  const nonMicrobiologiaIds = otherCategories.map((category) => category.id);
  const categoryCountsResult = await getCategoryContentCounts(nonMicrobiologiaIds);

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <Header />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-10 sm:px-6 lg:px-8">
        <Breadcrumbs items={[{ label: "Inicio", href: "/" }, { label: "Contenido" }]} />
        <h1 className="mt-3 text-2xl font-semibold text-text">Contenido</h1>
        <p className="mt-1 max-w-xl text-sm text-text-muted">
          Explora la base de conocimiento de LABDEX por categoría.
        </p>

        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <CategoryCard
            key="microbiologia"
            slug="microbiologia"
            name="Microbiología"
            description="Bacterias, hongos, virus y parásitos de importancia clínica."
            icon="microscope"
            count={
              microorganismCountResult.error === null
                ? microorganismCountResult.count
                : null
            }
          />
          {otherCategories.map((category) => {
            const isMicrobiologia = category.type === "microbiologia";
            const count = isMicrobiologia
              ? microorganismCountResult.error === null
                ? microorganismCountResult.count
                : null
              : categoryCountsResult.error === null
                ? (categoryCountsResult.counts[category.id] ?? 0)
                : null;

            return (
              <CategoryCard
                key={category.id}
                slug={category.slug}
                name={category.name}
                description={category.description}
                icon={category.icon}
                count={count}
              />
            );
          })}
        </div>

        {otherCategories.length === 0 && (
          <p className="mt-8 text-sm text-text-faint">
            Por ahora puedes explorar Microbiología. Pronto se agregarán más categorías.
          </p>
        )}
      </main>
      <Footer />
    </div>
  );
}
