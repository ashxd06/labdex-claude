import Link from "next/link";
import { Microscope, Plus, Search } from "lucide-react";
import { listResourceRows } from "@/lib/content/queries";
import { MICROORGANISM_KIND_OPTIONS } from "@/lib/content/resourceConfigs";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { DeleteRecordButton } from "@/components/admin/crud/DeleteRecordButton";
import { Pencil } from "lucide-react";
import type { Microorganism } from "@/lib/supabase/types";

const KIND_LABELS: Record<string, string> = Object.fromEntries(
  MICROORGANISM_KIND_OPTIONS.map((o) => [o.value, o.label])
);

export default async function MicroorganismosAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; kind?: string }>;
}) {
  const { q, kind } = await searchParams;

  const rows = await listResourceRows<Microorganism>("microorganisms", {
    search: q,
    searchColumns: ["scientific_name", "common_name", "slug"],
    kind: kind && kind !== "todos" ? kind : undefined,
    orderBy: "scientific_name",
    ascending: true,
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-text">
            <Microscope className="size-5 text-primary" /> Microorganismos
          </h1>
          <p className="mt-1 text-sm text-text-muted">
            {rows.length} {rows.length === 1 ? "registro" : "registros"}
          </p>
        </div>
        <Link href="/admin/microorganismos/nuevo">
          <Button size="sm">
            <Plus className="size-4" /> Nuevo
          </Button>
        </Link>
      </div>

      <form className="flex flex-wrap items-center gap-3">
        <label className="flex w-full max-w-sm items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 focus-within:border-primary">
          <Search className="size-4 text-text-muted" />
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Buscar microorganismo…"
            className="w-full bg-transparent text-sm outline-none placeholder:text-text-faint"
          />
        </label>
        <select
          name="kind"
          defaultValue={kind ?? "todos"}
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:border-primary"
        >
          <option value="todos">Todos</option>
          {MICROORGANISM_KIND_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}s
            </option>
          ))}
        </select>
        <Button type="submit" variant="secondary" size="sm">
          Filtrar
        </Button>
      </form>

      {rows.length === 0 ? (
        <EmptyState
          icon={Microscope}
          title="No hay microorganismos registrados todavía."
          description="Crea el primer microorganismo para empezar a construir la base de conocimiento."
          action={
            <Link href="/admin/microorganismos/nuevo">
              <Button size="sm">
                <Plus className="size-4" /> Agregar microorganismo
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
                  <th className="px-4 py-3 font-medium">Nombre científico</th>
                  <th className="px-4 py-3 font-medium">Tipo</th>
                  <th className="px-4 py-3 font-medium">Gram</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 text-right font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((row) => (
                  <tr key={row.id} className="bg-surface hover:bg-surface-2/60">
                    <td className="px-4 py-3">
                      <p className="font-medium uppercase tracking-wide text-text">
                        {row.scientific_name}
                      </p>
                      {row.is_sample_data && (
                        <Badge tone="warning">Dato de prueba</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-text-muted">{KIND_LABELS[row.kind] ?? row.kind}</td>
                    <td className="px-4 py-3 text-text-muted">{row.gram_stain || "—"}</td>
                    <td className="px-4 py-3">
                      {row.is_active ? (
                        <Badge tone="success">Activo</Badge>
                      ) : (
                        <Badge tone="neutral">Inactivo</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/admin/microorganismos/${row.id}`}
                          className="rounded-md p-1.5 text-text-muted hover:bg-surface-2 hover:text-primary"
                          aria-label="Editar"
                        >
                          <Pencil className="size-4" />
                        </Link>
                        <DeleteRecordButton
                          resourceKey="microorganisms"
                          id={row.id}
                          label={row.scientific_name}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 sm:hidden">
            {rows.map((row) => (
              <div key={row.id} className="rounded-lg border border-border bg-surface p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium uppercase tracking-wide text-text">
                      {row.scientific_name}
                    </p>
                    <p className="text-xs text-text-faint">{KIND_LABELS[row.kind] ?? row.kind}</p>
                  </div>
                  {row.is_active ? (
                    <Badge tone="success">Activo</Badge>
                  ) : (
                    <Badge tone="neutral">Inactivo</Badge>
                  )}
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <Link href={`/admin/microorganismos/${row.id}`}>
                    <Button variant="secondary" size="sm">
                      <Pencil className="size-3.5" /> Editar
                    </Button>
                  </Link>
                  <DeleteRecordButton
                    resourceKey="microorganisms"
                    id={row.id}
                    label={row.scientific_name}
                  />
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
