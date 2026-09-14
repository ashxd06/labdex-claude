import {
  Microscope,
  Droplets,
  FlaskConical,
  Bug,
  ShieldCheck,
  ScanEye,
  ClipboardList,
  GraduationCap,
  Sparkles,
  Workflow,
  ClipboardCheck,
  FileStack,
  Calculator,
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

const CATEGORY_ICONS: Record<string, typeof Microscope> = {
  microbiologia: Microscope,
  hematologia: Droplets,
  bioquimica: FlaskConical,
  parasitologia: Bug,
  inmunologia: ShieldCheck,
  citologia: ScanEye,
};

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  microbiologia: "Bacterias, hongos, virus, parásitos y medios de cultivo.",
  hematologia: "Series celulares, hemogramas y pruebas hematológicas.",
  bioquimica: "Perfiles metabólicos, enzimas y marcadores clínicos.",
  parasitologia: "Identificación y ciclos biológicos de parásitos.",
  inmunologia: "Serología, marcadores inmunológicos y reacciones.",
  citologia: "Estudio morfológico de células y tejidos.",
};

const OTHER_CATEGORY_SLUGS = ["hematologia", "bioquimica", "parasitologia", "inmunologia", "citologia"] as const;

export default async function HomePage() {
  const [microorganismCount, mediaCount, testCount, procedureCount, analysisCount, documentCount, categoryIdsResult] = await Promise.all([
    countResourceRowsResult("microorganisms"),
    countResourceRowsResult("culture_media"),
    countResourceRowsResult("laboratory_tests"),
    countResourceRowsResult("procedures"),
    countResourceRowsResult("clinical_analyses"),
    countResourceRowsResult("documents"),
    getCategoryIdsBySlug([...OTHER_CATEGORY_SLUGS]),
  ]);
  const knownCategoryIds = Object.values(categoryIdsResult.map);
  const categoryCountsResult = await getCategoryContentCounts(knownCategoryIds);

  function otherCategoryCount(slug: string): { count: number | null; error: string | null } {
    if (categoryIdsResult.error) return { count: null, error: categoryIdsResult.error };
    const categoryId = categoryIdsResult.map[slug];
    if (!categoryId) return { count: 0, error: null };
    if (categoryCountsResult.error) return { count: null, error: categoryCountsResult.error };
    return { count: categoryCountsResult.counts[categoryId] ?? 0, error: null };
  }

  const contentModules = [
    { slug: "microbiologia", href: "/contenido/microbiologia", countLabel: formatCountLabel(microorganismCount, { singular: "contenido", plural: "contenidos" }) },
    ...OTHER_CATEGORY_SLUGS.map((slug) => ({ slug, href: `/contenido/${slug}`, countLabel: formatCountLabel(otherCategoryCount(slug), { singular: "contenido", plural: "contenidos" }) })),
  ];

  const resourceModules = [
    { icon: FlaskConical, title: "Medios de cultivo", href: "/contenido/medios", countLabel: formatCountLabel(mediaCount, { singular: "registro", plural: "registros" }) },
    { icon: ClipboardCheck, title: "Pruebas", href: "/contenido/pruebas", countLabel: formatCountLabel(testCount, { singular: "registro", plural: "registros" }) },
    { icon: Workflow, title: "Procedimientos", href: "/contenido/procedimientos", countLabel: formatCountLabel(procedureCount, { singular: "registro", plural: "registros" }) },
    { icon: FileStack, title: "Análisis clínicos", href: "/contenido/analisis", countLabel: formatCountLabel(analysisCount, { singular: "registro", plural: "registros" }) },
    { icon: FileStack, title: "Documentos", href: "/contenido/documentos", countLabel: formatCountLabel(documentCount, { singular: "registro", plural: "registros" }) },
  ];

  const workspaceModules = [
    { icon: ClipboardList, title: "Laboratorio", description: "Resultados clínicos, análisis, procedimientos y calculadoras.", href: "/laboratorio", available: true, ctaLabel: "Abrir laboratorio →" },
    { icon: GraduationCap, title: "Estudio", description: "Material y herramientas de estudio para el equipo del laboratorio.", href: "/estudio", available: true, ctaLabel: "Ir a estudiar →" },
    { icon: Sparkles, title: "LABDEX AI", description: "Asistente de laboratorio impulsado por Gemini.", href: "/labdex-ai", available: true, ctaLabel: "Abrir LABDEX AI →" },
    { icon: Calculator, title: "Práctica", description: "Ejercicios aleatorios de diluciones y concentraciones.", href: "/practica", available: true, ctaLabel: "Practicar →" },
  ];

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <Header />
      <main className="flex-1">
        <section className="relative overflow-hidden border-b border-border">
          <div className="ldx-grid-pattern pointer-events-none absolute inset-0 [mask-image:linear-gradient(to_bottom,black,transparent)]" />
          <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
            <p className="font-mono text-xs tracking-wide text-accent">LABDEX</p>
            <h1 className="mt-3 max-w-2xl text-4xl font-semibold tracking-tight text-text sm:text-5xl">Laboratorio Clínico</h1>
            <p className="mt-4 max-w-xl text-lg text-text-muted">Ciencia · Tecnología · Conocimiento</p>
            <p className="mt-2 max-w-xl text-sm text-text-faint">Explora, consulta y organiza conocimiento especializado en Laboratorio Clínico.</p>
            <div className="mt-6 max-w-xl"><SearchBar compact /></div>
          </div>
        </section>
        <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="flex items-baseline justify-between"><h2 className="text-lg font-semibold text-text">Contenido</h2><span className="text-sm text-text-faint">Explora por categoría</span></div>
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {contentModules.map((module) => <ModulePreviewCard key={module.slug} icon={CATEGORY_ICONS[module.slug]} title={module.slug.charAt(0).toUpperCase() + module.slug.slice(1)} description={CATEGORY_DESCRIPTIONS[module.slug]} href={module.href} available countLabel={module.countLabel} />)}
          </div>
        </section>
        <section className="mx-auto max-w-7xl px-4 pb-14 sm:px-6 lg:px-8">
          <h2 className="text-lg font-semibold text-text">Recursos</h2>
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {resourceModules.map((module) => <ModulePreviewCard key={module.title} icon={module.icon} title={module.title} description="" href={module.href} available countLabel={module.countLabel} />)}
          </div>
        </section>
        <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
          <h2 className="text-lg font-semibold text-text">Herramientas</h2>
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {workspaceModules.map((module) => <ModulePreviewCard key={module.title} {...module} />)}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
