"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export interface AuthActionState {
  status: "idle" | "error" | "success";
  message?: string;
}

const GENERIC_ERROR: AuthActionState = {
  status: "error",
  message: "No se pudo completar la operación. Inténtalo de nuevo en unos momentos.",
};

function mapAuthError(message: string): string {
  const normalized = message.toLowerCase();

  if (normalized.includes("invalid login credentials")) {
    return "Correo o contraseña incorrectos.";
  }
  if (normalized.includes("email not confirmed")) {
    return "Debes confirmar tu correo electrónico antes de iniciar sesión.";
  }
  if (normalized.includes("user already registered")) {
    return "Ya existe una cuenta con este correo electrónico.";
  }
  if (normalized.includes("password should be at least")) {
    return "La contraseña debe tener al menos 8 caracteres.";
  }
  if (normalized.includes("rate limit")) {
    return "Demasiados intentos. Espera unos minutos e inténtalo de nuevo.";
  }
  return "No se pudo completar la operación. Inténtalo de nuevo.";
}

export async function loginAction(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const next = String(formData.get("next") || "/");

  if (!email || !password) {
    return { status: "error", message: "Completa correo electrónico y contraseña." };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      return { status: "error", message: mapAuthError(error.message) };
    }
  } catch {
    return GENERIC_ERROR;
  }

  revalidatePath("/", "layout");
  redirect(next || "/");
}

export async function registerAction(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const fullName = String(formData.get("fullName") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const confirmPassword = String(formData.get("confirmPassword") || "");

  if (!fullName || !email || !password || !confirmPassword) {
    return { status: "error", message: "Completa todos los campos obligatorios." };
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(email)) {
    return { status: "error", message: "Ingresa un correo electrónico válido." };
  }

  if (password.length < 8) {
    return { status: "error", message: "La contraseña debe tener al menos 8 caracteres." };
  }

  if (password !== confirmPassword) {
    return { status: "error", message: "Las contraseñas no coinciden." };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    });

    if (error) {
      return { status: "error", message: mapAuthError(error.message) };
    }
  } catch {
    return GENERIC_ERROR;
  }

  return {
    status: "success",
    message: "Cuenta creada correctamente. Ya puedes iniciar sesión.",
  };
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
