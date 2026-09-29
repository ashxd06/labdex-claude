import { notFound } from "next/navigation";
import { getResourceRowById } from "@/lib/content/queries";
import { ResourceForm } from "@/components/admin/crud/ResourceForm";
import type { Category } from "@/lib/supabase/types";
import { getActiveCategories } from "@/lib/content/getCategories";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [record, categories] = await Promise.all([
    getResourceRowById<Category>("categories", id),
    getActiveCategories(),
  ]);
  if (!record) notFound();
  return <ResourceForm resourceKey="categories" record={record as unknown as Record<string, unknown>} categories={categories} />;
}

