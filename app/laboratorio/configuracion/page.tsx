import { getLabSettings } from "@/lib/lab/queries";
import { getSignedLabAssetUrl } from "@/lib/lab/assets";
import { getSession } from "@/lib/auth/getSession";
import { isAdmin } from "@/lib/permissions";
import { LabSettingsForm } from "@/components/lab/LabSettingsForm";

export const revalidate = 0;

export default async function ConfiguracionPage() {
  const [settings, { profile }] = await Promise.all([getLabSettings(), getSession()]);

  const [logoUrl, signatureUrl, sealUrl] = await Promise.all([
    getSignedLabAssetUrl(settings.logo_path),
    getSignedLabAssetUrl(settings.signature_path),
    getSignedLabAssetUrl(settings.seal_path),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-text">Configuración del laboratorio</h1>
        <p className="mt-1 text-sm text-text-muted">
          Esta información se reutiliza automáticamente en todos los informes generados.
        </p>
      </div>
      <LabSettingsForm
        settings={settings}
        logoUrl={logoUrl}
        signatureUrl={signatureUrl}
        sealUrl={sealUrl}
        isAdmin={isAdmin(profile)}
      />
    </div>
  );
}
