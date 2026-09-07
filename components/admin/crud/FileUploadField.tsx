"use client";

import { useActionState, useRef, useState } from "react";
import Image from "next/image";
import { Upload, X, FileText } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { uploadResourceFile, deleteResourceFile } from "@/lib/content/storage";
import { getPublicUrl } from "@/lib/content/publicUrl";
import type { CrudActionState } from "@/lib/content/actions";

const initialState: CrudActionState = { status: "idle" };

interface FileUploadFieldProps {
  resourceKey: string;
  id: string;
  fieldKey: string;
  label: string;
  hint?: string;
  bucket: string;
  currentPath: string | null;
}

export function FileUploadField({
  resourceKey,
  id,
  fieldKey,
  label,
  hint,
  bucket,
  currentPath,
}: FileUploadFieldProps) {
  const action = uploadResourceFile.bind(null, resourceKey, id, fieldKey);
  const [state, formAction, pending] = useActionState(action, initialState);
  const [deleting, setDeleting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const url = getPublicUrl(bucket, currentPath);
  const isImage = bucket !== "documents" || /\.(png|jpe?g|webp)$/i.test(currentPath ?? "");

  async function handleDelete() {
    if (!currentPath) return;
    setDeleting(true);
    setLocalError(null);
    const result = await deleteResourceFile(resourceKey, id, fieldKey, currentPath);
    setDeleting(false);
    if (result.status === "error") {
      setLocalError(result.message ?? "No se pudo eliminar el archivo.");
    } else {
      formRef.current?.reset();
      window.location.reload();
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium text-text-muted">{label}</p>
      {hint && <p className="-mt-1 text-sm text-text-faint">{hint}</p>}

      {currentPath && url ? (
        <div className="flex items-center gap-3 rounded-md border border-border bg-surface-2 p-3">
          {isImage ? (
            <Image
              src={url}
              alt={label}
              width={64}
              height={64}
              className="size-16 rounded-md object-cover"
              unoptimized
            />
          ) : (
            <FileText className="size-8 text-text-muted" />
          )}
          <div className="min-w-0 flex-1">
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="truncate text-sm text-primary hover:text-primary-hover"
            >
              Ver archivo actual
            </a>
          </div>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            aria-label="Eliminar archivo"
            className="rounded-md p-1.5 text-text-muted hover:bg-danger-soft hover:text-danger disabled:opacity-50"
          >
            <X className="size-4" />
          </button>
        </div>
      ) : (
        <form ref={formRef} action={formAction} className="flex items-center gap-3">
          <label className="flex flex-1 cursor-pointer items-center gap-2 rounded-md border border-dashed border-border-strong bg-surface px-4 py-3 text-sm text-text-muted transition-colors hover:border-primary hover:text-primary">
            <Upload className="size-4" />
            <span>Arrastrar o seleccionar archivo…</span>
            <input
              type="file"
              name="file"
              accept={bucket === "documents" ? "image/png,image/jpeg,image/webp,application/pdf" : "image/png,image/jpeg,image/webp"}
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
      )}

      {(state.status === "error" || localError) && (
        <p className="text-sm text-danger">{localError ?? state.message}</p>
      )}
    </div>
  );
}
