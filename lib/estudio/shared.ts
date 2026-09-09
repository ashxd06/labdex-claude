import type { SupabaseClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { createClient as createTypedClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth/getSession";

/**
 * Cliente de Supabase sin el genérico `Database` (que solo cubre
 * `profiles`), igual que en lib/lab/shared.ts y lib/labdex-ai/*. Las
 * tablas del Hub de Estudio están protegidas por RLS de propietario, así
 * que este cliente sigue siendo el de la sesión del usuario — nunca la
 * service role key.
 */
export async function estudioClient(): Promise<SupabaseClient> {
  return (await createTypedClient()) as unknown as SupabaseClient;
}

/**
 * Los materiales de estudio son privados por diseño (Fase 6, §25): pueden
 * contener apuntes, fotografías de cuadernos o documentos personales del
 * estudiante. Esta comprobación en servidor se suma a la del middleware y,
 * en última instancia, a las políticas RLS de Postgres/Storage.
 */
export async function requireEstudioSession(nextPath: string) {
  const { user, profile } = await getSession();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }
  return { user, profile };
}
