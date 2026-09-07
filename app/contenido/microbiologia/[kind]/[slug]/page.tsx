import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Breadcrumbs } from "@/components/content/Breadcrumbs";
import { LightboxImage } from "@/components/content/LightboxImage";
import { getResourceRowBySlug } from "@/lib/content/queries";
import { getRelationsData } from "@/lib/content/relations";
import { getPublicUrl } from "@/lib/content/publicUrl";
import { KIND_SLUG_TO_VALUE, KIND_VALUE_TO_LABEL } from "@/lib/content/kindSlugs";
import { SampleDataBadge } from "@/components/content/SampleDataBadge";
import { Badge } from "@/components/ui/Badge";
import type { Microorganism } from "@/lib/supabase/types";

export const revalidate = 0;

const SECTION_FIELDS: { key: keyof Microorganism; label: string }[] = [
  { key: "classification", label: "Clasificación" },
  { key: "morphology", label: "Morfología" },
  { key: "gram_stain", label: "Tinción de Gram" },
  { key: "shape", label: "Forma" },
  { key: "arrangement", label: "Agrupación" },
  { key: "oxygen_requirement", label: "Requerimiento de oxígeno" },
  { key: "motility", label: "Motilidad" },
  { key: "spore_formation", label: "Formación de esporas" },
  { key: "culture", label: "Cultivo" },
  { key: "pathogenicity", label: "Patogenicidad" },
  { key: "clinical_importance", label: "Importancia clínica" },
  { key: "transmission", label: "Transmisión" },
  { key: "diagnosis", label: "Diagnóstico" },
  { key: "prevention", label: "Prevención" },
];

type PageParams = { kind: string; slug: string };

async function loadItem(params: Promise<PageParams>) {
  const { kind: kindSlug, slug } = await params;
  const kind = KIND_SLUG_TO_VALUE[kindSlug];
  if (!kind) return null;

  const item = await getResourceRowBySlug<Microorganism>("microorganisms", slug);
  if (!item || item.kind !== kind || !item.is_active) return null;

  return { item, kind, kindSlug };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const result = await loadItem(params);
  if (!result) return { title: "LABDEX" };

  const { item } = result;
  const description =
    item.description?.slice(0, 155) ||
    `Ficha de ${item.scientific_name} en la enciclopedia de laboratorio clínico de LABDEX.`;

  return {
    title: `${item.scientific_name.toUpperCase()} | LABDEX`,
    description,
    openGraph: {
      title: `${item.scientific_name.toUpperCase()} | LABDEX`,
      description,
    },
  };
}

export default async function MicroorganismDetailPage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const result = await loadItem(params);
  if (!result) notFound();
  const { item, kind, kindSlug } = result;

  const { linkedMedia, linkedTests, linkedProcedures } = await getRelationsData(item.id);

  const microscopyUrl = getPublicUrl("microorganism-images", item.microscopy_image_path);
  const cultureUrl = getPublicUrl("microorganism-images", item.culture_image_path);

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <Header />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6 lg:px-8">
        <Breadcrumbs
          items={[
            { label: "Inicio", href: "/" },
            { label: "Contenido", href: "/contenido" },
            { label: "Microbiología", href: "/contenido/microbiologia" },
            { label: KIND_VALUE_TO_LABEL[kind], href: `/contenido/microbiologia/${kindSlug}` },
            { label: item.scientific_name.toUpperCase() },
          ]}
        />

        <div className="mt-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold uppercase tracking-wide text-text">
              {item.scientific_name}
            </h1>
            {item.common_name && <p className="mt-1 text-text-muted">{item.common_name}</p>}
          </div>
          <div className="flex items-center gap-2">
            <Badge tone="primary">{KIND_VALUE_TO_LABEL[kind]}</Badge>
            <SampleDataBadge show={item.is_sample_data} />
          </div>
        </div>

        {item.description && <p className="mt-6 text-text-muted">{item.description}</p>}

        {(microscopyUrl || cultureUrl) && (
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {microscopyUrl && (
              <LightboxImage
                src={microscopyUrl}
                alt={`Microscopía de ${item.scientific_name}`}
                caption="Microscopía"
              />
            )}
            {cultureUrl && (
              <LightboxImage
                src={cultureUrl}
                alt={`Cultivo de ${item.scientific_name}`}
                caption="Cultivo"
              />
            )}
          </div>
        )}

        <div className="mt-8 flex flex-col divide-y divide-border rounded-lg border border-border bg-surface">
          {SECTION_FIELDS.filter((f) => item[f.key]).map((f) => (
            <div key={f.key} className="px-5 py-4">
              <h2 className="text-sm font-semibold text-text">{f.label}</h2>
              <p className="mt-1 whitespace-pre-line text-sm text-text-muted">
                {String(item[f.key])}
              </p>
            </div>
          ))}
          {SECTION_FIELDS.every((f) => !item[f.key]) && (
            <p className="px-5 py-6 text-sm text-text-faint">
              Información no disponible todavía para este microorganismo.
            </p>
          )}
        </div>

        {(linkedMedia.length > 0 || linkedTests.length > 0 || linkedProcedures.length > 0) && (
          <div className="mt-8 flex flex-col gap-6">
            {linkedMedia.length > 0 && (
              <RelatedList
                title="Medios relacionados"
                items={linkedMedia.map((m) => ({ name: m.name, href: m.slug ? `/contenido/medios/${m.slug}` : undefined }))}
              />
            )}
            {linkedTests.length > 0 && (
              <RelatedList
                title="Pruebas relacionadas"
                items={linkedTests.map((t) => ({ name: t.name, href: t.slug ? `/contenido/pruebas/${t.slug}` : undefined }))}
              />
            )}
            {linkedProcedures.length > 0 && (
              <RelatedList
                title="Procedimientos relacionados"
                items={linkedProcedures.map((p) => ({ name: p.name, href: p.slug ? `/contenido/procedimientos/${p.slug}` : undefined }))}
              />
            )}
          </div>
        )}

        <div className="mt-10 flex items-center justify-between gap-3 rounded-lg border border-dashed border-border p-4">
          <div className="flex items-center gap-2 text-sm text-text-muted">
            <Sparkles className="size-4 text-accent" />
            Consultar LABDEX AI sobre {item.scientific_name}
          </div>
          <span className="rounded-md bg-surface-2 px-2.5 py-1 text-xs text-text-faint">
            Próximamente
          </span>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function RelatedList({
  title,
  items,
}: {
  title: string;
  items: { name: string; href?: string }[];
}) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-text">{title}</h2>
      <div className="mt-2 flex flex-wrap gap-2">
        {items.map((item) =>
          item.href ? (
            <Link
              key={item.name}
              href={item.href}
              className="rounded-full border border-border bg-surface-2 px-3 py-1 text-xs uppercase tracking-wide text-text-muted transition-colors hover:border-accent hover:text-accent"
            >
              {item.name}
            </Link>
          ) : (
            <span
              key={item.name}
              className="rounded-full border border-border bg-surface-2 px-3 py-1 text-xs uppercase tracking-wide text-text-muted"
            >
              {item.name}
            </span>
          )
        )}
      </div>
    </div>
  );
}
