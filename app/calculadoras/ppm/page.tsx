import { Breadcrumbs } from "@/components/content/Breadcrumbs";
import { GuideModal } from "@/components/calculadoras/GuideModal";
import { PpmCalculator } from "@/components/calculadoras/PpmCalculator";
import { PPM_GUIDE } from "@/lib/calculadoras/guides";

export const metadata = {
  title: "ppm ↔ % | Calculadoras | LABDEX",
};

export default function PpmPage() {
  return (
    <div>
      <Breadcrumbs
        items={[{ label: "Inicio", href: "/" }, { label: "Calculadoras", href: "/calculadoras" }, { label: "ppm ↔ %" }]}
      />
      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-text">Conversión ppm ↔ %</h1>
          <p className="mt-1 max-w-lg text-sm text-text-muted">1 % = 10 000 ppm</p>
        </div>
        <GuideModal title="Guía rápida — ppm ↔ %" content={PPM_GUIDE} />
      </div>

      <div className="mt-8">
        <PpmCalculator />
      </div>
    </div>
  );
}
