import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Rate limiting de LABDEX AI (Fase 5, §18).
 *
 * No se introduce infraestructura externa (Redis, colas, etc.) para esto:
 * se cuenta cuántos mensajes de usuario se han insertado en `ai_messages`
 * en la ventana reciente, usando el mismo cliente de Supabase de la
 * petición (respeta RLS: un usuario solo puede contar sus propios
 * mensajes, que es exactamente lo que queremos). Esto funciona igual en un
 * entorno serverless con múltiples instancias porque el conteo vive en la
 * base de datos, no en memoria del proceso.
 */

const WINDOW_SECONDS = 60;
const MAX_MESSAGES_PER_WINDOW = 12;

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds?: number;
}

export async function checkRateLimit(
  supabase: SupabaseClient,
  userId: string
): Promise<RateLimitResult> {
  const since = new Date(Date.now() - WINDOW_SECONDS * 1000).toISOString();

  const { count, error } = await supabase
    .from("ai_messages")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("role", "user")
    .gte("created_at", since);

  if (error) {
    // Si la comprobación falla (p.ej. problema transitorio de red), no se
    // bloquea al usuario: se registra y se deja pasar. El rate limit es una
    // protección contra abuso, no la última línea de seguridad.
    console.error("[labdex-ai:rateLimit]", error.message);
    return { allowed: true };
  }

  const used = count ?? 0;
  if (used >= MAX_MESSAGES_PER_WINDOW) {
    return { allowed: false, retryAfterSeconds: WINDOW_SECONDS };
  }

  return { allowed: true };
}
