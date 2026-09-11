"use server";

import { getSession } from "@/lib/auth/getSession";
import { isAdmin } from "@/lib/permissions";
import { getResourceConfig } from "@/lib/content/resourceConfigs";
import {
  runContentAssistant,
  GeminiNotConfiguredError,
  GeminiRequestError,
  GeminiTimeoutError,
} from "@/lib/labdex-ai/admin/service";
import { AssistantEmptyResultError } from "@/lib/labdex-ai/admin/service";
import { findPossibleDuplicates } from "@/lib/labdex-ai/admin/duplicates";
import type { AssistantMode, AssistantResult, DuplicateMatch } from "@/lib/labdex-ai/admin/types";

/**
 * Único punto de entrada del Asistente LABDEX desde el cliente. Server
 * Actions (mismo patrón que `lib/content/actions.ts`), no una API route
 * nueva: es exactamente la misma superficie que ya usa el CRUD del CMS.
 *
 * SEGURIDAD (§19): `assertAdmin()` se ejecuta en el servidor en cada
 * llamada, antes de tocar `getResourceConfig` (que ya funciona como
 * allowlist: solo reconoce las 7 claves del CMS, nunca tablas de Fase 4).
 * Ocultar los botones en el cliente es solo una comodidad de UX, nunca la
 * barrera real.
 */

export type AssistantActionState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "success"; result: AssistantResult };

async function assertAdmin() {
  const { user, profile } = await getSession();
  if (!user) throw new Error("Debes iniciar sesión.");
  if (!isAdmin(profile)) throw new Error("El Asistente LABDEX solo está disponible para administradores.");
}

function friendlyAssistantError(err: unknown): string {
  if (err instanceof GeminiNotConfiguredError) {
    return "El Asistente LABDEX todavía no está configurado (falta GEMINI_API_KEY).";
  }
  if (err instanceof GeminiTimeoutError) {
    return "El Asistente LABDEX tardó demasiado en responder. Inténtalo de nuevo.";
  }
  if (err instanceof GeminiRequestError) {
    return "El Asistente LABDEX no está disponible en este momento. Inténtalo de nuevo más tarde.";
  }
  if (err instanceof AssistantEmptyResultError) {
    return err.message;
  }
  return err instanceof Error ? err.message : "Ocurrió un error inesperado.";
}

export async function runAssistantAction(
  resourceKey: string,
  mode: AssistantMode,
  currentValues: Record<string, string | null>,
  seed?: string
): Promise<AssistantActionState> {
  try {
    await assertAdmin();
    const config = getResourceConfig(resourceKey);
    const result = await runContentAssistant({ mode, config, currentValues, seed });
    return { status: "success", result };
  } catch (err) {
    return { status: "error", message: friendlyAssistantError(err) };
  }
}

export async function checkDuplicatesAction(
  resourceKey: string,
  titleValue: string,
  excludeId?: string
): Promise<{ status: "success"; matches: DuplicateMatch[] } | { status: "error"; message: string }> {
  try {
    await assertAdmin();
    const config = getResourceConfig(resourceKey);
    const matches = await findPossibleDuplicates(config, titleValue, excludeId);
    return { status: "success", matches };
  } catch (err) {
    return { status: "error", message: err instanceof Error ? err.message : "Ocurrió un error inesperado." };
  }
}
