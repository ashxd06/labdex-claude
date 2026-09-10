"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { labClient } from "@/lib/lab/shared";
import { getSession } from "@/lib/auth/getSession";
import { isLabStaff } from "@/lib/permissions";
import {
  initialSampleStatus,
  evaluateOrderCompletion,
  canTransitionSampleStatus,
  sampleStatusWhenOrderCompletes,
  type OrderItemForCompletion,
} from "@/lib/lab/workflow";
import type { SampleStatus } from "@/lib/supabase/labTypes";

export interface LabActionState {
  status: "idle" | "error" | "success";
  message?: string;
  id?: string;
}

const GENERIC_ERROR = "No se pudo completar la operación. Inténtalo de nuevo.";

/**
 * Segunda capa de defensa (la primera y definitiva es RLS en Postgres, ver
 * supabase/schema_fase4_security.sql): ningún Server Action del laboratorio
 * ejecuta una escritura sin antes confirmar que quien llama es personal de
 * laboratorio. Antes de esta fase solo se exigía sesión iniciada.
 */
async function assertLabStaff() {
  const { user, profile } = await getSession();
  if (!user) throw new Error("Debes iniciar sesión para usar el módulo de laboratorio.");
  if (!isLabStaff(profile)) throw new Error("No tienes permisos para operar el módulo de laboratorio.");
  return user;
}

function friendlyError(error: { code?: string; message: string }): string {
  if (error.code === "23505") return "Ya existe un registro con estos datos.";
  if (error.code === "23503") return "El registro relacionado no existe o fue eliminado.";
  return GENERIC_ERROR;
}

// ---------------------------------------------------------------------------
// Pacientes
// ---------------------------------------------------------------------------

export async function createPatient(
  _prevState: LabActionState,
  formData: FormData
): Promise<LabActionState> {
  try {
    const user = await assertLabStaff();
    const supabase = await labClient();

    const firstName = String(formData.get("first_name") || "").trim();
    const lastName = String(formData.get("last_name") || "").trim();
    if (!firstName || !lastName) {
      return { status: "error", message: "Nombres y apellidos son obligatorios." };
    }

    const { data: codeData, error: codeError } = await supabase.rpc("next_patient_code");
    if (codeError || !codeData) {
      return { status: "error", message: GENERIC_ERROR };
    }

    const payload = {
      internal_code: codeData as string,
      first_name: firstName,
      last_name: lastName,
      document_id: String(formData.get("document_id") || "").trim() || null,
      birth_date: String(formData.get("birth_date") || "").trim() || null,
      sex: String(formData.get("sex") || "").trim() || null,
      phone: String(formData.get("phone") || "").trim() || null,
      email: String(formData.get("email") || "").trim() || null,
      address: String(formData.get("address") || "").trim() || null,
      notes: String(formData.get("notes") || "").trim() || null,
      created_by: user.id,
      updated_by: user.id,
    };

    const { data, error } = await supabase.from("patients").insert(payload).select("id").single();
    if (error) {
      return { status: "error", message: friendlyError(error) };
    }

    revalidatePath("/laboratorio/pacientes");
    return { status: "success", message: "Paciente registrado correctamente.", id: data?.id };
  } catch (err) {
    return { status: "error", message: err instanceof Error ? err.message : GENERIC_ERROR };
  }
}

export async function updatePatient(
  patientId: string,
  _prevState: LabActionState,
  formData: FormData
): Promise<LabActionState> {
  try {
    const user = await assertLabStaff();
    const supabase = await labClient();

    const firstName = String(formData.get("first_name") || "").trim();
    const lastName = String(formData.get("last_name") || "").trim();
    if (!firstName || !lastName) {
      return { status: "error", message: "Nombres y apellidos son obligatorios." };
    }

    const payload = {
      first_name: firstName,
      last_name: lastName,
      document_id: String(formData.get("document_id") || "").trim() || null,
      birth_date: String(formData.get("birth_date") || "").trim() || null,
      sex: String(formData.get("sex") || "").trim() || null,
      phone: String(formData.get("phone") || "").trim() || null,
      email: String(formData.get("email") || "").trim() || null,
      address: String(formData.get("address") || "").trim() || null,
      notes: String(formData.get("notes") || "").trim() || null,
      updated_by: user.id,
    };

    const { error } = await supabase.from("patients").update(payload).eq("id", patientId);
    if (error) {
      return { status: "error", message: friendlyError(error) };
    }

    revalidatePath(`/laboratorio/pacientes/${patientId}`);
    return { status: "success", message: "Paciente actualizado correctamente." };
  } catch (err) {
    return { status: "error", message: err instanceof Error ? err.message : GENERIC_ERROR };
  }
}

// ---------------------------------------------------------------------------
// Muestras
// ---------------------------------------------------------------------------

