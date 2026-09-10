import { NextResponse, type NextRequest } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getReportById, getOrderWithDetails, getLabSettings } from "@/lib/lab/queries";
import { getSignedLabAssetUrl } from "@/lib/lab/assets";
import { requireLabSession } from "@/lib/lab/shared";
import { LabReportPDF } from "@/components/lab/LabReportPDF";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireLabSession(`/laboratorio/informes/${id}/pdf`);

  const report = await getReportById(id);
  if (!report) {
    return NextResponse.json({ error: "Informe no encontrado" }, { status: 404 });
  }

  const [details, settings] = await Promise.all([getOrderWithDetails(report.order_id), getLabSettings()]);
  if (!details || !details.patient) {
    return NextResponse.json({ error: "Datos de la solicitud no disponibles" }, { status: 404 });
  }

  const [logoUrl, signatureUrl, sealUrl] = await Promise.all([
    getSignedLabAssetUrl(settings.logo_path),
    getSignedLabAssetUrl(settings.signature_path),
    getSignedLabAssetUrl(settings.seal_path),
  ]);

  const buffer = await renderToBuffer(
    <LabReportPDF
      report={report}
      settings={settings}
      patient={details.patient}
      order={details.order}
      sample={details.sample}
      items={details.items}
      logoUrl={logoUrl}
      signatureUrl={signatureUrl}
      sealUrl={sealUrl}
    />
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="LABDEX-${report.report_number.replace("LAB-", "")}.pdf"`,
    },
  });
}
