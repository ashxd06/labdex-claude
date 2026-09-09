"use client";

import { useEffect, useState, useCallback } from "react";
import { GraduationCap, BookOpen } from "lucide-react";
import { Breadcrumbs } from "@/components/content/Breadcrumbs";
import { UploadDropzone } from "@/components/estudio/UploadDropzone";
import { ProcessingOverlay } from "@/components/estudio/ProcessingOverlay";
import { MaterialCard } from "@/components/estudio/MaterialCard";
import { Loading } from "@/components/ui/Loading";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import type { StudyMaterialSummaryView } from "@/lib/estudio/types";

export default function EstudioPage() {
  const [materials, setMaterials] = useState<StudyMaterialSummaryView[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadMaterials = useCallback(async () => {
    try {
      const res = await fetch("/api/estudio/materials");
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "No se pudieron cargar tus materiales.");
      setMaterials(data.materials);
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Ocurrió un error inesperado.");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/estudio/materials").catch(() => null);
      if (cancelled) return;
      if (!res || !res.ok) {
        const data = await res?.json().catch(() => null);
        setLoadError(data?.error || "No se pudieron cargar tus materiales.");
        return;
      }
      const data = await res.json();
      if (cancelled) return;
      setMaterials(data.materials);
      setLoadError(null);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleUpload(file: File, title: string) {
    setUploading(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", title);

      const res = await fetch("/api/estudio/materials", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "No pudimos procesar completamente este material.");
      await loadMaterials();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Ocurrió un error inesperado.");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/estudio/materials/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "No se pudo eliminar el material.");
      }
      setMaterials((prev) => (prev ? prev.filter((m) => m.id !== id) : prev));
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Ocurrió un error inesperado.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      <Breadcrumbs items={[{ label: "Inicio", href: "/" }, { label: "Estudio" }]} />

      <div className="mt-3 flex items-center gap-2">
        <GraduationCap className="size-6 text-accent" aria-hidden="true" />
        <h1 className="text-2xl font-semibold text-text">Hub de Estudio</h1>
      </div>
      <p className="mt-1 max-w-xl text-sm text-text-muted">
        Convierte tus apuntes en una experiencia de estudio personalizada. Sube un PDF y LABDEX lo
        analiza para ayudarte a comprenderlo, repasarlo y preguntarle directamente.
      </p>

      <div className="mt-8">
        <UploadDropzone onUpload={handleUpload} uploading={uploading} />
        {uploadError && <p className="mt-3 text-sm text-danger">{uploadError}</p>}
        {uploading && (
          <div className="mt-4">
            <ProcessingOverlay />
          </div>
        )}
      </div>

      <div className="mt-10">
        <h2 className="text-lg font-semibold text-text">Mis materiales</h2>

        {materials === null && !loadError && <Loading label="Cargando tus materiales…" />}

        {loadError && <ErrorState description={loadError} />}

        {materials !== null && materials.length === 0 && (
          <EmptyState
            icon={BookOpen}
            title="Todavía no has subido ningún material"
            description="Sube tu primer PDF para que LABDEX lo convierta en resumen, conceptos clave y un espacio de estudio."
          />
        )}

        {materials !== null && materials.length > 0 && (
          <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {materials.map((material) => (
              <MaterialCard
                key={material.id}
                material={material}
                onDelete={handleDelete}
                deleting={deletingId === material.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
