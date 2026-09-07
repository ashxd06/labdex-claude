import { labClient } from "@/lib/lab/shared";
import type {
  Patient,
  Sample,
  LabOrder,
  LabOrderItem,
  LabResult,
  LabReport,
  LabSettings,
} from "@/lib/supabase/labTypes";
import type { ClinicalAnalysis } from "@/lib/supabase/types";

export interface DashboardStats {
  patients: number;
  samples: number;
  pendingOrders: number;
  pendingResults: number;
  issuedReports: number;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = await labClient();

  const [patients, samples, pendingOrders, pendingResults, issuedReports] = await Promise.all([
    supabase.from("patients").select("*", { count: "exact", head: true }),
    supabase.from("samples").select("*", { count: "exact", head: true }),
    supabase.from("lab_orders").select("*", { count: "exact", head: true }).in("status", ["pendiente", "en_proceso"]),
    supabase.from("lab_results").select("*", { count: "exact", head: true }).in("status", ["pendiente", "ingresado"]),
    supabase.from("lab_reports").select("*", { count: "exact", head: true }).eq("status", "emitido"),
  ]);

  return {
    patients: patients.count ?? 0,
    samples: samples.count ?? 0,
    pendingOrders: pendingOrders.count ?? 0,
    pendingResults: pendingResults.count ?? 0,
    issuedReports: issuedReports.count ?? 0,
  };
}

export interface RecentActivityRow {
  id: string;
  date: string;
  patientName: string;
  status: string;
  orderCode: string;
  reportNumber: string | null;
}

export async function getRecentActivity(limit = 8): Promise<RecentActivityRow[]> {
  const supabase = await labClient();
  const { data, error } = await supabase
    .from("lab_orders")
    .select("id, order_code, status, requested_at, patients(first_name, last_name), lab_reports(report_number)")
    .order("requested_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  return (data as unknown as Array<{
    id: string;
    order_code: string;
    status: string;
    requested_at: string;
    patients: { first_name: string; last_name: string } | { first_name: string; last_name: string }[] | null;
    lab_reports: { report_number: string }[] | { report_number: string } | null;
  }>).map((row) => {
    const patient = Array.isArray(row.patients) ? row.patients[0] : row.patients;
    const report = Array.isArray(row.lab_reports) ? row.lab_reports[0] : row.lab_reports;
    return {
      id: row.id,
      date: row.requested_at,
      patientName: patient ? `${patient.first_name} ${patient.last_name}` : "—",
      status: row.status,
      orderCode: row.order_code,
      reportNumber: report?.report_number ?? null,
    };
  });
}

export interface PatientListParams {
  search?: string;
  page?: number;
  pageSize?: number;
}

export async function listPatients({ search, page = 1, pageSize = 20 }: PatientListParams = {}) {
  const supabase = await labClient();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase.from("patients").select("*", { count: "exact" });
  if (search) {
    query = query.or(
      `first_name.ilike.%${search}%,last_name.ilike.%${search}%,document_id.ilike.%${search}%,internal_code.ilike.%${search}%`
    );
  }
  query = query.order("created_at", { ascending: false }).range(from, to);

  const { data, error, count } = await query;
  if (error) {
    console.error("[listPatients]", error.message);
    return { rows: [] as Patient[], total: 0, totalPages: 1 };
  }
  const total = count ?? 0;
  return { rows: (data ?? []) as Patient[], total, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function getPatientById(id: string): Promise<Patient | null> {
  const supabase = await labClient();
  const { data, error } = await supabase.from("patients").select("*").eq("id", id).maybeSingle();
  if (error) return null;
  return (data as Patient) ?? null;
}

export async function getPatientHistory(patientId: string) {
  const supabase = await labClient();
  const [samples, orders, reports] = await Promise.all([
    supabase
      .from("samples")
      .select("*")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false }),
    supabase
      .from("lab_orders")
      .select("*")
      .eq("patient_id", patientId)
      .order("requested_at", { ascending: false }),
    supabase
      .from("lab_reports")
      .select("*")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false }),
  ]);

  return {
    samples: (samples.data ?? []) as Sample[],
    orders: (orders.data ?? []) as LabOrder[],
    reports: (reports.data ?? []) as LabReport[],
  };
}

export interface SampleListParams {
  search?: string;
  page?: number;
  pageSize?: number;
}

export async function listSamples({ search, page = 1, pageSize = 20 }: SampleListParams = {}) {
  const supabase = await labClient();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("samples")
    .select("*, patients(first_name, last_name, internal_code)", { count: "exact" });

  if (search) {
    query = query.or(`sample_code.ilike.%${search}%,sample_type.ilike.%${search}%`);
  }
  query = query.order("created_at", { ascending: false }).range(from, to);

  const { data, error, count } = await query;
  if (error) {
    console.error("[listSamples]", error.message);
    return { rows: [], total: 0, totalPages: 1 };
  }
  const total = count ?? 0;
  return { rows: data ?? [], total, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function getAllPatientsForSelect() {
  const supabase = await labClient();
  const { data } = await supabase
    .from("patients")
    .select("id, first_name, last_name, internal_code, document_id")
    .order("last_name", { ascending: true });
  return (data ?? []) as Pick<Patient, "id" | "first_name" | "last_name" | "internal_code" | "document_id">[];
}

export async function getSampleById(id: string): Promise<Sample | null> {
  const supabase = await labClient();
  const { data, error } = await supabase.from("samples").select("*").eq("id", id).maybeSingle();
  if (error) return null;
  return (data as Sample) ?? null;
}

export async function getSamplesForPatient(patientId: string): Promise<Sample[]> {
  const supabase = await labClient();
  const { data } = await supabase
    .from("samples")
    .select("*")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false });
  return (data ?? []) as Sample[];
}

