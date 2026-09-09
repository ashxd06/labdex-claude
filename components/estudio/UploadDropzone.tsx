"use client";

import { useRef, useState, type DragEvent } from "react";
import { UploadCloud, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { MAX_FILE_BYTES, validateUploadFile } from "@/lib/estudio/storage";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface UploadDropzoneProps {
  onUpload: (file: File, title: string) => Promise<void>;
  uploading: boolean;
}

/**
 * Zona de subida de material (Fase 6, §4): permite arrastrar y soltar o
 * seleccionar un archivo, muestra nombre/tamaño y deja poner un nombre
 * personalizado al material (§6) antes de confirmar la subida.
 */
export function UploadDropzone({ onUpload, uploading }: UploadDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);

  function pickFile(file: File | undefined | null) {
    if (!file) return;
    const validationError = validateUploadFile({ type: file.type, size: file.size });
    if (validationError) {
      setError(validationError);
      setSelectedFile(null);
      return;
    }
    setError(null);
    setSelectedFile(file);
    setTitle((prev) => prev || file.name.replace(/\.pdf$/i, "").replace(/[_-]+/g, " ").trim());
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragActive(false);
    pickFile(event.dataTransfer.files?.[0]);
  }

  function handleReset() {
    setSelectedFile(null);
    setTitle("");
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleConfirm() {
    if (!selectedFile) return;
    await onUpload(selectedFile, title.trim() || selectedFile.name);
    handleReset();
  }

  return (
    <div>
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        className={`flex flex-col items-center gap-3 rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors
          ${dragActive ? "border-primary bg-primary-soft/40" : "border-border bg-surface"}`}
      >
        <UploadCloud className="size-8 text-text-faint" aria-hidden="true" />
        <div>
          <p className="text-sm font-medium text-text">Subir nuevo material</p>
          <p className="mt-1 text-sm text-text-muted">
            Arrastra tu PDF aquí o selecciona un archivo
          </p>
          <p className="mt-1 text-xs text-text-faint">
            PDF · apuntes · diapositivas · separatas · máximo {Math.round(MAX_FILE_BYTES / (1024 * 1024))} MB
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          Seleccionar archivo
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(event) => pickFile(event.target.files?.[0])}
        />
      </div>

      {error && <p className="mt-2 text-sm text-danger">{error}</p>}

      {selectedFile && (
        <div className="mt-4 rounded-lg border border-border bg-surface p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <FileText className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden="true" />
              <div>
                <p className="text-sm font-medium text-text">{selectedFile.name}</p>
                <p className="text-xs text-text-faint">{formatBytes(selectedFile.size)}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleReset}
              aria-label="Quitar archivo seleccionado"
              className="rounded-md p-1 text-text-faint hover:bg-surface-2 hover:text-text"
              disabled={uploading}
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="mt-4">
            <Input
              label="Nombre del material"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Ej. Microbiología — Bacterias Gram positivas"
              disabled={uploading}
            />
          </div>

          <Button
            type="button"
            className="mt-4"
            onClick={handleConfirm}
            loading={uploading}
            disabled={uploading}
          >
            {uploading ? "Procesando material…" : "Subir y procesar"}
          </Button>
        </div>
      )}
    </div>
  );
}
