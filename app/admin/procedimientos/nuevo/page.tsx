import { ResourceForm } from "@/components/admin/crud/ResourceForm";
import { getActiveCategories } from "@/lib/content/getCategories";

export default async function Page() {
  const categories = await getActiveCategories();
  return <ResourceForm resourceKey="procedures" categories={categories} />;
}
