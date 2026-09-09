import { Breadcrumbs } from "@/components/content/Breadcrumbs";
import { GuideModal } from "@/components/calculadoras/GuideModal";
import { DilutionCalculator } from "@/components/calculadoras/DilutionCalculator";
import { DILUTION_GUIDE } from "@/lib/calculadoras/guides";

export const metadata = {
  title: "Diluciones | Calculadoras | LABDEX",
};

export default function DilucionesPage() {
  return (
    <div>
      <Breadcrumbs
        items={[{ label: "Inicio", href: "/" }, { label: "Calculadoras", href: "/calculadoras" }, { label: "Diluciones" }]}
      />
      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-text">Diluciones</h1>
          <p className="mt-1 max-w-lg text-sm text-text-muted">C₁ × V₁ = C₂ × V₂</p>
        </div>
        <GuideModal title="Guía rápida — Diluciones" content={DILUTION_GUIDE} />
      </div>

      <div className="mt-8">
        <DilutionCalculator />
      </div>
    </div>
  );
}
