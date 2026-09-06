import { Users, Microscope, FlaskConical, FileStack } from "lucide-react";
import { getSession } from "@/lib/auth/getSession";
import { StatCard } from "@/components/admin/StatCard";
import { EmptyState } from "@/components/ui/EmptyState";

export default async function AdminPage() {
  const { profile } = await getSession();

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold text-text">Panel de administración</h1>
        <p className="mt-1 text-sm text-text-muted">
          Bienvenido, {profile?.full_name || "administrador"}.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Users} label="Usuarios registrados" value="—" />
        <StatCard icon={Microscope} label="Microorganismos" value="0" />
        <StatCard icon={FlaskConical} label="Medios de cultivo" value="0" />
        <StatCard icon={FileStack} label="Documentos" value="0" />
      </div>

      <div>
        <h2 className="text-sm font-semibold text-text">Contenido</h2>
        <div className="mt-3">
          <EmptyState
            title="La gestión de contenido llega en la Fase 2"
            description="Microorganismos, medios de cultivo, pruebas, procedimientos, análisis clínicos y documentos se administrarán desde aquí."
          />
        </div>
      </div>
    </div>
  );
}
