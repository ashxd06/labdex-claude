import { Breadcrumbs } from "@/components/content/Breadcrumbs";
import { GuideModal } from "@/components/calculadoras/GuideModal";
import { UnitsCalculator } from "@/components/calculadoras/UnitsCalculator";
import { UNITS_GUIDE } from "@/lib/calculadoras/guides";

export const metadata = {
  title: "Conversión de unidades | Calculadoras | LABDEX",
};

export default function UnidadesPage() {
  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Inicio", href: "/" },
          { label: "Calculadoras", href: "/calculadoras" },
          { label: "Conversión de unidades" },
        ]}
      />
      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-text">Conversión de unidades</h1>
          <p className="mt-1 max-w-lg text-sm text-text-muted">Masa, volumen y concentración.</p>
        </div>
        <GuideModal title="Guía rápida — Conversión de unidades" content={UNITS_GUIDE} />
      </div>

      <div className="mt-8">
        <UnitsCalculator />
      </div>
    </div>
  );
}
