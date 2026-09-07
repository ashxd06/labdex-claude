"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type {
  RelationOption,
  LinkedMedia,
  LinkedTest,
  LinkedProcedure,
} from "@/lib/content/relations";
import {
  addMediaRelation,
  removeMediaRelation,
  addTestRelation,
  removeTestRelation,
  addProcedureRelation,
  removeProcedureRelation,
} from "@/lib/content/relations";

interface RelationsManagerProps {
  microorganismId: string;
  availableMedia: RelationOption[];
  availableTests: RelationOption[];
  availableProcedures: RelationOption[];
  linkedMedia: LinkedMedia[];
  linkedTests: LinkedTest[];
  linkedProcedures: LinkedProcedure[];
}

export function RelationsManager({
  microorganismId,
  availableMedia,
  availableTests,
  availableProcedures,
  linkedMedia,
  linkedTests,
  linkedProcedures,
}: RelationsManagerProps) {
  return (
    <div className="flex flex-col gap-6">
      <RelationSection
        title="Medios relacionados"
        emptyLabel="Sin medios de cultivo relacionados."
        available={availableMedia}
        linked={linkedMedia.map((m) => ({ id: m.id, name: m.name, extra: m.notes }))}
        onAdd={(id) => addMediaRelation(microorganismId, id, "")}
        onRemove={(id) => removeMediaRelation(microorganismId, id)}
      />
      <RelationSection
        title="Pruebas relacionadas"
        emptyLabel="Sin pruebas relacionadas."
        available={availableTests}
        linked={linkedTests.map((t) => ({
          id: t.id,
          name: t.name,
          extra: t.result_expected ? `Resultado esperado: ${t.result_expected}` : t.notes,
        }))}
        onAdd={(id) => addTestRelation(microorganismId, id, "", "")}
        onRemove={(id) => removeTestRelation(microorganismId, id)}
      />
      <RelationSection
        title="Procedimientos relacionados"
        emptyLabel="Sin procedimientos relacionados."
        available={availableProcedures}
        linked={linkedProcedures.map((p) => ({ id: p.id, name: p.name, extra: p.notes }))}
        onAdd={(id) => addProcedureRelation(microorganismId, id, "")}
        onRemove={(id) => removeProcedureRelation(microorganismId, id)}
      />
    </div>
  );
}

function RelationSection({
  title,
  emptyLabel,
  available,
  linked,
  onAdd,
  onRemove,
}: {
  title: string;
  emptyLabel: string;
  available: RelationOption[];
  linked: { id: string; name: string; extra?: string | null }[];
  onAdd: (id: string) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
}) {
  const [selected, setSelected] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleAdd() {
    if (!selected) return;
    startTransition(async () => {
      await onAdd(selected);
      setSelected("");
      router.refresh();
    });
  }

  function handleRemove(id: string) {
    startTransition(async () => {
      await onRemove(id);
      router.refresh();
    });
  }

  return (
    <div>
      <h3 className="text-sm font-semibold text-text">{title}</h3>

      {linked.length === 0 ? (
        <p className="mt-2 text-sm text-text-faint">{emptyLabel}</p>
      ) : (
        <div className="mt-2 flex flex-wrap gap-2">
          {linked.map((item) => (
            <span
              key={item.id}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-2 px-3 py-1 text-xs text-text"
              title={item.extra ?? undefined}
            >
              {item.name}
              <button
                onClick={() => handleRemove(item.id)}
                disabled={pending}
                aria-label={`Quitar ${item.name}`}
                className="text-text-faint hover:text-danger"
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {available.length > 0 ? (
        <div className="mt-3 flex items-center gap-2">
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="w-full max-w-xs rounded-md border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:border-primary"
          >
            <option value="">Seleccionar…</option>
            {available.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.name}
              </option>
            ))}
          </select>
          <Button variant="secondary" size="sm" onClick={handleAdd} loading={pending}>
            <Plus className="size-3.5" /> Vincular
          </Button>
        </div>
      ) : (
        <p className="mt-3 text-xs text-text-faint">
          No hay más registros disponibles para vincular.
        </p>
      )}
    </div>
  );
}
