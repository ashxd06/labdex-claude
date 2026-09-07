import Link from "next/link";
import { Users, Plus, Search } from "lucide-react";
import { listPatients } from "@/lib/lab/queries";
import { calculateAge } from "@/lib/lab/shared";
import { Pagination } from "@/components/content/Pagination";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";

export const revalidate = 0;

export default async function PacientesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { q, page } = await searchParams;
  const currentPage = Number.parseInt(page ?? "1", 10) || 1;
  const { rows, total, totalPages } = await listPatients({ search: q, page: currentPage, pageSize: 20 });

  function buildHref(targetPage: number) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    params.set("page", String(targetPage));
    return `/laboratorio/pacientes?${params.toString()}`;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-text">
            <Users className="size-5 text-primary" /> Pacientes
          </h1>
          <p className="mt-1 text-sm text-text-muted">{total} registrados</p>
        </div>
        <Link href="/laboratorio/pacientes/nuevo">
          <Button size="sm">
            <Plus className="size-4" /> Nuevo paciente
          </Button>
        </Link>
      </div>

      <form className="max-w-sm">
        <label className="flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 focus-within:border-primary">
          <Search className="size-4 text-text-muted" />
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Buscar por nombre, documento o código…"
            className="w-full bg-transparent text-sm outline-none placeholder:text-text-faint"
          />
        </label>
      </form>

      {rows.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No hay pacientes registrados todavía."
          description="Registra tu primer paciente para comenzar."
          action={
            <Link href="/laboratorio/pacientes/nuevo">
              <Button size="sm">
                <Plus className="size-4" /> Nuevo paciente
              </Button>
            </Link>
          }
        />
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-lg border border-border sm:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-2 text-text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Código</th>
                  <th className="px-4 py-3 font-medium">Nombre</th>
                  <th className="px-4 py-3 font-medium">Documento</th>
                  <th className="px-4 py-3 font-medium">Edad</th>
                  <th className="px-4 py-3 font-medium">Sexo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((p) => (
                  <tr key={p.id} className="bg-surface hover:bg-surface-2/60">
                    <td className="px-4 py-3 font-mono text-xs text-text-faint">{p.internal_code}</td>
                    <td className="px-4 py-3">
                      <Link href={`/laboratorio/pacientes/${p.id}`} className="text-text hover:text-primary">
                        {p.first_name} {p.last_name}
                      </Link>
                      {p.is_demo && <span className="ml-2 text-xs text-warning">DEMO</span>}
                    </td>
                    <td className="px-4 py-3 text-text-muted">{p.document_id || "—"}</td>
                    <td className="px-4 py-3 text-text-muted">{calculateAge(p.birth_date) ?? "—"}</td>
                    <td className="px-4 py-3 text-text-muted">{p.sex ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 sm:hidden">
            {rows.map((p) => (
              <Link
                key={p.id}
                href={`/laboratorio/pacientes/${p.id}`}
                className="rounded-lg border border-border bg-surface p-4"
              >
                <p className="font-medium text-text">
                  {p.first_name} {p.last_name} {p.is_demo && <span className="text-xs text-warning">DEMO</span>}
                </p>
                <p className="mt-1 text-xs text-text-faint">{p.internal_code} · {p.document_id || "Sin documento"}</p>
              </Link>
            ))}
          </div>

          <Pagination page={currentPage} totalPages={totalPages} buildHref={buildHref} />
        </>
      )}
    </div>
  );
}
