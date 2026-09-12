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

/**
 * Personal de laboratorio: puede operar `/laboratorio` (pacientes, muestras,
 * solicitudes, resultados, informes). Un admin siempre cuenta como personal
 * de laboratorio (nunca queda bloqueado por este cambio). Introducido en
 * Fase 4 (mejoras de seguridad): antes de esto, CUALQUIER usuario
 * autenticado —incluido alguien que solo se registró para usar el Hub de
 * Estudio— podía leer y modificar datos clínicos, tanto desde la interfaz
 * como directamente contra Supabase con su propio JWT.
 */
export function isLabStaff(profile: Profile | null): boolean {
  return profile?.role === "admin" || profile?.role === "lab_staff";
}

export function isAuthenticated(user: { id: string } | null): boolean {
  return user !== null;
}

/**
 * Etiqueta en español del rol real del usuario (Fase 7, §10/§4). El rol
 * siempre viene de `profile.role` (fila `profiles`, RLS), nunca de algo que
 * el frontend decida — esta función solo traduce ese valor a texto, no lo
 * calcula ni lo modifica.
 */
export function getRoleLabel(profile: Profile | null): string {
  switch (profile?.role) {
    case "admin":
      return "Administrador";
    case "lab_staff":
      return "Personal de laboratorio";
    default:
      return "Usuario";
  }
}
