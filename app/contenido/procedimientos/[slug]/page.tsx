import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Breadcrumbs } from "@/components/content/Breadcrumbs";
import { ResourceDetailSections } from "@/components/content/ResourceDetailSections";
import { SampleDataBadge } from "@/components/content/SampleDataBadge";
import { getResourceRowBySlug } from "@/lib/content/queries";
import type { Procedure } from "@/lib/supabase/types";

export const revalidate = 0;

async function loadItem(slug: string) {
  const item = await getResourceRowBySlug<Procedure>("procedures", slug);
  if (!item || !item.is_active) return null;
  return item;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const item = await loadItem(slug);
  if (!item) return { title: "LABDEX" };

  const description =
    item.description?.slice(0, 155) || `Ficha de ${item.name} en LABDEX.`;

  return {
    title: `${item.name} | LABDEX`,
    description,
    openGraph: { title: `${item.name} | LABDEX`, description },
  };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const item = await loadItem(slug);
  if (!item) notFound();

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <Header />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6 lg:px-8">
        <Breadcrumbs
          items={[
            { label: "Inicio", href: "/" },
            { label: "Contenido", href: "/contenido" },
            { label: "Procedimientos", href: "/contenido/procedimientos" },
            { label: item.name },
          ]}
        />

        <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
          <h1 className="text-2xl font-semibold text-text">
            {item.name}
          </h1>
          <SampleDataBadge show={item.is_sample_data} />
        </div>

        {item.description && <p className="mt-4 text-text-muted">{item.description}</p>}

        <div className="mt-6">
          <ResourceDetailSections resourceKey="procedures" record={item as unknown as Record<string, unknown>} />
        </div>

        
      </main>
      <Footer />
    </div>
  );
}
