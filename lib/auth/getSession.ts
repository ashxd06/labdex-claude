import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/supabase/types";

export interface SessionData {
  user: {
    id: string;
    email: string | null;
  } | null;
  profile: Profile | null;
}

/**
 * Devuelve el usuario autenticado (si existe) y su perfil, leyendo el rol
 * SIEMPRE desde la base de datos (tabla `profiles`, protegida por RLS) y
 * nunca desde metadatos que el cliente pudiera manipular.
 *
 * Este helper se usa en Server Components / Server Actions. Es la única
 * fuente de verdad para decidir si alguien es admin.
 */
export async function getSession(): Promise<SessionData> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, profile: null };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return {
    user: { id: user.id, email: user.email ?? null },
    profile: profile ?? null,
  };
}
