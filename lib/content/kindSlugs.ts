import type { MicroorganismKind } from "@/lib/supabase/types";

export const KIND_SLUG_TO_VALUE: Record<string, MicroorganismKind> = {
  bacterias: "bacteria",
  hongos: "hongo",
  virus: "virus",
  parasitos: "parasito",
};

export const KIND_VALUE_TO_SLUG: Record<MicroorganismKind, string> = {
  bacteria: "bacterias",
  hongo: "hongos",
  virus: "virus",
  parasito: "parasitos",
};

export const KIND_VALUE_TO_LABEL: Record<MicroorganismKind, string> = {
  bacteria: "Bacterias",
  hongo: "Hongos",
  virus: "Virus",
  parasito: "Parásitos",
};

export const KIND_SECTIONS: { slug: string; kind: MicroorganismKind; label: string }[] = [
  { slug: "bacterias", kind: "bacteria", label: "Bacterias" },
  { slug: "hongos", kind: "hongo", label: "Hongos" },
  { slug: "virus", kind: "virus", label: "Virus" },
  { slug: "parasitos", kind: "parasito", label: "Parásitos" },
];
