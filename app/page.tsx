import Link from "next/link";
import {
  ArrowRight,
  Activity,
  BookOpen,
  BrainCircuit,
  Calculator,
  ClipboardCheck,
  Droplets,
  FileStack,
  FlaskConical,
  GraduationCap,
  HeartPulse,
  Microscope,
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

export const revalidate = 0;

export default async function HomePage() {
  const [microorganismCount, mediaCount, testCount, procedureCount, analysisCount, documentCount, categoryIdsResult] = await Promise.all([
    countResourceRowsResult("microorganisms", true),
    countResourceRowsResult("culture_media", true),
    countResourceRowsResult("laboratory_tests", true),
    countResourceRowsResult("procedures", true),
    countResourceRowsResult("clinical_analyses", true),
    countResourceRowsResult("documents", true),
    getCategoryIdsBySlug([...FEATURED_CATEGORY_SLUGS]),
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
    count: slug === "microbiologia" ? microorganismCount : categoryCount(slug),
  }));

  const resourceModules = [
    { icon: FlaskConical, title: "Medios de cultivo", description: "Medios, usos e interpretación del crecimiento.", href: "/contenido/medios", count: mediaCount },
    { icon: ClipboardCheck, title: "Pruebas", description: "Fundamento, muestra y lectura de pruebas.", href: "/contenido/pruebas", count: testCount },
    { icon: Workflow, title: "Procedimientos", description: "Pasos, materiales y precauciones técnicas.", href: "/contenido/procedimientos", count: procedureCount },
    { icon: FileStack, title: "Análisis clínicos", description: "Muestras, métodos y rangos de referencia.", href: "/contenido/analisis", count: analysisCount },
    { icon: FileStack, title: "Documentos", description: "Material de consulta para el estudio.", href: "/contenido/documentos", count: documentCount },
  ];

  function contentCountLabel(
    result: { count: number | null; error: string | null },
    singular: string,
    plural: string
  ) {
    const label = formatCountLabel(result, { singular, plural });
    return result.count === 0 ? `${label} · en preparación` : label;
  }

  const audiences = [
    {
      label: "PARA ESTUDIANTES",
      title: "Aprende y practica",
      description: "Refuerza tus temas con fichas, cálculos y retos diarios. Puedes empezar sin cuenta; inicia sesión para sincronizar tu progreso.",
      href: "/reto-diario",
      cta: "Ir a estudiar",
      icon: GraduationCap,
      tone: "bg-primary-soft text-primary",
    },
    {
      label: "PARA LABORATORISTAS",
      title: "Organiza el trabajo del laboratorio",
      description: "Accede a solicitudes, muestras, resultados e informes. El módulo operativo requiere una cuenta con permisos.",
      href: "/laboratorio",
      cta: "Abrir laboratorio",
      icon: Microscope,
      tone: "bg-accent-soft text-accent",
    },
    {
      label: "PARA TODO PÚBLICO",
      title: "Entiende los análisis",
      description: "Consulta conceptos y pruebas con explicaciones educativas. La información no sustituye la evaluación de un profesional de salud.",
      href: "/contenido",
      cta: "Explorar contenido",
      icon: HeartPulse,
      tone: "bg-success-soft text-success",
    },
  ];

  const learningSteps = [
    { step: "01", icon: BookOpen, title: "Consulta", text: "Comprende el concepto, la muestra y el fundamento de cada tema." },
    { step: "02", icon: Calculator, title: "Practica", text: "Resuelve cálculos y retos con una explicación paso a paso." },
    { step: "03", icon: BrainCircuit, title: "Relaciona", text: "Conecta la teoría con escenarios educativos de laboratorio." },
  ];

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <Header />
      <main className="flex-1">
        <section className="relative overflow-hidden border-b border-border bg-surface">
          <div className="ldx-grid-pattern pointer-events-none absolute inset-0 opacity-30 [mask-image:linear-gradient(to_bottom,black,transparent)]" />
          <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.2fr_0.8fr] lg:px-8 lg:py-20">
            <div>
              <p className="font-mono text-xs font-semibold tracking-wide text-accent">LABDEX · LABORATORIO CLÍNICO, CIENCIA Y APRENDIZAJE</p>
              <h1 className="mt-3 max-w-2xl text-4xl font-semibold tracking-tight text-text sm:text-5xl">Aprende laboratorio clínico con claridad.</h1>
              <p className="mt-4 max-w-xl text-lg text-text-muted">Conocimiento confiable, práctica guiada y herramientas útiles para estudiar o trabajar en el laboratorio.</p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link href="/reto-diario" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-hover">
                  Practicar ahora <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
                <Link href="/contenido" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-border-strong bg-surface px-5 py-3 text-sm font-semibold text-text transition-colors hover:border-accent hover:bg-surface-2">
                  Explorar contenido <BookOpen className="size-4" aria-hidden="true" />
                </Link>
              </div>
              <div className="mt-8 max-w-xl lg:hidden"><SearchBar compact /></div>
            </div>

            <aside className="flex flex-col justify-center rounded-2xl border border-border bg-bg-raised p-6 shadow-[var(--ldx-shadow)] sm:p-8">
              <div className="flex items-center gap-3">
                <span className="flex size-11 items-center justify-center rounded-xl bg-primary-soft text-primary"><Target className="size-5" aria-hidden="true" /></span>
                <div>
                  <p className="font-mono text-xs font-semibold text-accent">UN BUEN PRIMER PASO</p>
                  <h2 className="text-lg font-semibold text-text">Practica un caso breve</h2>
                </div>
              </div>
              <p className="mt-5 text-sm leading-6 text-text-muted">Pon a prueba lo que sabes, revela la respuesta y repasa el concepto cuando lo necesites.</p>
              <Link href="/reto-diario" className="mt-6 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-accent hover:underline">
                Abrir el reto diario <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </aside>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-14">
          <div className="max-w-2xl">
            <p className="font-mono text-xs font-semibold tracking-wide text-accent">UNA PLATAFORMA, DISTINTOS CAMINOS</p>
            <h2 className="mt-2 text-2xl font-semibold text-text">¿Qué vienes a hacer hoy?</h2>
            <p className="mt-2 text-sm text-text-muted">Elige un acceso rápido según lo que necesitas. No tienes que seleccionar un tipo de usuario.</p>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {audiences.map(({ label, title, description, href, cta, icon: Icon, tone }) => (
              <Link key={label} href={href} className="group flex min-h-full flex-col rounded-xl border border-border bg-surface p-5 shadow-[var(--ldx-shadow)] transition-colors hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 sm:p-6">
                <div className="flex items-start justify-between gap-3">
                  <span className={`flex size-11 items-center justify-center rounded-xl ${tone}`}><Icon className="size-5" aria-hidden="true" /></span>
                  <span className="font-mono text-[0.65rem] font-semibold tracking-wide text-text-faint">{label}</span>
                </div>
                <h3 className="mt-5 text-lg font-semibold text-text">{title}</h3>
                <p className="mt-2 flex-1 text-sm leading-6 text-text-muted">{description}</p>
                <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-accent">
                  {cta} <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
            <div>
              <p className="font-mono text-xs font-semibold tracking-wide text-accent">RUTA DE APRENDIZAJE</p>
              <h2 className="mt-1 text-xl font-semibold text-text">De la consulta a la comprensión</h2>
            </div>
            <Link href="/contenido" className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-accent hover:underline">Ver fichas y recursos <ArrowRight className="size-4" aria-hidden="true" /></Link>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {learningSteps.map(({ step, icon: Icon, title, text }) => (
              <div key={step} className="rounded-xl border border-border bg-surface p-5 shadow-[var(--ldx-shadow)]">
                <div className="flex items-center justify-between">
                  <span className="flex size-10 items-center justify-center rounded-lg bg-primary-soft text-primary"><Icon className="size-5" aria-hidden="true" /></span>
                  <span className="font-mono text-xs text-text-faint">{step}</span>
                </div>
                <h3 className="mt-4 text-sm font-semibold text-text">{title}</h3>
                <p className="mt-1 text-sm leading-6 text-text-muted">{text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="font-mono text-xs font-semibold tracking-wide text-accent">BASE DE CONOCIMIENTO</p>
              <h2 className="mt-1 text-xl font-semibold text-text">Áreas para explorar</h2>
            </div>
            <Link href="/contenido" className="min-h-11 inline-flex items-center text-sm font-medium text-accent hover:underline">Ver todas <ArrowRight className="ml-1 size-4" aria-hidden="true" /></Link>
          </div>
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {contentModules.map((module) => (
              <ModulePreviewCard
                key={module.slug}
                icon={CATEGORY_ICONS[module.slug]}
                title={module.slug.charAt(0).toUpperCase() + module.slug.slice(1)}
                description={CATEGORY_DESCRIPTIONS[module.slug]}
                href={module.href}
                available={module.count.count !== 0}
                countLabel={contentCountLabel(module.count, "ficha publicada", "fichas publicadas")}
              />
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="font-mono text-xs font-semibold tracking-wide text-accent">CONSULTA TÉCNICA</p>
              <h2 className="mt-1 text-xl font-semibold text-text">Recursos de laboratorio</h2>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {resourceModules.map((module) => (
              <ModulePreviewCard
                key={module.title}
                icon={module.icon}
                title={module.title}
                description={module.description}
                href={module.href}
                available={module.count.count !== 0}
                countLabel={contentCountLabel(module.count, "ficha publicada", "fichas publicadas")}
              />
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-border bg-surface p-6 shadow-[var(--ldx-shadow)] sm:flex sm:items-center sm:justify-between sm:gap-8 sm:p-8">
            <div>
              <p className="font-mono text-xs font-semibold tracking-wide text-accent">HERRAMIENTAS DE APRENDIZAJE</p>
              <h2 className="mt-1 text-xl font-semibold text-text">Comprueba cada cálculo, paso a paso.</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-text-muted">Las calculadoras muestran la fórmula y el procedimiento para que puedas revisar cómo se obtiene cada resultado.</p>
            </div>
            <Link href="/calculadoras" className="mt-5 inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-md border border-accent px-4 py-2.5 text-sm font-semibold text-accent hover:bg-accent-soft sm:mt-0">
              Abrir calculadoras <Calculator className="size-4" aria-hidden="true" />
            </Link>
          </div>
          <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-text-faint">
            <Activity className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            El contenido de consulta es educativo y no reemplaza los protocolos vigentes ni el criterio de un profesional de salud.
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
}
