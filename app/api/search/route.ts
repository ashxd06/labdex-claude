import { NextResponse, type NextRequest } from "next/server";
import { listResourceRows } from "@/lib/content/queries";
import { KIND_VALUE_TO_SLUG } from "@/lib/content/kindSlugs";
import type {
  Microorganism,
  CultureMedia,
  LaboratoryTest,
  Procedure,
  ClinicalAnalysis,
  LabDocument,
} from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

const LIMIT = 4;

/**
 * Endpoint de búsqueda en tiempo real usado por el buscador del header
 * (con debounce en el cliente, ver components/layout/SearchBar.tsx).
 * Reutiliza exactamente las mismas consultas y RLS que /buscar; no hay una
 * copia separada de los datos.
 */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const [microorganisms, media, tests, procedures, analyses, documents] = await Promise.all([
    listResourceRows<Microorganism>("microorganisms", {
      onlyActive: true,
      search: q,
      searchColumns: ["scientific_name", "common_name"],
    }),
    listResourceRows<CultureMedia>("culture_media", {
      onlyActive: true,
      search: q,
      searchColumns: ["name"],
    }),
    listResourceRows<LaboratoryTest>("laboratory_tests", {
      onlyActive: true,
      search: q,
      searchColumns: ["name"],
    }),
    listResourceRows<Procedure>("procedures", {
      onlyActive: true,
      search: q,
      searchColumns: ["name"],
    }),
    listResourceRows<ClinicalAnalysis>("clinical_analyses", {
      onlyActive: true,
      search: q,
      searchColumns: ["name"],
    }),
    listResourceRows<LabDocument>("documents", {
      onlyActive: true,
      search: q,
      searchColumns: ["title"],
    }),
  ]);

  const results = [
    ...microorganisms.slice(0, LIMIT).map((m) => ({
      type: "Microorganismo",
      label: m.scientific_name,
      href: `/contenido/microbiologia/${KIND_VALUE_TO_SLUG[m.kind]}/${m.slug}`,
    })),
    ...media.slice(0, LIMIT).map((m) => ({
      type: "Medio de cultivo",
      label: m.name,
      href: `/contenido/medios/${m.slug}`,
    })),
    ...tests.slice(0, LIMIT).map((t) => ({
      type: "Prueba",
      label: t.name,
      href: `/contenido/pruebas/${t.slug}`,
    })),
    ...procedures.slice(0, LIMIT).map((p) => ({
      type: "Procedimiento",
      label: p.name,
      href: `/contenido/procedimientos/${p.slug}`,
    })),
    ...analyses.slice(0, LIMIT).map((a) => ({
      type: "Análisis clínico",
      label: a.name,
      href: `/contenido/analisis/${a.slug}`,
    })),
    ...documents.slice(0, LIMIT).map((d) => ({
      type: "Documento",
      label: d.title,
      href: `/contenido/documentos`,
    })),
  ].slice(0, 10);

  return NextResponse.json({ results });
}
