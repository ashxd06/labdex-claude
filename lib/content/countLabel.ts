import type { CountResult } from "@/lib/content/queries";

/**
 * Texto para mostrar un conteo que puede haber fallado (Fase 7, §2/§31).
 *
 * Si `result.error` no es `null`, NUNCA se muestra "0 <algo>": eso es
 * exactamente el anti-patrón que esta fase corrige (una consulta fallida
 * es indistinguible de "no hay registros"). En su lugar se devuelve un
 * texto de error explícito para que la tarjeta lo muestre en vez del
 * conteo.
 */
export function formatCountLabel(
  result: CountResult,
  { singular, plural }: { singular: string; plural: string }
): string {
  if (result.error !== null) {
    return "No se pudo cargar";
  }
  const count = result.count ?? 0;
  return `${count} ${count === 1 ? singular : plural}`;
}
