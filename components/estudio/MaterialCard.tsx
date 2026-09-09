"use client";

import Link from "next/link";
import { FileText, Trash2, AlertTriangle } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { STATUS_LABELS, STATUS_TONES } from "@/components/estudio/statusMeta";
import type { StudyMaterialSummaryView } from "@/lib/estudio/types";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" });
}

interface MaterialCardProps {
  material: StudyMaterialSummaryView;
  onDelete: (id: string) => void;
  deleting: boolean;
}

export function MaterialCard({ material, onDelete, deleting }: MaterialCardProps) {
  const isReady = material.status === "listo";
  const isProcessing = material.status === "subiendo" || material.status === "procesando";

  return (
    <Card className="flex flex-col">
      <CardBody className="flex flex-1 flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <FileText className="size-6 shrink-0 text-accent" aria-hidden="true" />
          <Badge tone={STATUS_TONES[material.status]}>{STATUS_LABELS[material.status]}</Badge>
        </div>

        <div>
          <p className="line-clamp-2 text-sm font-medium text-text">{material.title}</p>
          <p className="mt-1 text-xs text-text-faint">
            {material.pageCount ? `${material.pageCount} páginas` : material.originalFilename}
            {material.truncated ? " · procesado parcialmente" : ""}
          </p>
        </div>

        {material.status === "error" && material.errorMessage && (
          <p className="flex items-start gap-1.5 text-xs text-danger">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            {material.errorMessage}
          </p>
        )}

        <p className="text-xs text-text-faint">
          {material.lastStudiedAt
            ? `Último estudio: ${formatDate(material.lastStudiedAt)}`
            : `Subido: ${formatDate(material.createdAt)}`}
        </p>

        <div className="mt-auto flex items-center gap-2 pt-2">
          {isReady ? (
            <Link
              href={`/estudio/${material.id}`}
              className="flex-1 rounded-md bg-primary px-3 py-2 text-center text-sm font-medium text-white hover:bg-primary-hover"
            >
              Continuar estudiando
            </Link>
          ) : isProcessing ? (
            <span className="flex-1 rounded-md bg-surface-2 px-3 py-2 text-center text-sm text-text-muted">
              Procesando…
            </span>
          ) : (
            <span className="flex-1 rounded-md bg-surface-2 px-3 py-2 text-center text-sm text-text-muted">
              No disponible
            </span>
          )}
          <button
            type="button"
            onClick={() => onDelete(material.id)}
            disabled={deleting}
            aria-label={`Eliminar ${material.title}`}
            className="rounded-md p-2 text-text-faint hover:bg-danger-soft hover:text-danger disabled:opacity-50"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </CardBody>
    </Card>
  );
}
