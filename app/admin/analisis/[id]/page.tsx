import { notFound } from "next/navigation";
import { getResourceRowById } from "@/lib/content/queries";
import { getActiveCategories } from "@/lib/content/getCategories";
import { ResourceForm } from "@/components/admin/crud/ResourceForm";
import type { ClinicalAnalysis } from "@/lib/supabase/types";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [record, categories] = await Promise.all([
    getResourceRowById<ClinicalAnalysis>("clinical_analyses", id),
    getActiveCategories(),
  ]);
  if (!record) notFound();
  return (
    <ResourceForm
      resourceKey="clinical_analyses"
      record={record as unknown as Record<string, unknown>}
      categories={categories}
    />
  );
}
