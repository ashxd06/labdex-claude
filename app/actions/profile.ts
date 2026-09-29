"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { AuthActionState } from "@/app/actions/auth";

export async function updateProfileNameAction(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const fullName = String(formData.get("fullName") || "").trim();

  if (fullName.length < 2 || fullName.length > 80) {
    return { status: "error", message: "El nombre debe tener entre 2 y 80 caracteres." };
  }

  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { status: "error", message: "Inicia sesión para editar tu perfil." };
    }

    const { data, error } = await supabase
      .from("profiles")
      .update({ full_name: fullName, updated_at: new Date().toISOString() })
      .eq("id", user.id)
      .select("id")
      .maybeSingle();

    if (error || !data) {
      return { status: "error", message: "No se pudo guardar el nombre. Inténtalo de nuevo." };
    }
  } catch {
    return { status: "error", message: "No se pudo guardar el nombre. Inténtalo de nuevo." };
  }

  revalidatePath("/perfil");
  revalidatePath("/", "layout");
  return { status: "success", message: "Tu nombre se actualizó correctamente." };
}

export async function updatePasswordAction(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const password = String(formData.get("password") || "");
  const confirmPassword = String(formData.get("confirmPassword") || "");

  if (password.length < 8) {
    return { status: "error", message: "La contraseña debe tener al menos 8 caracteres." };
  }
  if (password !== confirmPassword) {
    return { status: "error", message: "Las contraseñas no coinciden." };
  }

  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { status: "error", message: "Inicia sesión para cambiar tu contraseña." };
    }

    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      const message = error.message.toLowerCase();
      if (message.includes("same password")) {
        return { status: "error", message: "Elige una contraseña distinta a la actual." };
      }
      if (message.includes("rate limit")) {
        return { status: "error", message: "Demasiados intentos. Espera unos minutos y vuelve a intentarlo." };
      }
      return { status: "error", message: "No se pudo cambiar la contraseña. Verifica los requisitos e inténtalo de nuevo." };
    }
  } catch {
    return { status: "error", message: "No se pudo cambiar la contraseña. Inténtalo de nuevo." };
  }

  revalidatePath("/perfil");
  return { status: "success", message: "Tu contraseña se cambió correctamente." };
}
