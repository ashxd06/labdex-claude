import { notFound } from "next/navigation";
import { getResourceRowById } from "@/lib/content/queries";
import { ResourceForm } from "@/components/admin/crud/ResourceForm";
import type { LabDocument } from "@/lib/supabase/types";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const record = await getResourceRowById<LabDocument>("documents", id);
  if (!record) notFound();
  return <ResourceForm resourceKey="documents" record={record as unknown as Record<string, unknown>} />;
}
