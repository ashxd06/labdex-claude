"use client";

import { useState } from "react";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/Button";

/** Botón del visor del documento (Fase 6, §21): pide una URL firmada bajo
 * demanda en vez de enlazar directamente a Storage. */
export function OpenOriginalButton({ materialId }: { materialId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  async function handleClick() {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(`/api/estudio/materials/${materialId}/file`);
      const json = await res.json();
      if (!res.ok || !json.url) throw new Error();
      window.open(json.url, "_blank", "noopener,noreferrer");
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant="secondary" size="sm" onClick={handleClick} loading={loading}>
        <ExternalLink className="size-4" />
        Ver documento original
      </Button>
      {error && <p className="text-xs text-danger">No se pudo abrir el archivo.</p>}
    </div>
  );
}
