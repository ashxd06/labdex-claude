import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Breadcrumbs } from "@/components/content/Breadcrumbs";
import { listResourceRows } from "@/lib/content/queries";
import { KIND_VALUE_TO_SLUG } from "@/lib/content/kindSlugs";
import { EmptyState } from "@/components/ui/EmptyState";
import { SampleDataBadge } from "@/components/content/SampleDataBadge";
import { Search } from "lucide-react";
import Link from "next/link";
import type {
  Microorganism,
  CultureMedia,
  LaboratoryTest,
  Procedure,
  ClinicalAnalysis,
  LabDocument,
} from "@/lib/supabase/types";

export const revalidate = 0;

export default async function BuscarPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();

  const [microorganisms, media, tests, procedures, analyses, documents] = query
    ? await Promise.all([
        listResourceRows<Microorganism>("microorganisms", {
          onlyActive: true,
          search: query,
          searchColumns: ["scientific_name", "common_name"],
        }),
        listResourceRows<CultureMedia>("culture_media", {
          onlyActive: true,
          search: query,
          searchColumns: ["name"],
        }),
        listResourceRows<LaboratoryTest>("laboratory_tests", {
          onlyActive: true,
          search: query,
          searchColumns: ["name"],
        }),
        listResourceRows<Procedure>("procedures", {
          onlyActive: true,
          search: query,
          searchColumns: ["name"],
        }),
        listResourceRows<ClinicalAnalysis>("clinical_analyses", {
          onlyActive: true,
          search: query,
          searchColumns: ["name"],
        }),
        listResourceRows<LabDocument>("documents", {
          onlyActive: true,
          search: query,
          searchColumns: ["title"],
        }),
      ])
    : [[], [], [], [], [], []];

  const totalResults =
    microorganisms.length + media.length + tests.length + procedures.length + analyses.length + documents.length;

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <Header />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6 lg:px-8">
        <Breadcrumbs items={[{ label: "Inicio", href: "/" }, { label: "Buscar" }]} />
        <h1 className="mt-3 text-2xl font-semibold text-text">Buscar en LABDEX</h1>

        <form className="mt-5">
          <label className="flex items-center gap-2 rounded-md border border-border bg-surface px-4 py-3 focus-within:border-primary">
            <Search className="size-4 text-text-muted" />
            <input
              type="search"
              name="q"
              defaultValue={query}
              placeholder="Buscar microorganismos, medios, pruebas, procedimientos, análisis, documentos…"
              className="w-full bg-transparent text-sm outline-none placeholder:text-text-faint"
              autoFocus
            />
          </label>
        </form>

        {!query ? (
          <p className="mt-8 text-sm text-text-faint">
            Escribe un término para buscar en toda la base de conocimiento de LABDEX.
          </p>
        ) : totalResults === 0 ? (
          <div className="mt-8">
            <EmptyState
              icon={Search}
              title={`Sin resultados para "${query}"`}
              description="Prueba con otro término o revisa la ortografía."
            />
          </div>
        ) : (
          <div className="mt-8 flex flex-col gap-8">
            {microorganisms.length > 0 && (
              <ResultGroup title="Microorganismos">
                {microorganisms.map((m) => (
                  <Link
                    key={m.id}
                    href={`/contenido/microbiologia/${KIND_VALUE_TO_SLUG[m.kind]}/${m.slug}`}
                    className="flex items-center justify-between gap-2 rounded-md border border-border bg-surface px-4 py-3 text-sm uppercase tracking-wide text-text hover:border-accent"
                  >
                    {m.scientific_name}
                    <SampleDataBadge show={m.is_sample_data} />
                  </Link>
                ))}
              </ResultGroup>
            )}
            {media.length > 0 && (
              <ResultGroup title="Medios de cultivo">
                {media.map((item) => (
                  <ResultRow
                    key={item.id}
                    href={`/contenido/medios/${item.slug}`}
                    name={item.name}
                    sample={item.is_sample_data}
                  />
                ))}
              </ResultGroup>
            )}
            {tests.length > 0 && (
              <ResultGroup title="Pruebas de laboratorio">
                {tests.map((item) => (
                  <ResultRow
                    key={item.id}
                    href={`/contenido/pruebas/${item.slug}`}
                    name={item.name}
                    sample={item.is_sample_data}
                  />
                ))}
              </ResultGroup>
            )}
            {procedures.length > 0 && (
              <ResultGroup title="Procedimientos">
                {procedures.map((item) => (
                  <ResultRow
                    key={item.id}
                    href={`/contenido/procedimientos/${item.slug}`}
                    name={item.name}
                    sample={item.is_sample_data}
                  />
                ))}
              </ResultGroup>
            )}
            {analyses.length > 0 && (
              <ResultGroup title="Análisis clínicos">
                {analyses.map((item) => (
                  <ResultRow
                    key={item.id}
                    href={`/contenido/analisis/${item.slug}`}
                    name={item.name}
                    sample={item.is_sample_data}
                  />
                ))}
              </ResultGroup>
            )}
            {documents.length > 0 && (
              <ResultGroup title="Documentos">
                {documents.map((item) => (
                  <ResultRow key={item.id} href="/contenido/documentos" name={item.title} />
                ))}
              </ResultGroup>
            )}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

function ResultGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-text">{title}</h2>
      <div className="mt-2 flex flex-col gap-2">{children}</div>
    </div>
  );
}

function ResultRow({ name, sample, href }: { name: string; sample?: boolean; href: string }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between gap-2 rounded-md border border-border bg-surface px-4 py-3 text-sm text-text transition-colors hover:border-accent"
    >
      {name}
      <SampleDataBadge show={sample} />
    </Link>
  );
}
