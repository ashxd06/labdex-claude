import Link from "next/link";
import { TestTube, Plus, Search } from "lucide-react";
import { listSamples } from "@/lib/lab/queries";
import { Pagination } from "@/components/content/Pagination";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/lab/StatusBadge";
import { SampleRowActions } from "@/components/lab/SampleRowActions";
import type { Sample, SampleStatus } from "@/lib/supabase/labTypes";

export const revalidate = 0;

type SampleRow = Sample & { patients: { first_name: string; last_name: string; internal_code: string } | null };

function formatSampleDate(sample: SampleRow): string {
  const date = sample.received_date ?? sample.collected_date ?? sample.created_at;
  if (!date) return "—";
  return new Date(date).toLocaleDateString("es");
}

export default async function MuestrasPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { q, page } = await searchParams;
  const currentPage = Number.parseInt(page ?? "1", 10) || 1;
  const { rows, total, totalPages } = await listSamples({ search: q, page: currentPage, pageSize: 20 });
  const samples = rows as unknown as SampleRow[];

  function buildHref(targetPage: number) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    params.set("page", String(targetPage));
    return `/laboratorio/muestras?${params.toString()}`;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-text">
            <TestTube className="size-5 text-primary" /> Muestras
          </h1>
          <p className="mt-1 text-sm text-text-muted">
            {total} {total === 1 ? "registrada" : "registradas"}
          </p>
        </div>
        <Link href="/laboratorio/muestras/nueva">
          <Button size="sm">
            <Plus className="size-4" /> Nueva muestra
          </Button>
        </Link>
      </div>

      <form className="max-w-sm">
        <label className="flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 focus-within:border-primary">
          <Search className="size-4 text-text-muted" aria-hidden="true" />
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Buscar por código o tipo…"
            className="w-full bg-transparent text-sm outline-none placeholder:text-text-faint"
          />
        </label>
      </form>

      {samples.length === 0 ? (
        <EmptyState
          icon={TestTube}
          title="No hay muestras registradas todavía."
          description="Registra la primera muestra para comenzar."
          action={
            <Link href="/laboratorio/muestras/nueva">
              <Button size="sm">
                <Plus className="size-4" /> Nueva muestra
              </Button>
            </Link>
          }
        />
      ) : (
        <>
          {/* Escritorio/tablet: tabla completa */}
          <div className="hidden overflow-x-auto rounded-lg border border-border sm:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-2 text-text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Código</th>
                  <th className="px-4 py-3 font-medium">Paciente</th>
                  <th className="px-4 py-3 font-medium">Tipo</th>
                  <th className="px-4 py-3 font-medium">Condición</th>
                  <th className="px-4 py-3 font-medium">Fecha</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium">
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {samples.map((s) => (
                  <tr key={s.id} className="bg-surface hover:bg-surface-2/60">
                    <td className="px-4 py-3 font-mono text-xs text-text-faint">{s.sample_code}</td>
                    <td className="px-4 py-3">
                      <Link href={`/laboratorio/pacientes/${s.patient_id}`} className="text-text hover:text-primary">
                        {s.patients ? `${s.patients.first_name} ${s.patients.last_name}` : "—"}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-text-muted">{s.sample_type}</td>
                    <td className="px-4 py-3 text-text-muted capitalize">{s.condition}</td>
                    <td className="px-4 py-3 text-text-muted">{formatSampleDate(s)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={s.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <SampleRowActions sampleId={s.id} status={s.status as SampleStatus} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Móvil: tarjetas, igual patrón que /laboratorio/pacientes */}
          <div className="flex flex-col gap-3 sm:hidden">
            {samples.map((s) => (
              <div key={s.id} className="rounded-lg border border-border bg-surface p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-mono text-xs text-text-faint">{s.sample_code}</p>
                    <Link
                      href={`/laboratorio/pacientes/${s.patient_id}`}
                      className="mt-0.5 block text-sm font-medium text-text hover:text-primary"
                    >
                      {s.patients ? `${s.patients.first_name} ${s.patients.last_name}` : "—"}
                    </Link>
                  </div>
                  <SampleRowActions sampleId={s.id} status={s.status as SampleStatus} />
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-muted">
                  <span>{s.sample_type}</span>
                  <span className="capitalize">{s.condition}</span>
                  <span>{formatSampleDate(s)}</span>
                </div>
                <div className="mt-2">
                  <StatusBadge status={s.status} />
                </div>
              </div>
            ))}
          </div>

          <Pagination page={currentPage} totalPages={totalPages} buildHref={buildHref} />
        </>
      )}
    </div>
  );
}
