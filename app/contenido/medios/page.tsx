import { Search, FlaskConical } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Breadcrumbs } from "@/components/content/Breadcrumbs";
import { Pagination } from "@/components/content/Pagination";
import { SimpleContentCard } from "@/components/content/SimpleContentCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { listResourceRowsPaged } from "@/lib/content/queries";
import type { CultureMedia } from "@/lib/supabase/types";

export const revalidate = 0;
const PAGE_SIZE = 12;

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { q, page } = await searchParams;
  const currentPage = Number.parseInt(page ?? "1", 10) || 1;

  const { rows, totalPages, page: safePage } = await listResourceRowsPaged<CultureMedia>("culture_media", {
    onlyActive: true,
    search: q,
    searchColumns: ["name"],
    orderBy: "name",
    ascending: true,
    page: currentPage,
    pageSize: PAGE_SIZE,
  });

  function buildHref(targetPage: number) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    params.set("page", String(targetPage));
    return `/contenido/medios?${params.toString()}`;
  }

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <Header />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-10 sm:px-6 lg:px-8">
        <Breadcrumbs
          items={[
            { label: "Inicio", href: "/" },
            { label: "Contenido", href: "/contenido" },
            { label: "Medios de cultivo" },
          ]}
        />
        <h1 className="mt-3 text-2xl font-semibold text-text">Medios de cultivo</h1>

        <form className="mt-6 max-w-sm">
          <label className="flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 focus-within:border-primary">
            <Search className="size-4 text-text-muted" />
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Buscar…"
              className="w-full bg-transparent text-sm outline-none placeholder:text-text-faint"
            />
          </label>
        </form>

        {rows.length === 0 ? (
          <div className="mt-8">
            <EmptyState
              icon={FlaskConical}
              title="No hay registros todavía."
              description="El administrador puede agregar contenido desde el panel de administración."
            />
          </div>
        ) : (
          <>
            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {rows.map((item) => (
                <SimpleContentCard
                  key={item.id}
                  href={`/contenido/medios/${item.slug}`}
                  title={item.name}
                  subtitle={item.type || undefined}
                  description={item.description}
                  uppercase={false}
                  sample={item.is_sample_data}
                />
              ))}
            </div>
            <Pagination page={safePage} totalPages={totalPages} buildHref={buildHref} />
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
