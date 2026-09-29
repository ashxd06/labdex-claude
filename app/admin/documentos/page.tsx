import { listResourceRows } from "@/lib/content/queries";
import { ResourceListPage } from "@/components/admin/crud/ResourceListPage";
import type { LabDocument } from "@/lib/supabase/types";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const { q, status } = await searchParams;
  const rows = await listResourceRows<LabDocument>("documents", {
    search: q,
    searchColumns: ["title","slug"],
    status: status && status !== "todos" ? status : undefined,
  });
  return <ResourceListPage resourceKey="documents" rows={rows as unknown as Record<string, unknown>[]} searchQuery={q} statusQuery={status} />;
}
