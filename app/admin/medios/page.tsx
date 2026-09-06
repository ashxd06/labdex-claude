import { listResourceRows } from "@/lib/content/queries";
import { ResourceListPage } from "@/components/admin/crud/ResourceListPage";
import type { CultureMedia } from "@/lib/supabase/types";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const rows = await listResourceRows<CultureMedia>("culture_media", {
    search: q,
    searchColumns: ["name","slug"],
  });
  return <ResourceListPage resourceKey="culture_media" rows={rows as unknown as Record<string, unknown>[]} searchQuery={q} />;
}
