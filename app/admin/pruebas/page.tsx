import { listResourceRows } from "@/lib/content/queries";
import { ResourceListPage } from "@/components/admin/crud/ResourceListPage";
import type { LaboratoryTest } from "@/lib/supabase/types";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const rows = await listResourceRows<LaboratoryTest>("laboratory_tests", {
    search: q,
    searchColumns: ["name","slug"],
  });
  return <ResourceListPage resourceKey="laboratory_tests" rows={rows as unknown as Record<string, unknown>[]} searchQuery={q} />;
}
