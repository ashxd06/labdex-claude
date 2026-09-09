import { FlaskConical, Percent, ArrowLeftRight, Atom, Ruler } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { CalculatorId } from "@/lib/calculadoras/types";

export interface CalculatorMeta {
  id: CalculatorId;
  slug: string;
  title: string;
  description: string;
  icon: LucideIcon;
}

/** Registro de las 5 calculadoras de esta fase (Fase 5.1, §2). No agregar
 * más entradas aquí sin ampliar también la fase correspondiente (§26). */
export const CALCULATORS: CalculatorMeta[] = [
  {
    id: "diluciones",
    slug: "diluciones",
    title: "Diluciones",
    description: "Resuelve C₁ × V₁ = C₂ × V₂ y calcula el volumen de diluyente.",
    icon: FlaskConical,
  },
  {
    id: "concentracion",
    slug: "concentracion",
    title: "Concentración %",
    description: "Calcula la concentración % m/v de una solución.",
    icon: Percent,
  },
  {
    id: "ppm",
    slug: "ppm",
    title: "ppm ↔ %",
    description: "Convierte concentraciones entre partes por millón y porcentaje.",
    icon: ArrowLeftRight,
  },
  {
    id: "molaridad",
    slug: "molaridad",
    title: "Molaridad",
    description: "Calcula molaridad, moles o volumen, con soporte para masa y masa molar.",
    icon: Atom,
  },
  {
    id: "unidades",
    slug: "unidades",
    title: "Conversión de unidades",
    description: "Convierte entre unidades de masa, volumen o concentración.",
    icon: Ruler,
  },
];