export async function createSample(
  _prevState: LabActionState,
  formData: FormData
): Promise<LabActionState> {
  try {
    const user = await assertLabStaff();
    const supabase = await labClient();

    const patientId = String(formData.get("patient_id") || "").trim();
    const sampleType = String(formData.get("sample_type") || "").trim();
    if (!patientId || !sampleType) {
      return { status: "error", message: "Selecciona un paciente y un tipo de muestra." };
    }

    const { data: codeData, error: codeError } = await supabase.rpc("next_sample_code");
    if (codeError || !codeData) {
      return { status: "error", message: GENERIC_ERROR };
    }

    // Registrar una muestra significa que el laboratorio ya la tiene en
    // mano (por eso el formulario pide su condición), así que nace como
    // "recibida", nunca "pendiente" — ver lib/lab/workflow.ts. Si no se
    // indicó fecha/hora de recepción, se autocompleta con el momento del
    // registro, para no dejar una muestra "recibida" sin fecha de
    // recepción.
    const receivedDateInput = String(formData.get("received_date") || "").trim();
    const receivedTimeInput = String(formData.get("received_time") || "").trim();
    const now = new Date();

    const payload = {
      patient_id: patientId,
      sample_code: codeData as string,
      sample_type: sampleType,
      collected_date: String(formData.get("collected_date") || "").trim() || null,
      collected_time: String(formData.get("collected_time") || "").trim() || null,
      received_date: receivedDateInput || now.toISOString().slice(0, 10),
      received_time: receivedTimeInput || now.toTimeString().slice(0, 5),
      condition: String(formData.get("condition") || "adecuada"),
      notes: String(formData.get("notes") || "").trim() || null,
      status: initialSampleStatus(),
      created_by: user.id,
      updated_by: user.id,
    };

    const { data, error } = await supabase.from("samples").insert(payload).select("id").single();
    if (error) {
      return { status: "error", message: friendlyError(error) };
    }

    revalidatePath("/laboratorio/muestras");
    return { status: "success", message: "Muestra registrada correctamente.", id: data?.id };
  } catch (err) {
    return { status: "error", message: err instanceof Error ? err.message : GENERIC_ERROR };
  }
}

/**
 * Avanza el estado de una muestra manualmente desde `/laboratorio/muestras`
 * (Fase 4, §3: columna de acciones). Solo permite transiciones coherentes
 * (ver `canTransitionSampleStatus`): no se puede, por ejemplo, mandar una
 * muestra "recibida" directo a "procesada" saltándose "en_proceso", ni
 * revivir una ya "procesada"/"rechazada".
 */
export async function updateSampleStatus(sampleId: string, nextStatus: SampleStatus): Promise<LabActionState> {
  try {
    const user = await assertLabStaff();
    const supabase = await labClient();

    const { data: sample, error: fetchError } = await supabase
      .from("samples")
      .select("status")
      .eq("id", sampleId)
      .maybeSingle();
    if (fetchError || !sample) {
      return { status: "error", message: "La muestra no existe." };
    }

    if (!canTransitionSampleStatus(sample.status as SampleStatus, nextStatus)) {
      return { status: "error", message: `No se puede pasar de "${sample.status}" a "${nextStatus}".` };
    }

    const { error } = await supabase
      .from("samples")
      .update({ status: nextStatus, updated_by: user.id })
      .eq("id", sampleId);
    if (error) return { status: "error", message: GENERIC_ERROR };

    revalidatePath("/laboratorio/muestras");
    return { status: "success" };
  } catch (err) {
    return { status: "error", message: err instanceof Error ? err.message : GENERIC_ERROR };
  }
}

// ---------------------------------------------------------------------------
// Solicitudes (lab_orders) + análisis (lab_order_items)
// ---------------------------------------------------------------------------

export async function createOrder(
  _prevState: LabActionState,
  formData: FormData
): Promise<LabActionState> {
  const patientId = String(formData.get("patient_id") || "").trim();
  if (!patientId) {
    return { status: "error", message: "Selecciona un paciente." };
  }

  let orderId: string | null = null;

  try {
    const user = await assertLabStaff();
    const supabase = await labClient();

    const { data: codeData, error: codeError } = await supabase.rpc("next_order_code");
    if (codeError || !codeData) {
      return { status: "error", message: GENERIC_ERROR };
    }

    const payload = {
      order_code: codeData as string,
      patient_id: patientId,
      sample_id: String(formData.get("sample_id") || "").trim() || null,
      doctor_name: String(formData.get("doctor_name") || "").trim() || null,
      clinical_notes: String(formData.get("clinical_notes") || "").trim() || null,
      priority: String(formData.get("priority") || "normal"),
      created_by: user.id,
      updated_by: user.id,
    };

    const { data, error } = await supabase.from("lab_orders").insert(payload).select("id").single();
    if (error) {
      return { status: "error", message: friendlyError(error) };
    }
    orderId = data?.id as string;
  } catch (err) {
    return { status: "error", message: err instanceof Error ? err.message : GENERIC_ERROR };
  }

  if (orderId) {
    redirect(`/laboratorio/solicitudes/${orderId}`);
  }
  return { status: "error", message: GENERIC_ERROR };
}

