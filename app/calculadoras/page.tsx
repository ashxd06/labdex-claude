import { Breadcrumbs } from "@/components/content/Breadcrumbs";
import { CalculatorCard } from "@/components/calculadoras/CalculatorCard";
import { CALCULATORS } from "@/lib/calculadoras/registry";

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

      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {CALCULATORS.map((calculator) => (
          <CalculatorCard key={calculator.id} calculator={calculator} />
        ))}
      </div>
    </div>
  );
}
