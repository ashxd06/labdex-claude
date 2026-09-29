import { Breadcrumbs } from "@/components/content/Breadcrumbs";
import { GuideModal } from "@/components/calculadoras/GuideModal";
import { MolarityCalculator } from "@/components/calculadoras/MolarityCalculator";
import { MOLARITY_GUIDE } from "@/lib/calculadoras/guides";

export const metadata = {
  title: "Molaridad | Calculadoras | LABDEX",
};

type MolaridadPageProps = { searchParams: Promise<{ masaMolar?: string | string[]; formula?: string | string[] }> };

export default async function MolaridadPage({ searchParams }: MolaridadPageProps) {
  const params = await searchParams;
  const massParam = Array.isArray(params.masaMolar) ? params.masaMolar[0] : params.masaMolar;
  const formulaParam = Array.isArray(params.formula) ? params.formula[0] : params.formula;
  const parsedMolarMass = massParam ? Number(massParam) : NaN;
  const initialMolarMass = Number.isFinite(parsedMolarMass) && parsedMolarMass > 0 && parsedMolarMass <= 100_000 ? parsedMolarMass : undefined;
  const formula = initialMolarMass && formulaParam && formulaParam.length <= 100 ? formulaParam : undefined;
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
        <MolarityCalculator initialMolarMass={initialMolarMass} formula={formula} />
      </div>
    </div>
  );
}