export async function addOrderItem(orderId: string, analysisId: string): Promise<LabActionState> {
  try {
    const user = await assertLabStaff();
    const supabase = await labClient();

    const { data: analysis } = await supabase
      .from("clinical_analyses")
      .select("unit")
      .eq("id", analysisId)
      .maybeSingle();

    const { data: item, error } = await supabase
      .from("lab_order_items")
      .insert({ order_id: orderId, analysis_id: analysisId })
      .select("id")
      .single();

    if (error) {
      return { status: "error", message: friendlyError(error) };
    }

    await supabase.from("lab_results").insert({
      order_item_id: item.id,
      unit: analysis?.unit ?? null,
      created_by: user.id,
      updated_by: user.id,
    });

    revalidatePath(`/laboratorio/solicitudes/${orderId}`);
    return { status: "success" };
  } catch (err) {
    return { status: "error", message: err instanceof Error ? err.message : GENERIC_ERROR };
  }
}

export async function removeOrderItem(orderId: string, itemId: string): Promise<LabActionState> {
  try {
    await assertLabStaff();
    const supabase = await labClient();
    const { error } = await supabase.from("lab_order_items").delete().eq("id", itemId);
    if (error) return { status: "error", message: GENERIC_ERROR };
    revalidatePath(`/laboratorio/solicitudes/${orderId}`);
    return { status: "success" };
  } catch (err) {
    return { status: "error", message: err instanceof Error ? err.message : GENERIC_ERROR };
  }
}

/**
 * Marca una solicitud como "completada" — pero solo si de verdad lo está
 * (Fase 4, §5-6): todos sus análisis deben tener un resultado validado. Antes
 * de esta fase, este botón estaba disponible siempre que la solicitud no
 * estuviera ya completada/cancelada, sin importar si tenía cero resultados o
 * resultados aún pendientes.
 */
export async function finalizeOrder(orderId: string): Promise<LabActionState> {
  try {
    const user = await assertLabStaff();
    const supabase = await labClient();

    const { data: order, error: orderError } = await supabase
      .from("lab_orders")
      .select("id, status, sample_id")
      .eq("id", orderId)
      .maybeSingle();
    if (orderError || !order) {
      return { status: "error", message: "La solicitud no existe." };
    }

    const { data: items, error: itemsError } = await supabase
      .from("lab_order_items")
      .select("id, lab_results(status)")
      .eq("order_id", orderId);
    if (itemsError) {
      return { status: "error", message: GENERIC_ERROR };
    }

    const completionItems: OrderItemForCompletion[] = (items ?? []).map((item) => {
      const result = Array.isArray(item.lab_results) ? item.lab_results[0] : item.lab_results;
      return { resultStatus: result?.status ?? null };
    });

    const completion = evaluateOrderCompletion(completionItems);
    if (!completion.canComplete) {
      return { status: "error", message: completion.reason ?? GENERIC_ERROR };
    }

    const { error } = await supabase
      .from("lab_orders")
      .update({ status: "completada", completed_at: new Date().toISOString(), updated_by: user.id })
      .eq("id", orderId);
    if (error) return { status: "error", message: GENERIC_ERROR };

    // La muestra avanza junto con su solicitud (Fase 4, §5): si sigue en
    // "recibida"/"en_proceso" pasa a "procesada"; si el personal ya la
    // había rechazado manualmente, eso no se sobrescribe.
    if (order.sample_id) {
      const { data: sample } = await supabase
        .from("samples")
        .select("status")
        .eq("id", order.sample_id)
        .maybeSingle();
      if (sample) {
        const nextStatus = sampleStatusWhenOrderCompletes(sample.status as SampleStatus);
        if (nextStatus !== sample.status) {
          await supabase.from("samples").update({ status: nextStatus, updated_by: user.id }).eq("id", order.sample_id);
        }
      }
    }

    revalidatePath(`/laboratorio/solicitudes/${orderId}`);
    revalidatePath("/laboratorio/muestras");
    return { status: "success", message: "Solicitud finalizada." };
  } catch (err) {
    return { status: "error", message: err instanceof Error ? err.message : GENERIC_ERROR };
  }
}

export async function cancelOrder(orderId: string): Promise<LabActionState> {
  try {
    await assertLabStaff();
    const supabase = await labClient();
    const { error } = await supabase.from("lab_orders").update({ status: "cancelada" }).eq("id", orderId);
    if (error) return { status: "error", message: GENERIC_ERROR };
    revalidatePath(`/laboratorio/solicitudes/${orderId}`);
    return { status: "success" };
  } catch (err) {
    return { status: "error", message: err instanceof Error ? err.message : GENERIC_ERROR };
  }
}
