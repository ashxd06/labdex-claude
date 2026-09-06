import { notFound } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { getResourceRowBySlug } from "@/lib/content/queries";
import { getRelationsData } from "@/lib/content/relations";
import { getPublicUrl } from "@/lib/content/publicUrl";
import { KIND_SLUG_TO_VALUE, KIND_VALUE_TO_LABEL } from "@/lib/content/kindSlugs";
import { SampleDataBadge } from "@/components/content/SampleDataBadge";
import { Badge } from "@/components/ui/Badge";
import type { Microorganism } from "@/lib/supabase/types";
import Image from "next/image";

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

export default async function MicroorganismDetailPage({
  params,
}: {
  params: Promise<{ kind: string; slug: string }>;
}) {
  const { kind: kindSlug, slug } = await params;
  const kind = KIND_SLUG_TO_VALUE[kindSlug];
  if (!kind) notFound();

  const item = await getResourceRowBySlug<Microorganism>("microorganisms", slug);
  if (!item || item.kind !== kind || !item.is_active) notFound();

  const { linkedMedia, linkedTests, linkedProcedures } = await getRelationsData(item.id);

  const microscopyUrl = getPublicUrl("microorganism-images", item.microscopy_image_path);
  const cultureUrl = getPublicUrl("microorganism-images", item.culture_image_path);

  return (
    <div className="min-h-dvh bg-bg">
      <Header />
      <main className="mx-auto max-w-4xl px-4 py-14 sm:px-6 lg:px-8">
        <Link href={`/contenido/microbiologia/${kindSlug}`} className="text-sm text-text-muted hover:text-text">
          ← {KIND_VALUE_TO_LABEL[kind]}
        </Link>

        <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
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

        {item.description && (
          <p className="mt-6 text-text-muted">{item.description}</p>
        )}

        {(microscopyUrl || cultureUrl) && (
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {microscopyUrl && (
              <figure className="overflow-hidden rounded-lg border border-border">
                <Image
                  src={microscopyUrl}
                  alt={`Microscopía de ${item.scientific_name}`}
                  width={600}
                  height={400}
                  className="h-56 w-full object-cover"
                  unoptimized
                />
                <figcaption className="border-t border-border bg-surface px-3 py-2 text-xs text-text-faint">
                  Microscopía
                </figcaption>
              </figure>
            )}
            {cultureUrl && (
              <figure className="overflow-hidden rounded-lg border border-border">
                <Image
                  src={cultureUrl}
                  alt={`Cultivo de ${item.scientific_name}`}
                  width={600}
                  height={400}
                  className="h-56 w-full object-cover"
                  unoptimized
                />
                <figcaption className="border-t border-border bg-surface px-3 py-2 text-xs text-text-faint">
                  Cultivo
                </figcaption>
              </figure>
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
              Todavía no se ha completado la ficha científica de este microorganismo.
            </p>
          )}
        </div>

        {(linkedMedia.length > 0 || linkedTests.length > 0 || linkedProcedures.length > 0) && (
          <div className="mt-8 flex flex-col gap-6">
            {linkedMedia.length > 0 && (
              <RelatedList title="Medios relacionados" items={linkedMedia.map((m) => m.name)} />
            )}
            {linkedTests.length > 0 && (
              <RelatedList title="Pruebas relacionadas" items={linkedTests.map((t) => t.name)} />
            )}
            {linkedProcedures.length > 0 && (
              <RelatedList
                title="Procedimientos relacionados"
                items={linkedProcedures.map((p) => p.name)}
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function RelatedList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-text">{title}</h2>
      <div className="mt-2 flex flex-wrap gap-2">
        {items.map((name) => (
          <span
            key={name}
            className="rounded-full border border-border bg-surface-2 px-3 py-1 text-xs uppercase tracking-wide text-text-muted"
          >
            {name}
          </span>
        ))}
      </div>
    </div>
  );
}
