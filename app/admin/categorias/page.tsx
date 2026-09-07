import { listResourceRows } from "@/lib/content/queries";
import { ResourceListPage } from "@/components/admin/crud/ResourceListPage";
import type { Category } from "@/lib/supabase/types";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const rows = await listResourceRows<Category>("categories", {
    search: q,
    searchColumns: ["name", "slug"],
    orderBy: "display_order",
    ascending: true,
  });
  return <ResourceListPage resourceKey="categories" rows={rows as unknown as Record<string, unknown>[]} searchQuery={q} />;
}
