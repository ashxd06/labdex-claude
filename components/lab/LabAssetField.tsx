"use client";

import { useActionState, useRef, useState } from "react";
import Image from "next/image";
import { Upload, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { uploadLabAsset, deleteLabAsset } from "@/lib/lab/assets";
import type { CrudActionState } from "@/lib/content/actions";

const initialState: CrudActionState = { status: "idle" };

export function LabAssetField({
  field,
  label,
  currentPath,
  currentUrl,
  disabled,
}: {
  field: "logo" | "signature" | "seal";
  label: string;
  currentPath: string | null;
  currentUrl: string | null;
  disabled?: boolean;
}) {
  const action = uploadLabAsset.bind(null, field);
  const [state, formAction, pending] = useActionState(action, initialState);
  const [deleting, setDeleting] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  async function handleDelete() {
    if (!currentPath) return;
    setDeleting(true);
    await deleteLabAsset(field, currentPath);
    setDeleting(false);
    window.location.reload();
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium text-text-muted">{label}</p>

      {currentPath && currentUrl ? (
        <div className="flex items-center gap-3 rounded-md border border-border bg-surface-2 p-3">
          <Image src={currentUrl} alt={label} width={64} height={64} unoptimized className="size-16 rounded-md object-contain bg-white" />
          {!disabled && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              aria-label={`Quitar ${label}`}
              className="ml-auto rounded-md p-1.5 text-text-muted hover:bg-danger-soft hover:text-danger disabled:opacity-50"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      ) : (
        !disabled && (
          <form ref={formRef} action={formAction} className="flex items-center gap-3">
            <label className="flex flex-1 cursor-pointer items-center gap-2 rounded-md border border-dashed border-border-strong bg-surface px-4 py-3 text-sm text-text-muted transition-colors hover:border-primary hover:text-primary">
              <Upload className="size-4" />
              <span>Arrastrar o seleccionar archivo…</span>
              <input
                type="file"
                name="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.length) formRef.current?.requestSubmit();
                }}
              />
            </label>
            <Button type="submit" variant="secondary" size="sm" loading={pending}>
              Subir
            </Button>
          </form>
        )
      )}

      {state.status === "error" && <p className="text-sm text-danger">{state.message}</p>}
      {!currentPath && disabled && <p className="text-sm text-text-faint">Sin archivo configurado.</p>}
    </div>
  );
}
