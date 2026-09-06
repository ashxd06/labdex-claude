import { notFound } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { listResourceRows } from "@/lib/content/queries";
import { KIND_SLUG_TO_VALUE, KIND_VALUE_TO_LABEL } from "@/lib/content/kindSlugs";
import { MicroorganismCard } from "@/components/content/MicroorganismCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Microscope } from "lucide-react";
import type { Microorganism } from "@/lib/supabase/types";

export const revalidate = 0;

export default async function MicroorganismKindPage({
  params,
}: {
  params: Promise<{ kind: string }>;
}) {
  const { kind: kindSlug } = await params;
  const kind = KIND_SLUG_TO_VALUE[kindSlug];
  if (!kind) notFound();

  const items = await listResourceRows<Microorganism>("microorganisms", {
    onlyActive: true,
    kind,
    orderBy: "scientific_name",
    ascending: true,
  });

  return (
    <div className="min-h-dvh bg-bg">
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <p className="font-mono text-xs text-accent">Microbiología</p>
        <h1 className="mt-1 text-2xl font-semibold text-text">{KIND_VALUE_TO_LABEL[kind]}</h1>

        {items.length === 0 ? (
          <div className="mt-8">
            <EmptyState
              icon={Microscope}
              title={`No hay ${KIND_VALUE_TO_LABEL[kind].toLowerCase()} registrados todavía.`}
              description="El administrador puede agregar contenido desde el panel de administración."
            />
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <MicroorganismCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
