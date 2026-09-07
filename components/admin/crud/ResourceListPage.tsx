"use client";

import Link from "next/link";
import { Plus, Search, Pencil } from "lucide-react";
import { getResourceConfig } from "@/lib/content/resourceConfigs";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { DeleteRecordButton } from "@/components/admin/crud/DeleteRecordButton";

interface ResourceListPageProps {
  resourceKey: string;
  rows: Record<string, unknown>[];
  searchQuery?: string;
}

const COLUMN_LABELS: Record<string, string> = {
  name: "Nombre",
  title: "Título",
  slug: "Slug",
  type: "Tipo",
  category: "Categoría",
  sample_type: "Tipo de muestra",
  is_active: "Estado",
};

export function ResourceListPage({ resourceKey, rows, searchQuery }: ResourceListPageProps) {
  const config = getResourceConfig(resourceKey);
  const Icon = config.icon;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-text">
            <Icon className="size-5 text-primary" /> {config.label}
          </h1>
          <p className="mt-1 text-sm text-text-muted">
            {rows.length} {rows.length === 1 ? "registro" : "registros"}
          </p>
        </div>
        <Link href={`${config.adminPath}/nuevo`}>
          <Button size="sm">
            <Plus className="size-4" /> Nuevo
          </Button>
        </Link>
      </div>

      <form className="max-w-md">
        <label className="flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 focus-within:border-primary">
          <Search className="size-4 text-text-muted" />
          <input
            type="search"
            name="q"
            defaultValue={searchQuery}
            placeholder={`Buscar ${config.label.toLowerCase()}…`}
            className="w-full bg-transparent text-sm outline-none placeholder:text-text-faint"
          />
        </label>
      </form>

      {rows.length === 0 ? (
        <EmptyState
          icon={Icon}
          title={`No hay ${config.label.toLowerCase()} registrados todavía.`}
          description="Crea el primer registro para empezar a construir la base de conocimiento."
          action={
            <Link href={`${config.adminPath}/nuevo`}>
              <Button size="sm">
                <Plus className="size-4" /> Agregar {config.labelSingular.toLowerCase()}
              </Button>
            </Link>
          }
        />
      ) : (
        <>
          {/* Vista de tabla — escritorio/tablet */}
          <div className="hidden overflow-x-auto rounded-lg border border-border sm:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-2 text-text-muted">
                <tr>
                  {config.listColumns.map((col) => (
                    <th key={col} className="px-4 py-3 font-medium">
                      {COLUMN_LABELS[col] ?? col}
                    </th>
                  ))}
                  <th className="px-4 py-3 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((row) => (
                  <tr key={String(row.id)} className="bg-surface hover:bg-surface-2/60">
                    {config.listColumns.map((col) => (
                      <td key={col} className="px-4 py-3 text-text">
                        {renderCell(row, col)}
                      </td>
                    ))}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`${config.adminPath}/${row.id}`}
                          className="rounded-md p-1.5 text-text-muted hover:bg-surface-2 hover:text-primary"
                          aria-label="Editar"
                        >
                          <Pencil className="size-4" />
                        </Link>
                        <DeleteRecordButton
                          resourceKey={resourceKey}
                          id={String(row.id)}
                          label={String(row[config.titleField] ?? "")}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Vista de tarjetas — móvil */}
          <div className="flex flex-col gap-3 sm:hidden">
            {rows.map((row) => (
              <div key={String(row.id)} className="rounded-lg border border-border bg-surface p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-text">
                    {String(row[config.titleField] ?? "")}
                  </p>
                  {renderCell(row, "is_active")}
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <Link href={`${config.adminPath}/${row.id}`}>
                    <Button variant="secondary" size="sm">
                      <Pencil className="size-3.5" /> Editar
                    </Button>
                  </Link>
                  <DeleteRecordButton
                    resourceKey={resourceKey}
                    id={String(row.id)}
                    label={String(row[config.titleField] ?? "")}
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

function renderCell(row: Record<string, unknown>, col: string) {
  if (col === "is_active") {
    return row.is_active ? (
      <Badge tone="success">Activo</Badge>
    ) : (
      <Badge tone="neutral">Inactivo</Badge>
    );
  }
  const value = row[col];
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}
