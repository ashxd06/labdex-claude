import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/content/Breadcrumbs";
import { PeriodicTable } from "@/components/calculadoras/PeriodicTable";

export const metadata: Metadata = {
  title: "Tabla periódica interactiva | LABDEX",
  description: "Explora los elementos químicos y practica la construcción de fórmulas y el cálculo de masa molar.",
};

export default function PeriodicTablePage() {
  return (
    <div>
      <Breadcrumbs items={[{ label: "Inicio", href: "/" }, { label: "Calculadoras", href: "/calculadoras" }, { label: "Tabla periódica" }]} />
      <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">Explorar y practicar</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-text">Tabla periódica</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-text-muted">Busca elementos por nombre, símbolo o número atómico. Selecciónalos para crear una fórmula de práctica y obtener su masa molar aproximada.</p>
        </div>
        <Link href="/calculadoras/molaridad" className="rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm font-medium text-text hover:border-accent">Abrir calculadora de molaridad</Link>
      </div>
      <PeriodicTable />
    </div>
  );
}
