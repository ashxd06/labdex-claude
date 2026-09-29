import Link from "next/link";
import { ArrowRight, FileEdit, Microscope, FlaskConical, ClipboardCheck, Workflow, FileStack, Tags, Plus } from "lucide-react";
import { getSession } from "@/lib/auth/getSession";
import { countResourceRowsResult, getAdminContentReviewData } from "@/lib/content/queries";
import { StatCard } from "@/components/admin/StatCard";
import { Badge } from "@/components/ui/Badge";

export default async function AdminPage() {
  const { profile } = await getSession();

  const [categories, microorganisms, media, tests, procedures, analyses, documents, review] =
    await Promise.all([
      countResourceRowsResult("categories"),
      countResourceRowsResult("microorganisms"),
      countResourceRowsResult("culture_media"),
      countResourceRowsResult("laboratory_tests"),
      countResourceRowsResult("procedures"),
      countResourceRowsResult("clinical_analyses"),
      countResourceRowsResult("documents"),
      getAdminContentReviewData(),
    ]);

  const inventory = [
    { icon: Tags, label: "Categorías", result: categories, href: "/admin/categorias" },
    { icon: Microscope, label: "Microorganismos", result: microorganisms, href: "/admin/microorganismos" },
    { icon: FlaskConical, label: "Medios de cultivo", result: media, href: "/admin/medios" },
    { icon: ClipboardCheck, label: "Pruebas", result: tests, href: "/admin/pruebas" },
    { icon: Workflow, label: "Procedimientos", result: procedures, href: "/admin/procedimientos" },
    { icon: FileStack, label: "Análisis clínicos", result: analyses, href: "/admin/analisis" },
    { icon: FileStack, label: "Documentos", result: documents, href: "/admin/documentos" },
  ];
  const hasInventoryError = inventory.some(({ result }) => result.error);
  const reviewCount = review.draftCount === null || review.changeCount === null
    ? null
    : review.draftCount + review.changeCount;

  return (
      <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold text-text">Panel de administración</h1>
        <p className="mt-1 text-sm text-text-muted">
          Bienvenido, {profile?.full_name || "administrador"}.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link href="/admin/microorganismos/nuevo" className="inline-flex min-h-11 items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60">
          <Plus className="size-4" aria-hidden="true" /> Nueva ficha
        </Link>
        <Link href="/contenido" className="inline-flex min-h-11 items-center gap-2 rounded-md border border-border bg-surface px-4 py-2.5 text-sm font-medium text-text hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60">
          Ver contenido público <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>

      <section aria-labelledby="review-heading" className="flex flex-col gap-4">
        <div>
          <h2 id="review-heading" className="text-lg font-semibold text-text">Revisión de contenido</h2>
          <p className="mt-1 text-sm text-text-muted">Borradores nuevos y cambios guardados sin publicar.</p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ReviewStat icon={FileEdit} label="Borradores" value={review.draftCount} />
          <ReviewStat icon={FileEdit} label="Cambios por publicar" value={review.changeCount} />
        </div>
        {review.error && (
          <p role="status" className="rounded-md border border-warning/30 bg-warning-soft px-3 py-2 text-sm text-warning">
            Algunas cifras de revisión no se pudieron cargar; se muestran como “—” para no confundir un error con cero.
          </p>
        )}
        {review.items.length > 0 ? (
          <div className="overflow-hidden rounded-lg border border-border bg-surface">
            <ul className="divide-y divide-border">
              {review.items.map((item) => (
                <li key={`${item.kind}:${item.resourceKey}:${item.id}`}>
                  <Link href={item.href} className="flex min-h-14 items-center gap-3 px-4 py-3 hover:bg-surface-2/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/60">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-text">{item.title}</p>
                      <p className="mt-0.5 text-xs text-text-muted">{item.resourceLabel} · {formatReviewDate(item.updatedAt)}</p>
                    </div>
                    <Badge tone={item.kind === "changes" ? "warning" : "neutral"}>
                      {item.kind === "changes" ? "Cambios" : "Borrador"}
                    </Badge>
                    <ArrowRight className="size-4 shrink-0 text-text-faint" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : reviewCount === 0 ? (
          <p className="rounded-lg border border-border bg-surface p-4 text-sm text-text-muted">Todo está al día; no hay borradores ni cambios pendientes.</p>
        ) : null}
      </section>

      <section aria-labelledby="inventory-heading" className="flex flex-col gap-4">
        <div>
          <h2 id="inventory-heading" className="text-lg font-semibold text-text">Inventario</h2>
          <p className="mt-1 text-sm text-text-muted">Registros totales, incluidos borradores e inactivos. Selecciona una tarjeta para administrar esa sección.</p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {inventory.map(({ icon, label, result, href }) => (
            <Link key={href} href={href} aria-label={`Administrar ${label}`} className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60">
              <StatCard icon={icon} label={label} value={result.count === null ? "—" : String(result.count)} />
            </Link>
          ))}
        </div>
        {hasInventoryError ? (
          <p role="status" className="text-sm text-warning">No se pudieron cargar todos los conteos. “—” indica un error de consulta, no que haya cero registros.</p>
        ) : (
          <p className="text-xs text-text-faint">Los conteos se actualizan al cargar el panel.</p>
        )}
      </section>
    </div>
  );
}

function ReviewStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof FileEdit;
  label: string;
  value: number | null;
}) {
  return (
    <div className="flex min-h-24 items-center gap-4 rounded-lg border border-border bg-surface p-5">
      <span className="flex size-10 items-center justify-center rounded-md bg-primary-soft text-primary"><Icon className="size-5" aria-hidden="true" /></span>
      <span>
        <span className="block text-2xl font-semibold tabular-nums text-text">{value === null ? "—" : value}</span>
        <span className="text-sm text-text-muted">{label}</span>
      </span>
    </div>
  );
}

function formatReviewDate(value: string) {
  if (!value) return "Fecha no disponible";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Fecha no disponible";
  return new Intl.DateTimeFormat("es-PE", { dateStyle: "medium", timeZone: "America/Lima" }).format(date);
}

