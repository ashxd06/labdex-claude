import Link from "next/link";
import { notFound } from "next/navigation";
import { Microscope, Search } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Breadcrumbs } from "@/components/content/Breadcrumbs";
import { Pagination } from "@/components/content/Pagination";
import { listResourceRowsPaged } from "@/lib/content/queries";
import { KIND_SLUG_TO_VALUE, KIND_VALUE_TO_LABEL } from "@/lib/content/kindSlugs";
import { MicroorganismCard } from "@/components/content/MicroorganismCard";
import { EmptyState } from "@/components/ui/EmptyState";
import type { Microorganism } from "@/lib/supabase/types";

export const revalidate = 0;

const PAGE_SIZE = 12;

export default async function MicroorganismKindPage({
  params,
  searchParams,
}: {
  params: Promise<{ kind: string }>;
  searchParams: Promise<{ q?: string; gram?: string; page?: string }>;
}) {
  const { kind: kindSlug } = await params;
  const kind = KIND_SLUG_TO_VALUE[kindSlug];
  if (!kind) notFound();

  const { q, gram, page } = await searchParams;
  const currentPage = Number.parseInt(page ?? "1", 10) || 1;

  const { rows: allRows } = await listResourceRowsPaged<Microorganism>("microorganisms", {
    onlyActive: true,
    kind,
    search: q,
    searchColumns: ["scientific_name", "common_name"],
    orderBy: "scientific_name",
    ascending: true,
    page: 1,
    pageSize: 1000,
  });

  // El filtro de Gram se aplica en memoria (solo relevante para bacterias y
  // ya se descargó la página completa filtrada por tipo/búsqueda arriba).
  const filtered =
    gram && gram !== "todos"
      ? allRows.filter((m) => (m.gram_stain || "").toLowerCase().startsWith(gram.toLowerCase()))
      : allRows;

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const items = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const showGramFilter = kind === "bacteria";

  function buildHref(targetPage: number) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (gram) params.set("gram", gram);
    params.set("page", String(targetPage));
    return `/contenido/microbiologia/${kindSlug}?${params.toString()}`;
  }

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <Header />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-10 sm:px-6 lg:px-8">
        <Breadcrumbs
          items={[
            { label: "Inicio", href: "/" },
            { label: "Contenido", href: "/contenido" },
            { label: "Microbiología", href: "/contenido/microbiologia" },
            { label: KIND_VALUE_TO_LABEL[kind] },
          ]}
        />
        <h1 className="mt-3 text-2xl font-semibold text-text">{KIND_VALUE_TO_LABEL[kind]}</h1>

        <form className="mt-6 flex flex-wrap items-center gap-3">
          <label className="flex w-full max-w-sm items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 focus-within:border-primary">
            <Search className="size-4 text-text-muted" />
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder={`Buscar ${KIND_VALUE_TO_LABEL[kind].toLowerCase()}…`}
              className="w-full bg-transparent text-sm outline-none placeholder:text-text-faint"
            />
          </label>

          {showGramFilter && (
            <div className="flex items-center gap-1 rounded-md border border-border bg-surface p-1">
              {[
                { value: "todos", label: "Todas" },
                { value: "positivo", label: "Gram +" },
                { value: "negativo", label: "Gram -" },
              ].map((opt) => (
                <Link
                  key={opt.value}
                  href={`/contenido/microbiologia/${kindSlug}?${new URLSearchParams({
                    ...(q ? { q } : {}),
                    gram: opt.value,
                  }).toString()}`}
                  className={`rounded px-3 py-1.5 text-sm transition-colors ${
                    (gram ?? "todos") === opt.value
                      ? "bg-primary-soft text-primary"
                      : "text-text-muted hover:text-text"
                  }`}
                >
                  {opt.label}
                </Link>
              ))}
            </div>
          )}
        </form>

        {items.length === 0 ? (
          <div className="mt-8">
            <EmptyState
              icon={Microscope}
              title={`No hay ${KIND_VALUE_TO_LABEL[kind].toLowerCase()} registrados todavía.`}
              description="El administrador puede agregar contenido desde el panel de administración."
            />
          </div>
        ) : (
          <>
            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {items.map((item) => (
                <MicroorganismCard key={item.id} item={item} />
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
