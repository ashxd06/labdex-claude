import { listResourceRows } from "@/lib/content/queries";
import { ResourceListPage } from "@/components/admin/crud/ResourceListPage";
import type { Category } from "@/lib/supabase/types";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const { q, status } = await searchParams;
  const rows = await listResourceRows<Category>("categories", {
    search: q,
    searchColumns: ["name", "slug"],
    orderBy: "display_order",
    ascending: true,
    status: status && status !== "todos" ? status : undefined,
  });
  const names = new Map(rows.map((category) => [category.id, category.name]));
  const withParent = rows.map((category) => ({
    ...category,
    parent_name: category.parent_id ? names.get(category.parent_id) ?? "—" : "—",
  }));
  return <ResourceListPage resourceKey="categories" rows={withParent as unknown as Record<string, unknown>[]} searchQuery={q} statusQuery={status} />;
}
