"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { deleteRecord } from "@/lib/content/actions";

export function DeleteRecordButton({
  resourceKey,
  id,
  label,
}: {
  resourceKey: string;
  id: string;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function handleConfirm() {
    startTransition(async () => {
      const result = await deleteRecord(resourceKey, id);
      if (result.status === "error") {
        setError(result.message ?? "No se pudo eliminar.");
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Eliminar"
        className="rounded-md p-1.5 text-text-muted hover:bg-danger-soft hover:text-danger"
      >
        <Trash2 className="size-4" />
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Confirmar eliminación">
        <p className="text-sm text-text-muted">
          ¿Eliminar <span className="font-medium text-text">{label || "este registro"}</span>?
          Esta acción no se puede deshacer.
        </p>
        {error && <p className="mt-2 text-sm text-danger">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button variant="danger" size="sm" loading={pending} onClick={handleConfirm}>
            Eliminar
          </Button>
        </div>
      </Modal>
    </>
  );
}
