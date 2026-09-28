import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  BrainCircuit,
  Calculator,
  ClipboardCheck,
  ClipboardList,
  Droplets,
  FileStack,
  FlaskConical,
  GraduationCap,
  Microscope,
  Sparkles,
  Target,
  Workflow,
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ModulePreviewCard } from "@/components/ModulePreviewCard";
import { SearchBar } from "@/components/layout/SearchBar";
import {
  countResourceRowsResult,
  getCategoryContentCounts,
  getCategoryIdsBySlug,
} from "@/lib/content/queries";
import { formatCountLabel } from "@/lib/content/countLabel";

const CATEGORY_ICONS = {
  microbiologia: Microscope,
  hematologia: Droplets,
  bioquimica: FlaskConical,
} as const;

const CATEGORY_DESCRIPTIONS: Record<keyof typeof CATEGORY_ICONS, string> = {
  microbiologia: "Bacterias, hongos, virus, parásitos y medios de cultivo.",
  hematologia: "Series celulares, hemogramas y pruebas hematológicas.",
  bioquimica: "Perfiles metabólicos, enzimas y marcadores clínicos.",
};

const FEATURED_CATEGORY_SLUGS = ["microbiologia", "hematologia", "bioquimica"] as const;

export default async function HomePage() {
  const [microorganismCount, mediaCount, testCount, procedureCount, analysisCount, documentCount, categoryIdsResult] = await Promise.all([
    countResourceRowsResult("microorganisms"),
    countResourceRowsResult("culture_media"),
    countResourceRowsResult("laboratory_tests"),
    countResourceRowsResult("procedures"),
    countResourceRowsResult("clinical_analyses"),
    countResourceRowsResult("documents"),
    getCategoryIdsBySlug(FEATURED_CATEGORY_SLUGS),
  ]);
  const knownCategoryIds = Object.values(categoryIdsResult.map);
  const categoryCountsResult = await getCategoryContentCounts(knownCategoryIds);

  function categoryCount(slug: string): { count: number | null; error: string | null } {
    if (categoryIdsResult.error) return { count: null, error: categoryIdsResult.error };
    const categoryId = categoryIdsResult.map[slug];
    if (!categoryId) return { count: 0, error: null };
    if (categoryCountsResult.error) return { count: null, error: categoryCountsResult.error };
    return { count: categoryCountsResult.counts[categoryId] ?? 0, error: null };
  }

  const contentModules = FEATURED_CATEGORY_SLUGS.map((slug) => ({
    slug,
    href: `/contenido/${slug}`,
    countLabel: formatCountLabel(categoryCount(slug), { singular: "contenido", plural: "contenidos" }),
  }));

  const resourceModules = [
    { icon: FlaskConical, title: "Medios de cultivo", href: "/contenido/medios", countLabel: formatCountLabel(mediaCount, { singular: "registro", plural: "registros" }) },
    { icon: ClipboardCheck, title: "Pruebas", href: "/contenido/pruebas", countLabel: formatCountLabel(testCount, { singular: "registro", plural: "registros" }) },
    { icon: Workflow, title: "Procedimientos", href: "/contenido/procedimientos", countLabel: formatCountLabel(procedureCount, { singular: "registro", plural: "registros" }) },
    { icon: FileStack, title: "Análisis clínicos", href: "/contenido/analisis", countLabel: formatCountLabel(analysisCount, { singular: "registro", plural: "registros" }) },
    { icon: FileStack, title: "Documentos", href: "/contenido/documentos", countLabel: formatCountLabel(documentCount, { singular: "registro", plural: "registros" }) },
  ];

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <Header />
      <main className="flex-1">
        <section className="relative overflow-hidden border-b border-border">
          <div className="ldx-grid-pattern pointer-events-none absolute inset-0 [mask-image:linear-gradient(to_bottom,black,transparent)]" />
          <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.25fr_0.75fr] lg:px-8 lg:py-20">
            <div>
              <p className="font-mono text-xs tracking-wide text-accent">LABDEX · APRENDE HACIENDO</p>
              <h1 className="mt-3 max-w-2xl text-4xl font-semibold tracking-tight text-text sm:text-5xl">Aprende laboratorio clínico con claridad.</h1>
              <p className="mt-4 max-w-xl text-lg text-text-muted">Contenido, cálculos y ejercicios prácticos para avanzar tema por tema.</p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link href="/practica" className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90">
                  Practicar ahora <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
                <Link href="/contenido/bioquimica" className="inline-flex items-center justify-center gap-2 rounded-md border border-border bg-surface px-5 py-3 text-sm font-semibold text-text transition-colors hover:border-accent">
                  Explorar Bioquímica <BookOpen className="size-4" aria-hidden="true" />
                </Link>
              </div>
              <div className="mt-8 max-w-xl"><SearchBar compact /></div>
            </div>

            <aside className="rounded-xl border border-accent/30 bg-surface/90 p-6 shadow-lg">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-lg bg-primary-soft text-primary"><Target className="size-5" aria-hidden="true" /></span>
                <div>
                  <p className="font-mono text-xs text-accent">EMPIEZA HOY</p>
                  <h2 className="text-base font-semibold text-text">Práctica rápida</h2>
                </div>
              </div>
              <p className="mt-5 text-sm text-text-muted">Resuelve un ejercicio aleatorio de diluciones, concentraciones o molaridad y recibe una explicación al instante.</p>
              <Link href="/practica" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-accent hover:underline">
                Resolver un ejercicio <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </aside>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-baseline">
            <div>
              <p className="font-mono text-xs tracking-wide text-accent">RUTA RECOMENDADA</p>
              <h2 className="mt-1 text-xl font-semibold text-text">Domina los fundamentos de Bioquímica</h2>
            </div>
            <Link href="/contenido/bioquimica" className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline">Ver ruta <ArrowRight className="size-4" aria-hidden="true" /></Link>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {[
              { step: "01", icon: BookOpen, title: "Consulta", text: "Revisa conceptos, pruebas y valores de referencia." },
              { step: "02", icon: Calculator, title: "Practica", text: "Aplica cálculos de concentración, dilución y molaridad." },
              { step: "03", icon: BrainCircuit, title: "Interpreta", text: "Conecta el resultado con un caso de laboratorio." },
            ].map(({ step, icon: Icon, title, text }) => (
              <div key={step} className="rounded-lg border border-border bg-surface p-5">
                <div className="flex items-center justify-between">
                  <span className="flex size-9 items-center justify-center rounded-md bg-primary-soft text-primary"><Icon className="size-5" aria-hidden="true" /></span>
                  <span className="font-mono text-xs text-text-faint">{step}</span>
                </div>
                <h3 className="mt-4 text-sm font-semibold text-text">{title}</h3>
                <p className="mt-1 text-sm text-text-muted">{text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-14 sm:px-6 lg:px-8">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-semibold text-text">Áreas para explorar</h2>
            <Link href="/contenido" className="text-sm text-text-faint hover:text-accent">Ver todo el contenido</Link>
          </div>
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {contentModules.map((module) => (
              <ModulePreviewCard
                key={module.slug}
                icon={CATEGORY_ICONS[module.slug]}
                title={module.slug.charAt(0).toUpperCase() + module.slug.slice(1)}
                description={CATEGORY_DESCRIPTIONS[module.slug]}
                href={module.href}
                available
                countLabel={module.countLabel}
              />
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-14 sm:px-6 lg:px-8">
          <h2 className="text-lg font-semibold text-text">Recursos de consulta</h2>
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {resourceModules.map((module) => <ModulePreviewCard key={module.title} icon={module.icon} title={module.title} description="" href={module.href} available countLabel={module.countLabel} />)}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
          <div className="rounded-xl border border-border bg-surface p-6 sm:flex sm:items-center sm:justify-between sm:gap-8">
            <div>
              <p className="font-mono text-xs tracking-wide text-accent">SIGUIENTE NIVEL</p>
              <h2 className="mt-1 text-xl font-semibold text-text">Convierte la teoría en práctica.</h2>
              <p className="mt-2 max-w-2xl text-sm text-text-muted">Usa las calculadoras y los ejercicios de LABDEX para reforzar cada tema antes de pasar a casos más complejos.</p>
            </div>
            <Link href="/calculadoras" className="mt-5 inline-flex shrink-0 items-center justify-center gap-2 rounded-md border border-accent px-4 py-2.5 text-sm font-semibold text-accent hover:bg-primary-soft sm:mt-0">
              Abrir calculadoras <Calculator className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
