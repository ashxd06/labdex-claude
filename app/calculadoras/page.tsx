import { Breadcrumbs } from "@/components/content/Breadcrumbs";
import { CalculatorCard } from "@/components/calculadoras/CalculatorCard";
import { CALCULATORS } from "@/lib/calculadoras/registry";
import Link from "next/link";
import { Atom } from "lucide-react";

export const metadata = {
  title: "Calculadoras | LABDEX",
};

export default function CalculadorasPage() {
  return (
    <div>
      <Breadcrumbs items={[{ label: "Inicio", href: "/" }, { label: "Calculadoras" }]} />
      <h1 className="mt-3 text-2xl font-semibold text-text">Calculadoras</h1>
      <p className="mt-1 max-w-xl text-sm text-text-muted">
        Herramientas deterministas para cálculos habituales de laboratorio. Cada resultado incluye
        la fórmula, la sustitución de valores y el procedimiento paso a paso.
      </p>

      <Link href="/calculadoras/tabla-periodica" className="mt-5 flex items-center gap-4 rounded-xl border border-accent/40 bg-accent-soft/40 p-4 transition-colors hover:border-accent sm:p-5">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent"><Atom className="size-6" aria-hidden="true" /></span>
        <span className="min-w-0 flex-1"><span className="block font-semibold text-text">Tabla periódica interactiva</span><span className="mt-1 block text-sm text-text-muted">Explora elementos, arma fórmulas y lleva la masa molar a la calculadora.</span></span>
        <span className="hidden text-sm font-medium text-accent sm:block">Explorar →</span>
      </Link>

      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {CALCULATORS.map((calculator) => (
          <CalculatorCard key={calculator.id} calculator={calculator} />
        ))}
      </div>
    </div>
  );
}

