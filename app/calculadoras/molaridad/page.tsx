import { Breadcrumbs } from "@/components/content/Breadcrumbs";
import { GuideModal } from "@/components/calculadoras/GuideModal";
import { MolarityCalculator } from "@/components/calculadoras/MolarityCalculator";
import { MOLARITY_GUIDE } from "@/lib/calculadoras/guides";

export const metadata = {
  title: "Molaridad | Calculadoras | LABDEX",
};

export default function MolaridadPage() {
  return (
    <div>
      <Breadcrumbs
        items={[{ label: "Inicio", href: "/" }, { label: "Calculadoras", href: "/calculadoras" }, { label: "Molaridad" }]}
      />
      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-text">Molaridad</h1>
          <p className="mt-1 max-w-lg text-sm text-text-muted">M = mol / L</p>
        </div>
        <GuideModal title="Guía rápida — Molaridad" content={MOLARITY_GUIDE} />
      </div>

      <div className="mt-8">
        <MolarityCalculator />
      </div>
    </div>
  );
}
