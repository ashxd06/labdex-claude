import type { SupabaseClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { createClient as createTypedClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth/getSession";
import { isLabStaff } from "@/lib/permissions";

/**
 * Cliente de Supabase sin el genérico `Database` (que solo cubre
 * `profiles`), igual que en lib/content/*. Las tablas del laboratorio están
 * protegidas por RLS exigiendo personal de laboratorio (`is_lab_staff`), así
 * que este cliente sigue siendo el de la sesión del usuario — nunca la
 * service role key.
 */
export async function labClient(): Promise<SupabaseClient> {
  return (await createTypedClient()) as unknown as SupabaseClient;
}

/**
 * El módulo de Laboratorio contiene datos clínicos sensibles y NUNCA es de
 * lectura pública, ni siquiera para cualquier cuenta autenticada de LABDEX
 * (por ejemplo, alguien que solo se registró para usar el Hub de Estudio).
 * Solo `admin` y `lab_staff` pueden entrar.
 *
 * Esta comprobación se ejecuta en el servidor en cada página del módulo,
 * además de la exigida por el middleware (solo sesión) y, en última
 * instancia, por las políticas RLS de Postgres (`is_lab_staff`) — tres
 * capas, no solo ocultar un enlace en la interfaz.
 */
export async function requireLabSession(nextPath: string) {
  const { user, profile } = await getSession();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }
  if (!isLabStaff(profile)) {
    redirect("/?acceso=denegado");
  }
  return { user, profile };
}

export function calculateAge(birthDate: string | null): number | null {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

export function formatPatientName(patient: { first_name: string; last_name: string }): string {
  return `${patient.first_name} ${patient.last_name}`.trim();
}
