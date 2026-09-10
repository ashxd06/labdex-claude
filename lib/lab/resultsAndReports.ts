"use server";

import { revalidatePath } from "next/cache";
import { labClient } from "@/lib/lab/shared";
import { getSession } from "@/lib/auth/getSession";
import { isAdmin, isLabStaff } from "@/lib/permissions";
import { orderStatusAfterFirstResult, sampleStatusWhenOrderStarts, evaluateReportIssuance } from "@/lib/lab/workflow";
import type { SampleStatus } from "@/lib/supabase/labTypes";
import type { LabActionState } from "@/lib/lab/actions";

const GENERIC_ERROR = "No se pudo completar la operación. Inténtalo de nuevo.";

async function assertLabStaff() {
  const { user, profile } = await getSession();
  if (!user) throw new Error("Debes iniciar sesión para usar el módulo de laboratorio.");
  if (!isLabStaff(profile)) throw new Error("No tienes permisos para operar el módulo de laboratorio.");
  return user;
}

async function assertAdmin() {
  const { profile } = await getSession();
  if (!isAdmin(profile)) throw new Error("Solo un administrador puede modificar esta configuración.");
}

// ---------------------------------------------------------------------------
// Resultados
// ---------------------------------------------------------------------------

/**
 * Calcula un indicador visual (bajo/normal/alto) SOLO cuando el resultado es
 * numérico y existe un rango de referencia numérico estructurado. Nunca
 * inventa un rango: si no hay `rangeMin`/`rangeMax`, no se muestra bandera.
 */
function computeFlag(resultValue: string, rangeMin?: number | null, rangeMax?: number | null) {
  const numeric = Number.parseFloat(resultValue);
  if (Number.isNaN(numeric) || rangeMin == null || rangeMax == null) return null;
  if (numeric < rangeMin) return "bajo";
  if (numeric > rangeMax) return "alto";
  return "normal";
}

export async function saveResult(
  orderId: string,
  orderItemId: string,
  _prevState: LabActionState,
  formData: FormData
): Promise<LabActionState> {
  try {
    const user = await assertLabStaff();
    const supabase = await labClient();

    const resultValue = String(formData.get("result_value") || "").trim();
    const unit = String(formData.get("unit") || "").trim() || null;
    const referenceRangeText = String(formData.get("reference_range_text") || "").trim() || null;
    const observation = String(formData.get("observation") || "").trim() || null;
    const rangeMinRaw = formData.get("range_min");
    const rangeMaxRaw = formData.get("range_max");
    const rangeMin = rangeMinRaw ? Number.parseFloat(String(rangeMinRaw)) : null;
    const rangeMax = rangeMaxRaw ? Number.parseFloat(String(rangeMaxRaw)) : null;

    if (!resultValue) {
      return { status: "error", message: "Ingresa un resultado." };
    }

    const flag = computeFlag(resultValue, rangeMin, rangeMax);

    const { error } = await supabase
      .from("lab_results")
      .update({
        result_value: resultValue,
        unit,
        reference_range_text: referenceRangeText,
        observation,
        flag,
        status: "ingresado",
        updated_by: user.id,
      })
      .eq("order_item_id", orderItemId);

    if (error) {
      return { status: "error", message: GENERIC_ERROR };
    }

    // Primer resultado ingresado de la solicitud: "pendiente" -> "en_proceso"
    // (Fase 4, §5). Ya no hace falta que alguien recuerde mover la
    // solicitud a mano; y la muestra vinculada avanza con ella.
    const { data: order } = await supabase
      .from("lab_orders")
      .select("id, status, sample_id")
      .eq("id", orderId)
      .maybeSingle();

    if (order) {
      const nextOrderStatus = orderStatusAfterFirstResult(order.status);
      if (nextOrderStatus !== order.status) {
        await supabase.from("lab_orders").update({ status: nextOrderStatus, updated_by: user.id }).eq("id", orderId);

        if (order.sample_id) {
          const { data: sample } = await supabase
            .from("samples")
            .select("status")
            .eq("id", order.sample_id)
            .maybeSingle();
          if (sample) {
            const nextSampleStatus = sampleStatusWhenOrderStarts(sample.status as SampleStatus);
            if (nextSampleStatus !== sample.status) {
              await supabase
                .from("samples")
                .update({ status: nextSampleStatus, updated_by: user.id })
                .eq("id", order.sample_id);
              revalidatePath("/laboratorio/muestras");
            }
          }
        }
      }
    }

    revalidatePath(`/laboratorio/solicitudes/${orderId}`);
    return { status: "success", message: "Resultado guardado." };
  } catch (err) {
    return { status: "error", message: err instanceof Error ? err.message : GENERIC_ERROR };
  }
}

export async function validateResult(orderId: string, orderItemId: string): Promise<LabActionState> {
  try {
    const user = await assertLabStaff();
    const supabase = await labClient();
    const { error } = await supabase
      .from("lab_results")
      .update({ status: "validado", updated_by: user.id })
      .eq("order_item_id", orderItemId);
    if (error) return { status: "error", message: GENERIC_ERROR };
    revalidatePath(`/laboratorio/solicitudes/${orderId}`);
    return { status: "success" };
  } catch (err) {
    return { status: "error", message: err instanceof Error ? err.message : GENERIC_ERROR };
  }
}

// ---------------------------------------------------------------------------
// Informes
// ---------------------------------------------------------------------------