export interface OrderListParams {
  status?: string;
  page?: number;
  pageSize?: number;
}

export async function listOrders({ status, page = 1, pageSize = 20 }: OrderListParams = {}) {
  const supabase = await labClient();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("lab_orders")
    .select("*, patients(first_name, last_name, internal_code)", { count: "exact" });

  if (status && status !== "todos") {
    query = query.eq("status", status);
  }
  query = query.order("requested_at", { ascending: false }).range(from, to);

  const { data, error, count } = await query;
  if (error) {
    console.error("[listOrders]", error.message);
    return { rows: [], total: 0, totalPages: 1 };
  }
  const total = count ?? 0;
  return { rows: data ?? [], total, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

export interface OrderItemWithDetails extends LabOrderItem {
  clinical_analyses: ClinicalAnalysis;
  lab_results: LabResult | null;
}

export async function getOrderWithDetails(orderId: string) {
  const supabase = await labClient();

  const [orderRes, itemsRes, reportRes] = await Promise.all([
    supabase.from("lab_orders").select("*").eq("id", orderId).maybeSingle(),
    supabase
      .from("lab_order_items")
      .select("*, clinical_analyses(*), lab_results(*)")
      .eq("order_id", orderId),
    supabase.from("lab_reports").select("*").eq("order_id", orderId).maybeSingle(),
  ]);

  const order = orderRes.data as LabOrder | null;
  if (!order) return null;

  const [patientData, sampleData] = await Promise.all([
    supabase.from("patients").select("*").eq("id", order.patient_id).maybeSingle(),
    order.sample_id
      ? supabase.from("samples").select("*").eq("id", order.sample_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const items = (itemsRes.data ?? []) as unknown as Array<
    LabOrderItem & { clinical_analyses: ClinicalAnalysis; lab_results: LabResult[] | LabResult | null }
  >;

  const normalizedItems: OrderItemWithDetails[] = items.map((item) => ({
    ...item,
    lab_results: Array.isArray(item.lab_results) ? item.lab_results[0] ?? null : item.lab_results,
  }));

  return {
    order,
    patient: (patientData.data as Patient) ?? null,
    sample: (sampleData.data as Sample) ?? null,
    items: normalizedItems,
    report: (reportRes.data as LabReport) ?? null,
  };
}

export async function getAvailableAnalysesForOrder(orderId: string): Promise<ClinicalAnalysis[]> {
  const supabase = await labClient();
  const [{ data: allAnalyses }, { data: existingItems }] = await Promise.all([
    supabase.from("clinical_analyses").select("*").eq("is_active", true).order("name"),
    supabase.from("lab_order_items").select("analysis_id").eq("order_id", orderId),
  ]);

  const existingIds = new Set((existingItems ?? []).map((i: { analysis_id: string }) => i.analysis_id));
  return ((allAnalyses ?? []) as ClinicalAnalysis[]).filter((a) => !existingIds.has(a.id));
}

export interface ResultListParams {
  status?: string;
  page?: number;
  pageSize?: number;
}

export async function listResults({ status, page = 1, pageSize = 20 }: ResultListParams = {}) {
  const supabase = await labClient();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("lab_results")
    .select(
      "*, lab_order_items(analysis_id, result_type, clinical_analyses(name), lab_orders(id, order_code, patients(first_name, last_name)))",
      { count: "exact" }
    );

  if (status && status !== "todos") {
    query = query.eq("status", status);
  }
  query = query.order("created_at", { ascending: false }).range(from, to);

  const { data, error, count } = await query;
  if (error) {
    console.error("[listResults]", error.message);
    return { rows: [], total: 0, totalPages: 1 };
  }
  const total = count ?? 0;
  return { rows: data ?? [], total, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

export interface ReportListParams {
  page?: number;
  pageSize?: number;
}

export async function listReports({ page = 1, pageSize = 20 }: ReportListParams = {}) {
  const supabase = await labClient();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await supabase
    .from("lab_reports")
    .select("*, patients(first_name, last_name, internal_code)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("[listReports]", error.message);
    return { rows: [], total: 0, totalPages: 1 };
  }
  const total = count ?? 0;
  return { rows: data ?? [], total, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function getReportById(id: string): Promise<LabReport | null> {
  const supabase = await labClient();
  const { data, error } = await supabase.from("lab_reports").select("*").eq("id", id).maybeSingle();
  if (error) return null;
  return (data as LabReport) ?? null;
}

export async function getLabSettings(): Promise<LabSettings> {
  const supabase = await labClient();
  const { data } = await supabase.from("lab_settings").select("*").eq("id", true).maybeSingle();
  return (
    (data as LabSettings) ?? {
      id: true,
      lab_name: "LABDEX",
      logo_path: null,
      address: null,
      phone: null,
      email: null,
      website: null,
      responsible_name: null,
      responsible_title: null,
      responsible_license: null,
      signature_path: null,
      seal_path: null,
      updated_by: null,
      updated_at: new Date().toISOString(),
    }
  );
}
