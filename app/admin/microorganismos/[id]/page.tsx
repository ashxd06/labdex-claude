import { notFound } from "next/navigation";
import { getResourceRowById } from "@/lib/content/queries";
import { getActiveCategories } from "@/lib/content/getCategories";
import { getRelationsData } from "@/lib/content/relations";
import { ResourceForm } from "@/components/admin/crud/ResourceForm";
import { RelationsManager } from "@/components/admin/RelationsManager";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import type { Microorganism } from "@/lib/supabase/types";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [record, categories, relations] = await Promise.all([
    getResourceRowById<Microorganism>("microorganisms", id),
    getActiveCategories(),
    getRelationsData(id),
  ]);

  if (!record) notFound();

  return (
    <div className="flex flex-col gap-6">
      <ResourceForm
        resourceKey="microorganisms"
        record={record as unknown as Record<string, unknown>}
        categories={categories}
      />

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-text">Relaciones</h2>
          <p className="mt-1 text-sm text-text-muted">
            Vincula este microorganismo con medios de cultivo, pruebas y procedimientos ya existentes.
          </p>
        </CardHeader>
        <CardBody>
          <RelationsManager microorganismId={id} {...relations} />
        </CardBody>
      </Card>
    </div>
  );
}
