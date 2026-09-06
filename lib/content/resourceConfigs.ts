import type { LucideIcon } from "lucide-react";
import {
  FlaskConical,
  ClipboardCheck,
  Workflow,
  FileStack,
  Tags,
  Microscope,
} from "lucide-react";

/**
 * Recursos "simples" administrados con el CRUD genérico
 * (components/admin/crud + lib/content/actions.ts).
 *
 * `microorganisms` NO está aquí: tiene su propio CRUD dedicado en
 * app/admin/microorganismos porque necesita tabs, imágenes y relaciones.
 *
 * IMPORTANTE: este objeto también funciona como allowlist. Las Server
 * Actions genéricas (`createRecord`, `updateRecord`, `deleteRecord`) solo
 * aceptan un `resourceKey` que exista aquí, así el nombre de tabla nunca
 * llega directamente desde un formulario sin validar.
 */

export type FieldType = "text" | "textarea" | "select" | "checkbox" | "file";

export interface FieldConfig {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: { value: string; label: string }[];
  hint?: string;
  /** Si es true, se muestra en mayúsculas en las tablas/fichas (nombres científicos). */
  uppercaseDisplay?: boolean;
  /** Solo para type "file": bucket de Supabase Storage donde se sube el archivo. */
  bucket?: string;
  /** Agrupa visualmente los campos del formulario en secciones (opcional). */
  section?: string;
}

export interface ResourceConfig {
  key: string;
  table: string;
  label: string;
  labelSingular: string;
  icon: LucideIcon;
  titleField: string;
  slugField: string;
  fields: FieldConfig[];
  listColumns: string[];
  hasCategory: boolean;
  adminPath: string;
}

const commonStatusFields: FieldConfig[] = [
  { key: "is_active", label: "Activo", type: "checkbox" },
];

export const MICROORGANISM_KIND_OPTIONS = [
  { value: "bacteria", label: "Bacteria" },
  { value: "hongo", label: "Hongo" },
  { value: "virus", label: "Virus" },
  { value: "parasito", label: "Parásito" },
];

