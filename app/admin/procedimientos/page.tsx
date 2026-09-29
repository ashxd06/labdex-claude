import { listResourceRows } from "@/lib/content/queries";
import { ResourceListPage } from "@/components/admin/crud/ResourceListPage";
import type { Procedure } from "@/lib/supabase/types";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const { q, status } = await searchParams;
  const rows = await listResourceRows<Procedure>("procedures", {
    search: q,
    searchColumns: ["name","slug"],
    status: status && status !== "todos" ? status : undefined,
  });
  return <ResourceListPage resourceKey="procedures" rows={rows as unknown as Record<string, unknown>[]} searchQuery={q} statusQuery={status} />;
}

