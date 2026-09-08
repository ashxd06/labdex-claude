import { Sparkles, CheckCircle2, XCircle, MessageSquare, Layers } from "lucide-react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient as createTypedClient } from "@/lib/supabase/server";
import { isGeminiConfigured, getGeminiModel } from "@/lib/labdex-ai/gemini/client";
import { Badge } from "@/components/ui/Badge";
import { StatCard } from "@/components/admin/StatCard";

/**
 * Panel de estado de LABDEX AI (Fase 5, §17).
 *
 * Solo muestra ESTADO, nunca la API key. Las estadísticas se obtienen a
 * través de `get_ai_usage_stats()` (ver supabase/schema_fase5.sql), una
 * función SECURITY DEFINER que agrega conteos sin exponer conversaciones ni
 * mensajes de usuarios concretos.
 */
export default async function AdminAiPage() {
  const configured = isGeminiConfigured();
  const model = getGeminiModel();

  const supabase = (await createTypedClient()) as unknown as SupabaseClient;
  const { data: stats, error: statsError } = await supabase.rpc("get_ai_usage_stats");

  const usage = Array.isArray(stats) ? stats[0] : stats;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold text-text">
          <Sparkles className="size-6 text-accent" aria-hidden="true" />
          LABDEX AI
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          Estado de la integración con Gemini y estadísticas generales de uso.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-surface p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {configured ? (
              <CheckCircle2 className="size-5 text-success" aria-hidden="true" />
            ) : (
              <XCircle className="size-5 text-danger" aria-hidden="true" />
            )}
            <div>
              <p className="font-medium text-text">Gemini</p>
              <p className="text-sm text-text-muted">
                {configured ? "Configurado" : "No configurado"}
              </p>
            </div>
          </div>
          <Badge tone={configured ? "success" : "danger"}>
            {configured ? "Disponible" : "No disponible"}
          </Badge>
        </div>

        <dl className="mt-5 grid grid-cols-1 gap-4 border-t border-border pt-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-text-faint">Modelo configurado</dt>
            <dd className="mt-0.5 font-mono text-text">{model}</dd>
          </div>
          <div>
            <dt className="text-text-faint">Variable de entorno requerida</dt>
            <dd className="mt-0.5 font-mono text-text">GEMINI_API_KEY</dd>
          </div>
        </dl>

        {!configured && (
          <p className="mt-4 rounded-md bg-warning-soft px-3 py-2 text-sm text-warning">
            Define <code className="font-mono">GEMINI_API_KEY</code> (y opcionalmente{" "}
            <code className="font-mono">GEMINI_MODEL</code>) en las variables de entorno del
            servidor para activar LABDEX AI. Nunca se debe usar el prefijo{" "}
            <code className="font-mono">NEXT_PUBLIC_</code> con esta clave.
          </p>
        )}
      </div>

      <div>
        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-text-faint">
          Uso general
        </p>
        {statsError ? (
          <p className="text-sm text-text-faint">
            No se pudieron cargar las estadísticas de uso.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <StatCard
              icon={Layers}
              label="Conversaciones totales"
              value={String(usage?.total_conversations ?? 0)}
            />
            <StatCard
              icon={MessageSquare}
              label="Mensajes totales"
              value={String(usage?.total_messages ?? 0)}
            />
          </div>
        )}
        <p className="mt-3 text-xs text-text-faint">
          Estos conteos son agregados: LABDEX AI nunca muestra aquí el contenido de las
          conversaciones de los usuarios.
        </p>
      </div>
    </div>
  );
}
