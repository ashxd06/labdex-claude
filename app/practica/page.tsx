import { Breadcrumbs } from "@/components/content/Breadcrumbs";
import { PracticePanel } from "@/components/practica/PracticePanel";

export const metadata = {
  title: "Práctica | LABDEX",
};

export default function PracticaPage() {
  return (
    <div>
      <Breadcrumbs items={[{ label: "Inicio", href: "/" }, { label: "Práctica" }]} />
      <p className="mt-3 font-mono text-xs tracking-wide text-accent">LABDEX PRÁCTICA</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-text">Ejercicios de laboratorio</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-text-muted">
        Resuelve ejercicios generados al azar de cálculos habituales. Cada problema cambia sus valores y se valida con una tolerancia adecuada para el resultado.
      </p>
      <div className="mt-8">
        <PracticePanel />
      </div>
    </div>
  );
}
