import { notFound } from "next/navigation";
import { getResourceRowById } from "@/lib/content/queries";
import { ResourceForm } from "@/components/admin/crud/ResourceForm";
import type { CultureMedia } from "@/lib/supabase/types";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const record = await getResourceRowById<CultureMedia>("culture_media", id);
  if (!record) notFound();
  return <ResourceForm resourceKey="culture_media" record={record as unknown as Record<string, unknown>} />;
}
