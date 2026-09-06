import { listResourceRows } from "@/lib/content/queries";
import { ResourceListPage } from "@/components/admin/crud/ResourceListPage";
import type { ClinicalAnalysis } from "@/lib/supabase/types";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const rows = await listResourceRows<ClinicalAnalysis>("clinical_analyses", {
    search: q,
    searchColumns: ["name","slug"],
  });
  return <ResourceListPage resourceKey="clinical_analyses" rows={rows as unknown as Record<string, unknown>[]} searchQuery={q} />;
}
