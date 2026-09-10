import type { OrderStatus, ResultStatus, SampleStatus } from "@/lib/supabase/labTypes";

/**
 * Reglas de transición de estados de la Fase 4 (auditoría de septiembre
 * 2026). Se centralizan aquí, sin tocar Supabase, para poder probarlas de
 * forma aislada y para que `lib/lab/actions.ts` y
 * `lib/lab/resultsAndReports.ts` compartan exactamente la misma lógica en
 * vez de reimplementarla cada uno a su manera.
 *
 * Contexto del bug que motivó esto: una muestra recién registrada (p. ej.
 * MUE-000004) aparecía como "Pendiente" en `/laboratorio/muestras`, aunque
 * ya había sido físicamente recibida por el laboratorio. La causa no era de
 * interfaz: `createSample` nunca fijaba `status`, así que siempre quedaba en
 * el valor por defecto de la columna (`pendiente`), y ningún otro punto del
 * código volvía a tocar `samples.status` después de la creación.
 */

// ---------------------------------------------------------------------------
// Muestras
// ---------------------------------------------------------------------------

/**
 * Estado inicial de una muestra al registrarla (Fase 4).
 *
 * En el flujo actual de LABDEX no existe todavía una etapa de "muestra
 * programada mas no recibida": el formulario de `/laboratorio/muestras/nueva`
 * registra una muestra que el personal de laboratorio ya tiene físicamente
 * en mano (por eso puede anotar su condición: adecuada, hemolizada, etc. —
 * algo que solo se puede evaluar con la muestra presente). Por lo tanto,
 * registrar una muestra ahora SIEMPRE significa que fue recibida; "pendiente"
 * queda reservado en el enum para una futura etapa de programación de toma
 * que hoy no existe en la interfaz.
 */
export function initialSampleStatus(): SampleStatus {
  return "recibida";
}

const SAMPLE_STATUS_TRANSITIONS: Record<SampleStatus, SampleStatus[]> = {
  pendiente: ["recibida", "rechazada"],
  recibida: ["en_proceso", "rechazada"],
  en_proceso: ["procesada", "rechazada"],
  procesada: [],
  rechazada: [],
};

/** Próximos estados válidos desde el estado actual de una muestra, para
 * ofrecer solo transiciones coherentes en la interfaz (Fase 4, acciones de
 * `/laboratorio/muestras`). */
export function allowedSampleStatusTransitions(current: SampleStatus): SampleStatus[] {
  return SAMPLE_STATUS_TRANSITIONS[current] ?? [];
}

export function canTransitionSampleStatus(current: SampleStatus, next: SampleStatus): boolean {
  return allowedSampleStatusTransitions(current).includes(next);
}

/** Cuando una solicitud vinculada a esta muestra pasa a "en_proceso" (se
 * ingresó su primer resultado), la muestra avanza con ella — pero solo si
 * seguía en "recibida"; si el personal ya la movió manualmente a otro
 * estado (p. ej. "rechazada"), esa decisión no se sobrescribe. */
export function sampleStatusWhenOrderStarts(current: SampleStatus): SampleStatus {
  return current === "recibida" ? "en_proceso" : current;
}

/** Cuando la solicitud vinculada se completa (todos sus resultados
 * validados), la muestra se marca "procesada" — salvo que ya esté
 * "rechazada" o "procesada". */
export function sampleStatusWhenOrderCompletes(current: SampleStatus): SampleStatus {
  return current === "recibida" || current === "en_proceso" ? "procesada" : current;
}

// ---------------------------------------------------------------------------
// Solicitudes (lab_orders)
// ---------------------------------------------------------------------------

/** Cuando se ingresa el primer resultado de una solicitud, esta pasa de
 * "pendiente" a "en_proceso" automáticamente — nadie tiene que acordarse de
 * moverla a mano, y ya no puede seguir figurando como "sin empezar" mientras
 * tiene trabajo en curso. */
export function orderStatusAfterFirstResult(current: OrderStatus): OrderStatus {
  return current === "pendiente" ? "en_proceso" : current;
}

export interface OrderItemForCompletion {
  resultStatus: ResultStatus | null;
}

export interface OrderCompletionCheck {
  canComplete: boolean;
  pendingCount: number;
  /** Explicación lista para mostrar en la interfaz cuando `canComplete` es `false`. */
  reason: string | null;
}

const VALIDATED_STATUSES: ResultStatus[] = ["validado", "informado"];

/**
 * Decide si una solicitud puede marcarse "completada" (Fase 4, §5-6): una
 * solicitud NUNCA debe poder finalizarse solo porque se creó, ni mientras le
 * falten resultados por validar. Se necesita al menos un análisis
 * solicitado, y todos sus resultados deben estar validados (o ya
 * informados, si se repite la comprobación tras emitir el informe).
 */
export function evaluateOrderCompletion(items: OrderItemForCompletion[]): OrderCompletionCheck {
  if (items.length === 0) {
    return { canComplete: false, pendingCount: 0, reason: "La solicitud no tiene análisis agregados todavía." };
  }

  const pending = items.filter((item) => !item.resultStatus || !VALIDATED_STATUSES.includes(item.resultStatus));
  if (pending.length > 0) {
    return {
      canComplete: false,
      pendingCount: pending.length,
      reason: `Todavía hay ${pending.length} resultado${pending.length === 1 ? "" : "s"} sin validar.`,
    };
  }

  return { canComplete: true, pendingCount: 0, reason: null };
}

// ---------------------------------------------------------------------------
// Informes
// ---------------------------------------------------------------------------

export interface ReportIssuanceCheck {
  canIssue: boolean;
  reason: string | null;
}

/**
 * Decide si un informe puede emitirse (Fase 4, §7): solo cuando la solicitud
 * que lo origina está "completada" (es decir, todos sus resultados ya
 * pasaron por `evaluateOrderCompletion`). Antes de esta fase, "Emitir
 * informe" no comprobaba nada — se podía emitir un informe en blanco.
 */
export function evaluateReportIssuance(orderStatus: OrderStatus): ReportIssuanceCheck {
  if (orderStatus !== "completada") {
    return {
      canIssue: false,
      reason: "La solicitud debe estar completada (todos los resultados validados) antes de emitir el informe.",
    };
  }
  return { canIssue: true, reason: null };
}
