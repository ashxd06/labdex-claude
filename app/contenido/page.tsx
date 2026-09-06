import { Header } from "@/components/layout/Header";
import { CategoryCard } from "@/components/content/CategoryCard";
import { listResourceRows, countResourceRows } from "@/lib/content/queries";
import type { Category } from "@/lib/supabase/types";

export const revalidate = 0;

export default async function ContenidoPage() {
  const categories = await listResourceRows<Category>("categories", {
    onlyActive: true,
    orderBy: "display_order",
    ascending: true,
  });

  // Por ahora solo microbiología tiene contenido propio (microorganismos);
  // el resto de categorías mostrarán su contador según crezca su contenido
  // relacionado (pruebas, procedimientos, análisis) en /contenido/[categoria].
  const microorganismCount = await countResourceRows("microorganisms");

  return (
    <div className="min-h-dvh bg-bg">
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-semibold text-text">Contenido</h1>
        <p className="mt-1 max-w-xl text-sm text-text-muted">
          Explora la base de conocimiento de LABDEX por categoría.
        </p>

        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <CategoryCard
              key={category.id}
              slug={category.slug}
              name={category.name}
              description={category.description}
              icon={category.icon}
              count={category.type === "microbiologia" ? microorganismCount : 0}
            />
          ))}
        </div>

        {categories.length === 0 && (
          <p className="mt-8 text-sm text-text-faint">
            Todavía no hay categorías activas. Un administrador puede crearlas desde{" "}
            <span className="font-mono">/admin/categorias</span>.
          </p>
        )}
      </main>
    </div>
  );
}
