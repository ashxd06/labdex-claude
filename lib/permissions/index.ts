import type { Profile } from "@/lib/supabase/types";

/**
 * Reglas de autorización de LABDEX.
 *
 * Estas funciones son solo utilidades de lectura. NUNCA deciden el rol:
 * el rol siempre viene de la fila `profiles` obtenida en el servidor
 * mediante `getSession()`, que a su vez está protegida por RLS en
 * Supabase/PostgreSQL. Por eso son seguras de usar tanto en el servidor
 * como en el cliente para mostrar/ocultar UI (la UI nunca es el único
 * mecanismo de protección).
 */
export function isAdmin(profile: Profile | null): boolean {
  return profile?.role === "admin";
}

export function isAuthenticated(user: { id: string } | null): boolean {
  return user !== null;
}
