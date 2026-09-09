import { Breadcrumbs } from "@/components/content/Breadcrumbs";
import { GuideModal } from "@/components/calculadoras/GuideModal";
import { ConcentrationCalculator } from "@/components/calculadoras/ConcentrationCalculator";
import { CONCENTRATION_GUIDE } from "@/lib/calculadoras/guides";

export const metadata = {
  title: "Concentración % | Calculadoras | LABDEX",
};

export default function ConcentracionPage() {
  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Inicio", href: "/" },
          { label: "Calculadoras", href: "/calculadoras" },
          { label: "Concentración %" },
        ]}
      />
      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-text">Concentración % m/v</h1>
          <p className="mt-1 max-w-lg text-sm text-text-muted">% m/v = (gramos de soluto / mL de solución) × 100</p>
        </div>
        <GuideModal title="Guía rápida — Concentración %" content={CONCENTRATION_GUIDE} />
      </div>

      <div className="mt-8">
        <ConcentrationCalculator />
      </div>
    </div>
  );
}