export async function createReport(orderId: string, patientId: string): Promise<LabActionState> {
  try {
    const user = await assertLabStaff();
    const supabase = await labClient();

    const { data: existing } = await supabase
      .from("lab_reports")
      .select("id")
      .eq("order_id", orderId)
      .maybeSingle();
    if (existing) {
      return { status: "success", id: existing.id };
    }

    const settings = await supabase.from("lab_settings").select("*").eq("id", true).maybeSingle();

    const { data: codeData, error: codeError } = await supabase.rpc("next_report_number");
    if (codeError || !codeData) {
      return { status: "error", message: GENERIC_ERROR };
    }

    const { data, error } = await supabase
      .from("lab_reports")
      .insert({
        report_number: codeData as string,
        order_id: orderId,
        patient_id: patientId,
        responsible_name: settings.data?.responsible_name ?? null,
        responsible_title: settings.data?.responsible_title ?? null,
        responsible_license: settings.data?.responsible_license ?? null,
        created_by: user.id,
        updated_by: user.id,
      })
      .select("id")
      .single();

    if (error) {
      return { status: "error", message: GENERIC_ERROR };
    }

    revalidatePath("/laboratorio/informes");
    revalidatePath(`/laboratorio/solicitudes/${orderId}`);
    return { status: "success", id: data?.id, message: `Informe ${codeData} generado.` };
  } catch (err) {
    return { status: "error", message: err instanceof Error ? err.message : GENERIC_ERROR };
  }
}

/**
 * Emite un informe (Fase 4, §7): antes de esta fase no había ninguna
 * comprobación — se podía emitir un informe en blanco, con resultados
 * pendientes o sin validar, y quedaba indistinguible de uno legítimo. Ahora
 * exige que la solicitud de origen esté "completada" (todos sus resultados
 * validados) y, al emitir, marca esos resultados como "informado" — el
 * último paso del ciclo de vida de un resultado.
 */
export async function issueReport(reportId: string): Promise<LabActionState> {
  try {
    const user = await assertLabStaff();
    const supabase = await labClient();

    const { data: report, error: reportError } = await supabase
      .from("lab_reports")
      .select("id, order_id, status")
      .eq("id", reportId)
      .maybeSingle();
    if (reportError || !report) {
      return { status: "error", message: "El informe no existe." };
    }
    if (report.status !== "borrador") {
      return { status: "error", message: "Este informe ya fue emitido o anulado." };
    }

    const { data: order, error: orderError } = await supabase
      .from("lab_orders")
      .select("id, status")
      .eq("id", report.order_id)
      .maybeSingle();
    if (orderError || !order) {
      return { status: "error", message: "La solicitud asociada no existe." };
    }

    const issuance = evaluateReportIssuance(order.status);
    if (!issuance.canIssue) {
      return { status: "error", message: issuance.reason ?? GENERIC_ERROR };
    }

    const { error } = await supabase
      .from("lab_reports")
      .update({ status: "emitido", issued_at: new Date().toISOString(), updated_by: user.id })
      .eq("id", reportId);
    if (error) return { status: "error", message: GENERIC_ERROR };

    // Los resultados de esta solicitud ya fueron validados (condición para
    // llegar hasta aquí); al emitirse el informe pasan a "informado".
    const { data: items } = await supabase.from("lab_order_items").select("id").eq("order_id", report.order_id);
    if (items && items.length > 0) {
      await supabase
        .from("lab_results")
        .update({ status: "informado", updated_by: user.id })
        .in(
          "order_item_id",
          items.map((i) => i.id)
        )
        .eq("status", "validado");
    }

    revalidatePath("/laboratorio/informes");
    revalidatePath(`/laboratorio/solicitudes/${report.order_id}`);
    revalidatePath("/laboratorio/resultados");
    return { status: "success", message: "Informe emitido." };
  } catch (err) {
    return { status: "error", message: err instanceof Error ? err.message : GENERIC_ERROR };
  }
}

export async function voidReport(reportId: string): Promise<LabActionState> {
  try {
    const user = await assertLabStaff();
    const supabase = await labClient();
    const { error } = await supabase
      .from("lab_reports")
      .update({ status: "anulado", updated_by: user.id })
      .eq("id", reportId);
    if (error) return { status: "error", message: GENERIC_ERROR };
    revalidatePath("/laboratorio/informes");
    return { status: "success", message: "Informe anulado." };
  } catch (err) {
    return { status: "error", message: err instanceof Error ? err.message : GENERIC_ERROR };
  }
}

// ---------------------------------------------------------------------------
// Configuración del laboratorio
// ---------------------------------------------------------------------------

export async function updateLabSettings(
  _prevState: LabActionState,
  formData: FormData
): Promise<LabActionState> {
  try {
    await assertAdmin();
    const { user } = await getSession();
    const supabase = await labClient();

    const payload = {
      lab_name: String(formData.get("lab_name") || "LABDEX").trim() || "LABDEX",
      address: String(formData.get("address") || "").trim() || null,
      phone: String(formData.get("phone") || "").trim() || null,
      email: String(formData.get("email") || "").trim() || null,
      website: String(formData.get("website") || "").trim() || null,
      responsible_name: String(formData.get("responsible_name") || "").trim() || null,
      responsible_title: String(formData.get("responsible_title") || "").trim() || null,
      responsible_license: String(formData.get("responsible_license") || "").trim() || null,
      updated_by: user?.id ?? null,
    };

    const { error } = await supabase.from("lab_settings").update(payload).eq("id", true);
    if (error) {
      return { status: "error", message: GENERIC_ERROR };
    }

    revalidatePath("/laboratorio/configuracion");
    return { status: "success", message: "Configuración actualizada." };
  } catch (err) {
    return { status: "error", message: err instanceof Error ? err.message : GENERIC_ERROR };
  }
}
