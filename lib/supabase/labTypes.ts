export type PatientSex = "M" | "F" | "otro";
export type SampleStatus = "pendiente" | "recibida" | "en_proceso" | "procesada" | "rechazada";
export type SampleCondition =
  | "adecuada"
  | "hemolizada"
  | "lipemica"
  | "icterica"
  | "insuficiente"
  | "contaminada"
  | "otra";
export type OrderPriority = "normal" | "urgente";
export type OrderStatus = "pendiente" | "en_proceso" | "completada" | "cancelada";
export type ResultType = "cuantitativo" | "cualitativo" | "semicuantitativo" | "descriptivo";
export type ResultStatus = "pendiente" | "ingresado" | "validado" | "informado";
export type ReportStatus = "borrador" | "emitido" | "anulado";

export interface Patient {
  id: string;
  internal_code: string;
  first_name: string;
  last_name: string;
  document_id: string | null;
  birth_date: string | null;
  sex: PatientSex | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  is_demo: boolean;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Sample {
  id: string;
  patient_id: string;
  sample_code: string;
  sample_type: string;
  collected_date: string | null;
  collected_time: string | null;
  received_date: string | null;
  received_time: string | null;
  condition: SampleCondition;
  notes: string | null;
  status: SampleStatus;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface LabOrder {
  id: string;
  order_code: string;
  patient_id: string;
  sample_id: string | null;
  doctor_name: string | null;
  clinical_notes: string | null;
  priority: OrderPriority;
  status: OrderStatus;
  requested_at: string;
  completed_at: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface LabOrderItem {
  id: string;
  order_id: string;
  analysis_id: string;
  result_type: ResultType;
  created_at: string;
}

export interface LabResult {
  id: string;
  order_item_id: string;
  result_value: string | null;
  unit: string | null;
  reference_range_text: string | null;
  flag: "bajo" | "normal" | "alto" | null;
  observation: string | null;
  status: ResultStatus;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReferenceRange {
  id: string;
  analysis_id: string;
  sex: PatientSex | null;
  age_min: number | null;
  age_max: number | null;
  range_min: number | null;
  range_max: number | null;
  unit: string | null;
  reference_text: string | null;
  created_at: string;
}

export interface LabReport {
  id: string;
  report_number: string;
  order_id: string;
  patient_id: string;
  status: ReportStatus;
  responsible_name: string | null;
  responsible_title: string | null;
  responsible_license: string | null;
  issued_at: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface LabSettings {
  id: true;
  lab_name: string;
  logo_path: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  responsible_name: string | null;
  responsible_title: string | null;
  responsible_license: string | null;
  signature_path: string | null;
  seal_path: string | null;
  updated_by: string | null;
  updated_at: string;
}

export const SAMPLE_TYPES = [
  "Sangre total",
  "Suero",
  "Plasma",
  "Orina",
  "Heces",
  "LCR",
  "Hisopado",
  "Esputo",
  "Semen",
  "Secreción",
  "Otro",
];

export const QUALITATIVE_OPTIONS = [
  "Positivo",
  "Negativo",
  "Reactivo",
  "No reactivo",
  "Presente",
  "Ausente",
  "Normal",
  "Anormal",
];

export const SEMIQUANTITATIVE_OPTIONS = ["Negativo", "+", "++", "+++", "++++"];
