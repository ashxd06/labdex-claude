import { Microscope, FlaskConical, ClipboardCheck, Workflow, FileStack, Tags } from "lucide-react";
import { getSession } from "@/lib/auth/getSession";
import { countResourceRows } from "@/lib/content/queries";
import { StatCard } from "@/components/admin/StatCard";

export default async function AdminPage() {
  const { profile } = await getSession();

  const [categories, microorganisms, media, tests, procedures, analyses, documents] =
    await Promise.all([
      countResourceRows("categories"),
      countResourceRows("microorganisms"),
      countResourceRows("culture_media"),
      countResourceRows("laboratory_tests"),
      countResourceRows("procedures"),
      countResourceRows("clinical_analyses"),
      countResourceRows("documents"),
    ]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold text-text">Panel de administración</h1>
        <p className="mt-1 text-sm text-text-muted">
          Bienvenido, {profile?.full_name || "administrador"}.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Tags} label="Categorías" value={String(categories)} />
        <StatCard icon={Microscope} label="Microorganismos" value={String(microorganisms)} />
        <StatCard icon={FlaskConical} label="Medios de cultivo" value={String(media)} />
        <StatCard icon={ClipboardCheck} label="Pruebas" value={String(tests)} />
        <StatCard icon={Workflow} label="Procedimientos" value={String(procedures)} />
        <StatCard icon={FileStack} label="Análisis clínicos" value={String(analyses)} />
        <StatCard icon={FileStack} label="Documentos" value={String(documents)} />
      </div>

      <p className="text-sm text-text-faint">
        Estas cifras se obtienen directamente de Supabase en cada carga de la página; no son valores fijos.
      </p>
    </div>
  );
}
