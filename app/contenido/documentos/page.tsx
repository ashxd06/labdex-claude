import { FileStack, Download } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Breadcrumbs } from "@/components/content/Breadcrumbs";
import { Pagination } from "@/components/content/Pagination";
import { EmptyState } from "@/components/ui/EmptyState";
import { listResourceRowsPaged } from "@/lib/content/queries";
import { getPublicUrl } from "@/lib/content/publicUrl";
import type { LabDocument } from "@/lib/supabase/types";

export const revalidate = 0;
const PAGE_SIZE = 12;

export default async function DocumentosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { q, page } = await searchParams;
  const currentPage = Number.parseInt(page ?? "1", 10) || 1;

  const { rows, totalPages, page: safePage } = await listResourceRowsPaged<LabDocument>("documents", {
    onlyActive: true,
    search: q,
    searchColumns: ["title"],
    orderBy: "title",
    ascending: true,
    page: currentPage,
    pageSize: PAGE_SIZE,
  });

  function buildHref(targetPage: number) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    params.set("page", String(targetPage));
    return `/contenido/documentos?${params.toString()}`;
  }

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <Header />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6 lg:px-8">
        <Breadcrumbs
          items={[
            { label: "Inicio", href: "/" },
            { label: "Contenido", href: "/contenido" },
            { label: "Documentos" },
          ]}
        />
        <h1 className="mt-3 text-2xl font-semibold text-text">Documentos</h1>
        <p className="mt-1 text-sm text-text-muted">Documentos e insertos de referencia.</p>

        {rows.length === 0 ? (
          <div className="mt-8">
            <EmptyState
              icon={FileStack}
              title="No hay documentos disponibles todavía."
              description="El administrador puede subir documentos desde el panel de administración."
            />
          </div>
        ) : (
          <>
            <div className="mt-8 flex flex-col gap-2">
              {rows.map((doc) => {
                const url = getPublicUrl("documents", doc.file_path);
                return (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-text">{doc.title}</p>
                      <p className="text-xs text-text-faint">
                        {doc.category || doc.file_type || "Documento"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {url && (
                        <a
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-text-muted hover:border-accent hover:text-accent"
                        >
                          <Download className="size-3.5" /> Descargar
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <Pagination page={safePage} totalPages={totalPages} buildHref={buildHref} />
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
