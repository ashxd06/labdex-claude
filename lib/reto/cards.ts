import type {
  ClinicalAnalysis,
  CultureMedia,
  LaboratoryTest,
  Microorganism,
  Procedure,
} from "@/lib/supabase/types";
import { KIND_VALUE_TO_SLUG } from "@/lib/content/kindSlugs";

export interface LearningCard {
  id: string;
  topic: string;
  title: string;
  prompt: string;
  answer: string;
  explanation: string;
  href: string;
  casePrompt?: string;
  caseAnswer?: string;
}

type Resource = {
  id: string;
  name?: string;
  scientific_name?: string;
  slug: string;
  description?: string | null;
  [key: string]: unknown;
};

const FIELD_QUESTIONS: Record<string, { label: string; prompt: string }[]> = {
  microorganisms: [
    { label: "classification", prompt: "¿Cómo se clasifica?" },
    { label: "morphology", prompt: "¿Qué rasgos morfológicos debes recordar?" },
    { label: "gram_stain", prompt: "¿Cuál es su resultado de tinción de Gram?" },
    { label: "shape", prompt: "¿Qué forma presenta?" },
    { label: "arrangement", prompt: "¿Cómo se agrupa?" },
    { label: "oxygen_requirement", prompt: "¿Cuál es su requerimiento de oxígeno?" },
    { label: "motility", prompt: "¿Presenta motilidad?" },
    { label: "spore_formation", prompt: "¿Forma esporas?" },
    { label: "culture", prompt: "¿Qué debes recordar sobre su cultivo?" },
    { label: "diagnosis", prompt: "¿Qué métodos diagnósticos describe la ficha?" },
    { label: "transmission", prompt: "¿Cómo se transmite según la ficha?" },
    { label: "prevention", prompt: "¿Qué medidas de prevención señala la ficha?" },
  ],
  culture_media: [
    { label: "purpose", prompt: "¿Para qué se utiliza este medio?" },
    { label: "principle", prompt: "¿Cuál es el principio del medio?" },
    { label: "type", prompt: "¿Qué tipo de medio es?" },
    { label: "interpretation", prompt: "¿Cómo se interpretan sus resultados?" },
    { label: "incubation", prompt: "¿Qué condiciones de incubación indica la ficha?" },
  ],
  laboratory_tests: [
    { label: "principle", prompt: "¿En qué principio se basa esta prueba?" },
    { label: "sample_type", prompt: "¿Qué tipo de muestra requiere?" },
    { label: "interpretation", prompt: "¿Cómo se interpreta el resultado?" },
  ],
  procedures: [
    { label: "objective", prompt: "¿Cuál es el objetivo de este procedimiento?" },
    { label: "sample", prompt: "¿Qué muestra se utiliza?" },
    { label: "precautions", prompt: "¿Qué precauciones son importantes?" },
    { label: "interpretation", prompt: "¿Qué indica la interpretación descrita?" },
  ],
  clinical_analyses: [
    { label: "sample_type", prompt: "¿Qué tipo de muestra se analiza?" },
    { label: "method", prompt: "¿Qué método utiliza este análisis?" },
    { label: "principle", prompt: "¿Cuál es su principio?" },
    { label: "reference_range", prompt: "¿Qué rango de referencia indica la ficha?" },
    { label: "interpretation", prompt: "¿Cómo se interpreta según la ficha?" },
  ],
};

function makeCards(key: keyof typeof FIELD_QUESTIONS, topic: string, rows: Resource[]): LearningCard[] {
  const routes: Record<string, string> = {
    microorganisms: "microbiologia",
    culture_media: "medios",
    laboratory_tests: "pruebas",
    procedures: "procedimientos",
    clinical_analyses: "analisis",
  };
  return rows.flatMap((row) =>
    FIELD_QUESTIONS[key].flatMap(({ label, prompt }) => {
      const value = row[label];
      if (typeof value !== "string" || value.trim().length < 3) return [];
      const resourceName = row.name ?? row.scientific_name ?? "Ficha de laboratorio";
      const kindSlug = key === "microorganisms"
        ? KIND_VALUE_TO_SLUG[String(row.kind) as keyof typeof KIND_VALUE_TO_SLUG] || "bacterias"
        : null;
      const slugPath = key === "microorganisms" ? `microbiologia/${kindSlug}/${row.slug}` : `${routes[key]}/${row.slug}`;
      return [{
        id: `${key}:${row.id}:${label}`,
        topic,
        title: resourceName,
        prompt,
        answer: value.trim(),
        explanation: row.description?.trim() || `Respuesta tomada de la ficha publicada de ${resourceName}.`,
        href: `/contenido/${slugPath}`,
        ...(key === "microorganisms" && row.morphology && row.gram_stain
          ? {
              casePrompt: `Caso educativo: en una práctica observas un microorganismo con tinción de Gram «${String(row.gram_stain)}» y esta morfología: «${String(row.morphology)}». ¿Qué ficha de LABDEX consultarías para estudiar estos hallazgos?`,
              caseAnswer: `${resourceName}. Revisa la tinción de Gram y morfología completas en su ficha; estos datos orientan el estudio académico, no establecen un diagnóstico.`,
            }
          : {}),
      }];
    })
  );
}

export function buildLearningCards(data: {
  microorganisms: Microorganism[];
  media: CultureMedia[];
  tests: LaboratoryTest[];
  procedures: Procedure[];
  analyses: ClinicalAnalysis[];
}): LearningCard[] {
  return [
    ...makeCards("microorganisms", "Microbiología", data.microorganisms as unknown as Resource[]),
    ...makeCards("culture_media", "Medios de cultivo", data.media as unknown as Resource[]),
    ...makeCards("laboratory_tests", "Pruebas", data.tests as unknown as Resource[]),
    ...makeCards("procedures", "Procedimientos", data.procedures as unknown as Resource[]),
    ...makeCards("clinical_analyses", "Análisis clínicos", data.analyses as unknown as Resource[]),
  ];
}

export function cardForDate(cards: LearningCard[], date: string): LearningCard | null {
  if (!cards.length) return null;
  let hash = 0;
  for (const character of date) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return cards[hash % cards.length];
}

