import type { ResourceConfig } from "@/lib/content/resourceConfigs";
import { listResourceRows } from "@/lib/content/queries";
import type { DuplicateMatch } from "@/lib/labdex-ai/admin/types";

/**
 * Detección de posibles duplicados antes de generar contenido nuevo (§21).
 * A propósito NO usa IA: tiene que ser determinística, rápida y barata
 * (§20 — "no usar IA para... duplicados simples"), y corre en cada intento
 * de generación de contenido nuevo.
 *
 * Estrategia: normaliza (minúsculas, sin acentos, sin espacios extra) el
 * título propuesto y el de cada registro existente, y considera "posible
 * duplicado" cuando:
 *   - son iguales tras normalizar, o
 *   - uno es un prefijo/substring completo de palabras del otro (para
 *     casos como "Microbiología" vs "Microbiología clínica", §13).
 */

export function normalizeTitle(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * Heurística pura (sin red, sin Supabase) usada tanto por
 * `findPossibleDuplicates` como por sus tests. Considera "posible
 * duplicado" cuando, tras normalizar (minúsculas, sin acentos, espacios
 * colapsados):
 *   - los títulos son idénticos, o
 *   - uno es el otro con una o más palabras adicionales al final
 *     ("microbiologia" vs "microbiologia clinica", §13).
 * Deliberadamente NO hace fuzzy-matching por substring suelto (evita falsos
 * positivos como "test" coincidiendo con "testosterona").
 */
export function isLikelyDuplicateTitle(a: string, b: string): boolean {
  const normA = normalizeTitle(a);
  const normB = normalizeTitle(b);
  if (!normA || !normB) return false;
  if (normA === normB) return true;
  return normA.startsWith(`${normB} `) || normB.startsWith(`${normA} `);
}

export async function findPossibleDuplicates(
  config: ResourceConfig,
  titleValue: string,
  excludeId?: string
): Promise<DuplicateMatch[]> {
  const trimmed = titleValue.trim();
  if (trimmed.length < 3) return [];

  const rows = await listResourceRows<Record<string, unknown>>(config.table, {
    search: trimmed,
    searchColumns: [config.titleField],
  });

  return rows
    .filter((row) => row.id !== excludeId)
    .filter((row) => {
      const existingTitle = row[config.titleField];
      return typeof existingTitle === "string" && isLikelyDuplicateTitle(existingTitle, trimmed);
    })
    .map((row) => ({
      id: String(row.id),
      title: String(row[config.titleField]),
      adminPath: `${config.adminPath}/${row.id}`,
    }));
}
