import { listResourceRows } from "@/lib/content/queries";
import type { Category } from "@/lib/supabase/types";

export async function getActiveCategories(): Promise<Category[]> {
  return listResourceRows<Category>("categories", { orderBy: "display_order", ascending: true });
}