export const RESOURCE_CONFIGS: Record<string, ResourceConfig> = {
  microorganisms: {
    key: "microorganisms",
    table: "microorganisms",
    label: "Microorganismos",
    labelSingular: "Microorganismo",
    icon: Microscope,
    titleField: "scientific_name",
    slugField: "slug",
    hasCategory: true,
    adminPath: "/admin/microorganismos",
    listColumns: ["scientific_name", "kind", "gram_stain", "is_active"],
    fields: [
      // Información general
      { key: "scientific_name", label: "Nombre científico", type: "text", required: true, uppercaseDisplay: true, section: "Información general" },
      { key: "common_name", label: "Nombre común", type: "text", section: "Información general" },
      { key: "slug", label: "Slug", type: "text", required: true, section: "Información general" },
      { key: "kind", label: "Tipo", type: "select", required: true, options: MICROORGANISM_KIND_OPTIONS, section: "Información general" },
      { key: "category_id", label: "Categoría", type: "text", section: "Información general" },
      { key: "description", label: "Descripción", type: "textarea", section: "Información general" },

      // Clasificación
      { key: "classification", label: "Clasificación taxonómica", type: "textarea", section: "Clasificación" },

      // Morfología
      { key: "morphology", label: "Morfología", type: "textarea", section: "Morfología" },
      { key: "gram_stain", label: "Tinción de Gram", type: "text", hint: "Ej. Positivo, Negativo, No aplica", section: "Morfología" },
      { key: "shape", label: "Forma", type: "text", section: "Morfología" },
      { key: "arrangement", label: "Agrupación", type: "text", section: "Morfología" },
      { key: "oxygen_requirement", label: "Requerimiento de oxígeno", type: "text", section: "Morfología" },
      { key: "motility", label: "Motilidad", type: "text", section: "Morfología" },
      { key: "spore_formation", label: "Formación de esporas", type: "text", section: "Morfología" },

      // Cultivo
      { key: "culture", label: "Cultivo", type: "textarea", section: "Cultivo" },

      // Importancia clínica
      { key: "pathogenicity", label: "Patogenicidad", type: "textarea", section: "Importancia clínica" },
      { key: "clinical_importance", label: "Importancia clínica", type: "textarea", section: "Importancia clínica" },
      { key: "transmission", label: "Transmisión", type: "textarea", section: "Importancia clínica" },

      // Diagnóstico
      { key: "diagnosis", label: "Diagnóstico", type: "textarea", section: "Diagnóstico" },
      { key: "prevention", label: "Prevención", type: "textarea", section: "Diagnóstico" },

      // Imágenes
      { key: "microscopy_image_path", label: "Imagen de microscopía", type: "file", bucket: "microorganism-images", section: "Imágenes" },
      { key: "culture_image_path", label: "Imagen de cultivo", type: "file", bucket: "microorganism-images", section: "Imágenes" },

      ...commonStatusFields.map((f) => ({ ...f, section: "Información general" })),
    ],
  },
  categories: {
    key: "categories",
    table: "categories",
    label: "Categorías",
    labelSingular: "Categoría",
    icon: Tags,
    titleField: "name",
    slugField: "slug",
    hasCategory: false,
    adminPath: "/admin/categorias",
    listColumns: ["name", "type", "is_active"],
    fields: [
      { key: "name", label: "Nombre", type: "text", required: true },
      { key: "slug", label: "Slug", type: "text", required: true, hint: "Identificador único para la URL, ej. microbiologia" },
      { key: "description", label: "Descripción", type: "textarea" },
      { key: "icon", label: "Icono (nombre lucide-react)", type: "text", hint: "Ej. microscope, droplets, flask-conical" },
      { key: "type", label: "Tipo/agrupador", type: "text" },
      { key: "display_order", label: "Orden", type: "text" },
      ...commonStatusFields,
    ],
  },
  culture_media: {
    key: "culture_media",
    table: "culture_media",
    label: "Medios de cultivo",
    labelSingular: "Medio de cultivo",
    icon: FlaskConical,
    titleField: "name",
    slugField: "slug",
    hasCategory: false,
    adminPath: "/admin/medios",
    listColumns: ["name", "type", "is_active"],
    fields: [
      { key: "name", label: "Nombre", type: "text", required: true },
      { key: "slug", label: "Slug", type: "text", required: true },
      { key: "type", label: "Tipo", type: "text", hint: "Ej. Selectivo, diferencial, enriquecido" },
      { key: "description", label: "Descripción", type: "textarea" },
      { key: "purpose", label: "Propósito", type: "textarea" },
      { key: "principle", label: "Principio", type: "textarea" },
      { key: "composition", label: "Composición", type: "textarea" },
      { key: "preparation", label: "Preparación", type: "textarea" },
      { key: "incubation", label: "Incubación", type: "textarea" },
      { key: "interpretation", label: "Interpretación", type: "textarea" },
      { key: "quality_control", label: "Control de calidad", type: "textarea" },
      ...commonStatusFields,
    ],
  },
  laboratory_tests: {
    key: "laboratory_tests",
    table: "laboratory_tests",
    label: "Pruebas de laboratorio",
    labelSingular: "Prueba",
    icon: ClipboardCheck,
    titleField: "name",
    slugField: "slug",
    hasCategory: true,
    adminPath: "/admin/pruebas",
    listColumns: ["name", "is_active"],
    fields: [
      { key: "name", label: "Nombre", type: "text", required: true },
      { key: "slug", label: "Slug", type: "text", required: true },
      { key: "category_id", label: "Categoría", type: "text" },
      { key: "description", label: "Descripción", type: "textarea" },
      { key: "principle", label: "Principio", type: "textarea" },
      { key: "sample_type", label: "Tipo de muestra", type: "text" },
      { key: "reagents", label: "Reactivos", type: "textarea" },
      { key: "materials", label: "Materiales", type: "textarea" },
      { key: "procedure", label: "Procedimiento", type: "textarea" },
      { key: "interpretation", label: "Interpretación", type: "textarea" },
      ...commonStatusFields,
    ],
  },
  procedures: {
    key: "procedures",
    table: "procedures",
    label: "Procedimientos",
    labelSingular: "Procedimiento",
    icon: Workflow,
    titleField: "name",
    slugField: "slug",
    hasCategory: true,
    adminPath: "/admin/procedimientos",
    listColumns: ["name", "is_active"],
    fields: [
      { key: "name", label: "Nombre", type: "text", required: true },
      { key: "slug", label: "Slug", type: "text", required: true },
      { key: "category_id", label: "Categoría", type: "text" },
      { key: "description", label: "Descripción", type: "textarea" },
      { key: "objective", label: "Objetivo", type: "textarea" },
      { key: "sample", label: "Muestra", type: "text" },
      { key: "materials", label: "Materiales", type: "textarea" },
      { key: "reagents", label: "Reactivos", type: "textarea" },
      { key: "procedure", label: "Procedimiento", type: "textarea" },
      { key: "precautions", label: "Precauciones", type: "textarea" },
      { key: "interpretation", label: "Interpretación", type: "textarea" },
      ...commonStatusFields,
    ],
  },
  clinical_analyses: {
    key: "clinical_analyses",
    table: "clinical_analyses",
    label: "Análisis clínicos",
    labelSingular: "Análisis",
    icon: FileStack,
    titleField: "name",
    slugField: "slug",
    hasCategory: true,
    adminPath: "/admin/analisis",
    listColumns: ["name", "sample_type", "is_active"],
    fields: [
      { key: "name", label: "Nombre", type: "text", required: true, uppercaseDisplay: true },
      { key: "slug", label: "Slug", type: "text", required: true },
      { key: "category_id", label: "Categoría", type: "text" },
      { key: "description", label: "Descripción", type: "textarea" },
      { key: "sample_type", label: "Tipo de muestra", type: "text" },
      { key: "method", label: "Método", type: "text" },
      { key: "principle", label: "Principio", type: "textarea" },
      { key: "unit", label: "Unidad", type: "text" },
      { key: "reference_range", label: "Rango de referencia", type: "text" },
      { key: "calculation", label: "Cálculo", type: "textarea" },
      { key: "interpretation", label: "Interpretación", type: "textarea" },
      ...commonStatusFields,
    ],
  },
  documents: {
    key: "documents",
    table: "documents",
    label: "Documentos",
    labelSingular: "Documento",
    icon: FileStack,
    titleField: "title",
    slugField: "slug",
    hasCategory: false,
    adminPath: "/admin/documentos",
    listColumns: ["title", "category", "is_active"],
    fields: [
      { key: "title", label: "Título", type: "text", required: true },
      { key: "slug", label: "Slug", type: "text", required: true },
      { key: "description", label: "Descripción", type: "textarea" },
      { key: "category", label: "Categoría", type: "text" },
      { key: "file_type", label: "Tipo de archivo", type: "text", hint: "Ej. PDF, Inserto, Manual" },
      { key: "source", label: "Fuente", type: "text" },
      { key: "file_path", label: "Archivo", type: "file", bucket: "documents", hint: "PDF o imagen del documento/inserto." },
      ...commonStatusFields,
    ],
  },
};

export function getResourceConfig(key: string): ResourceConfig {
  const config = RESOURCE_CONFIGS[key];
  if (!config) {
    throw new Error(`Recurso desconocido: ${key}`);
  }
  return config;
}
