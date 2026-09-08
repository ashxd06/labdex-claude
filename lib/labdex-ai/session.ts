import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/getSession";

/**
 * LABDEX AI es una herramienta educativa: cualquier usuario autenticado
 * puede usarla (a diferencia de `requireLabSession`, en
 * `lib/lab/shared.ts`, que protege datos clínicos y solo tiene sentido
 * para el personal de laboratorio). Aun así, se exige sesión iniciada
 * porque el historial de conversaciones se guarda por `user_id` (Fase 5,
 * §12-13).
 */
export async function requireAiSession(nextPath: string) {
  const { user, profile } = await getSession();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }
  return { user, profile };
}
