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
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import { ModulePreviewCard } from "@/components/ModulePreviewCard";

const CONTENT_MODULES = [
  {
    icon: Microscope,
    title: "Microbiología",
    description: "Bacterias, hongos, virus, parásitos y medios de cultivo.",
    href: "/contenido/microbiologia",
    available: true,
  },
  {
    icon: Droplets,
    title: "Hematología",
    description: "Series celulares, hemogramas y pruebas hematológicas.",
    href: "/contenido/hematologia",
    available: true,
  },
  {
    icon: FlaskConical,
    title: "Bioquímica",
    description: "Perfiles metabólicos, enzimas y marcadores clínicos.",
    href: "/contenido/bioquimica",
    available: true,
  },
  {
    icon: Bug,
    title: "Parasitología",
    description: "Identificación y ciclos biológicos de parásitos.",
    href: "/contenido/parasitologia",
    available: true,
  },
  {
    icon: ShieldCheck,
    title: "Inmunología",
    description: "Serología, marcadores inmunológicos y reacciones.",
    href: "/contenido/inmunologia",
    available: true,
  },
  {
    icon: ScanEye,
    title: "Citología",
    description: "Estudio morfológico de células y tejidos.",
    href: "/contenido/citologia",
    available: true,
  },
];

const WORKSPACE_MODULES = [
  {
    icon: ClipboardList,
    title: "Laboratorio",
    description: "Resultados clínicos, análisis, procedimientos y calculadoras.",
  },
  {
    icon: GraduationCap,
    title: "Estudio",
    description: "Material y herramientas de estudio para el equipo del laboratorio.",
  },
  {
    icon: Sparkles,
    title: "LABDEX AI",
    description: "Asistente de laboratorio impulsado por Gemini.",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-dvh bg-bg">
      <Header />

      <main>
        <section className="relative overflow-hidden border-b border-border">
          <div className="ldx-grid-pattern pointer-events-none absolute inset-0 [mask-image:linear-gradient(to_bottom,black,transparent)]" />
          <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
            <p className="font-mono text-xs tracking-wide text-accent">LABDEX</p>
            <h1 className="mt-3 max-w-2xl text-4xl font-semibold tracking-tight text-text sm:text-5xl">
              Laboratorio Clínico
            </h1>
            <p className="mt-4 max-w-xl text-lg text-text-muted">
              Ciencia · Tecnología · Conocimiento
            </p>
            <p className="mt-2 max-w-xl text-sm text-text-faint">
              Fase 2: base de conocimiento y panel de administración. El
              contenido científico se construye desde el panel de
              administración y crecerá progresivamente.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-semibold text-text">Contenido</h2>
            <span className="text-sm text-text-faint">Explora por categoría</span>
          </div>
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {CONTENT_MODULES.map((module) => (
              <ModulePreviewCard key={module.title} {...module} />
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
          <h2 className="text-lg font-semibold text-text">Herramientas</h2>
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {WORKSPACE_MODULES.map((module) => (
              <ModulePreviewCard key={module.title} {...module} />
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-8 text-sm text-text-faint sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <span>© {new Date().getFullYear()} LABDEX</span>
          <span className="font-mono text-xs">Fase 2 · Base de conocimiento</span>
        </div>
      </footer>
    </div>
  );
}
