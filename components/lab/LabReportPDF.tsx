import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
import type { LabOrder, LabReport, LabSettings, Patient, Sample } from "@/lib/supabase/labTypes";
import type { OrderItemWithDetails } from "@/lib/lab/queries";
import { calculateAge } from "@/lib/lab/shared";

/**
 * Informe PDF de laboratorio (Fase 4, §7 - rediseño completo).
 *
 * Cambios respecto a la versión anterior:
 * - Se agrega la columna "Interpretación" (bajo/normal/alto), que existía
 *   en la base de datos (`lab_results.flag`) pero nunca se mostraba en
 *   ningún lado, ni siquiera aquí.
 * - El sello ahora se superpone al bloque de firma en vez de aparecer como
 *   un recuadro suelto al costado - el sello se pinta primero (queda
 *   detrás) y la firma/nombre se pintan encima.
 * - Se agrega el médico solicitante y la fecha/condición de recepción de
 *   la muestra.
 * - Sexo se muestra en español (Masculino/Femenino/Otro) y, junto con
 *   Edad, solo aparece si el dato existe; nunca un "N/D" que no aporta nada.
 * - La etiqueta de fecha ya no dice siempre "Emitido": un informe en
 *   estado "borrador" no ha sido emitido todavía, y se marca como tal con
 *   un aviso visible, para no confundirlo con un documento oficial.
 *
 * Sigue usando @react-pdf/renderer (no se cambió de tecnología).
 */

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 10, fontFamily: "Helvetica", color: "#162433" },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#12344b",
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 15,
    marginBottom: 17,
  },
  brandBlock: { flexDirection: "row", alignItems: "center", width: "59%" },
  brandText: { flex: 1, minWidth: 0 },
  labName: { fontSize: 17, fontWeight: 700, color: "#ffffff" },
  labDescriptor: { fontSize: 7.5, fontWeight: 700, color: "#8ee0d0", marginTop: 2, letterSpacing: 0.7 },
  labMeta: { fontSize: 8, color: "#d4e1e8", marginTop: 2 },
  logo: { width: 52, height: 52, objectFit: "contain", marginRight: 10 },
  reportBlock: { width: "41%", alignItems: "flex-end" },
  reportEyebrow: { fontSize: 7.5, fontWeight: 700, color: "#8ee0d0", textAlign: "right", marginBottom: 3 },
  reportTitle: { fontSize: 11, fontWeight: 700, color: "#ffffff", textAlign: "right" },
  reportNumber: { fontSize: 12, fontWeight: 700, color: "#ffffff", textAlign: "right", marginTop: 5 },
  reportMeta: { fontSize: 8, color: "#d4e1e8", textAlign: "right", marginTop: 3 },
  draftBanner: {
    marginBottom: 14,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: "#c25b3f",
    borderStyle: "dashed",
    borderRadius: 4,
    textAlign: "center",
    fontSize: 8,
    fontWeight: 700,
    color: "#a33c29",
  },
  sectionTitle: {
    fontSize: 9.5,
    fontWeight: 700,
    color: "#173e58",
    marginTop: 13,
    marginBottom: 6,
    paddingBottom: 4,
    paddingLeft: 7,
    borderLeftWidth: 3,
    borderLeftColor: "#2ba994",
    borderBottomWidth: 1,
    borderBottomColor: "#dbe5eb",
    letterSpacing: 0.4,
  },
  row: { flexDirection: "row", marginBottom: 3 },
  label: { width: 110, color: "#536779" },
  value: { flex: 1, fontWeight: 500, color: "#182a3a" },
  table: { marginTop: 4 },
  tableHeaderRow: { flexDirection: "row", backgroundColor: "#eaf1f5", paddingVertical: 7 },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 7,
    paddingHorizontal: 0,
    backgroundColor: "#f8fafb",
    borderBottomWidth: 1,
    borderBottomColor: "#e4ebef",
  },
  tableCell: { minWidth: 0, flexShrink: 0, paddingHorizontal: 4, fontSize: 8.5, color: "#1d2d3b" },
  colExam: { width: "29%" },
  colResult: { width: "16%" },
  colUnit: { width: "12%" },
  colRange: { width: "25%" },
  colFlag: { width: "18%" },
  colResultValue: { fontWeight: 700, color: "#12344b" },
  tableHeaderText: { fontWeight: 700, fontSize: 8, color: "#2e4d62" },
  observationCard: { backgroundColor: "#f4f8fa", borderLeftWidth: 2, borderLeftColor: "#2ba994", padding: 8, marginBottom: 6 },
  observationName: { fontSize: 8, fontWeight: 700, color: "#536779", marginBottom: 2 },
  observationText: { fontSize: 9, color: "#1d2d3b" },
  footer: { position: "absolute", bottom: 22, left: 36, right: 36, fontSize: 7.5, color: "#7a8c99", textAlign: "center", borderTopWidth: 1, borderTopColor: "#e1e8ec", paddingTop: 5 },
  signatureBlock: { marginTop: 34, flexDirection: "row", justifyContent: "center" },
  signatureWrap: { position: "relative", width: 220, alignItems: "center" },
  sealBehind: { position: "absolute", bottom: -6, right: 4, width: 92, height: 92, objectFit: "contain", opacity: 0.88 },
  signatureImg: { width: 100, height: 38, alignSelf: "center" },
  signatureLine: {
    borderTopWidth: 1,
    borderTopColor: "#10151c",
    marginTop: 4,
    paddingTop: 4,
    width: 200,
    textAlign: "center",
  },
});

const SEX_LABELS: Record<string, string> = { M: "Masculino", F: "Femenino", otro: "Otro" };
const FLAG_LABELS: Record<string, { label: string; color: string }> = {
  alto: { label: "Alto", color: "#b3452f" },
  bajo: { label: "Bajo", color: "#a8791a" },
  normal: { label: "Normal", color: "#2f7a52" },
};

function flagDisplay(flag: string | null | undefined) {
  if (!flag || !FLAG_LABELS[flag]) return null;
  return FLAG_LABELS[flag];
}

export interface LabReportPdfProps {
  report: LabReport;
  settings: LabSettings;
  patient: Patient;
  order: LabOrder;
  sample: Sample | null;
  items: OrderItemWithDetails[];
  logoUrl?: string | null;
  signatureUrl?: string | null;
  sealUrl?: string | null;
}

export function LabReportPDF({
  report,
  settings,
  patient,
  order,
  sample,
  items,
  logoUrl,
  signatureUrl,
  sealUrl,
}: LabReportPdfProps) {
  const isIssued = report.status === "emitido";
  const isVoided = report.status === "anulado";
  const displayDate = report.issued_at ?? report.created_at;
  const age = calculateAge(patient.birth_date);
  const sexLabel = patient.sex ? SEX_LABELS[patient.sex] : null;

  return (
    <Document title={`LABDEX-${report.report_number}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View style={styles.brandBlock}>
            {logoUrl && (
              // eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf/renderer Image (not next/image), no alt prop exists
              <Image src={logoUrl} style={styles.logo} />
            )}
            <View style={styles.brandText}>
              <Text style={styles.labName}>{settings.lab_name}</Text>
              <Text style={styles.labDescriptor}>LABORATORIO CLÍNICO</Text>
              {settings.address && <Text style={styles.labMeta}>{settings.address}</Text>}
              {settings.phone && <Text style={styles.labMeta}>Tel: {settings.phone}</Text>}
              {settings.email && <Text style={styles.labMeta}>{settings.email}</Text>}
            </View>
          </View>
          <View style={styles.reportBlock}>
            <Text style={styles.reportEyebrow}>REPORTE DE LABORATORIO</Text>
            <Text style={styles.reportTitle}>INFORME DE RESULTADOS</Text>
            <Text style={styles.reportNumber}>N.º {report.report_number}</Text>
            <Text style={styles.reportMeta}>Solicitud: {order.order_code}</Text>
            <Text style={styles.reportMeta}>
              {isIssued ? "Emitido" : "Creado"}: {new Date(displayDate).toLocaleDateString("es")}
            </Text>
          </View>
        </View>

        {isVoided ? (
          <Text style={styles.draftBanner}>ANULADO - Documento no válido</Text>
        ) : !isIssued ? (
          <Text style={styles.draftBanner}>BORRADOR - Documento no válido como informe oficial hasta su emisión</Text>
        ) : null}

        <Text style={styles.sectionTitle}>DATOS DEL PACIENTE</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Nombre completo</Text>
          <Text style={styles.value}>
            {patient.first_name} {patient.last_name}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Documento</Text>
          <Text style={styles.value}>{patient.document_id || "N/D"}</Text>
        </View>
        {age !== null && (
          <View style={styles.row}>
            <Text style={styles.label}>Edad</Text>
            <Text style={styles.value}>{age}</Text>
          </View>
        )}
        {sexLabel && (
          <View style={styles.row}>
            <Text style={styles.label}>Sexo</Text>
            <Text style={styles.value}>{sexLabel}</Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>DATOS DE LA SOLICITUD</Text>
        <View style={styles.row}>
          <Text style={styles.label}>N.º de solicitud</Text>
          <Text style={styles.value}>{order.order_code}</Text>
        </View>
        {order.doctor_name && (
          <View style={styles.row}>
            <Text style={styles.label}>Médico solicitante</Text>
            <Text style={styles.value}>{order.doctor_name}</Text>
          </View>
        )}

        {sample && (
          <>
            <Text style={styles.sectionTitle}>DATOS DE LA MUESTRA</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Código de muestra</Text>
              <Text style={styles.value}>{sample.sample_code}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Tipo de muestra</Text>
              <Text style={styles.value}>{sample.sample_type}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Condición</Text>
              <Text style={styles.value}>{sample.condition}</Text>
            </View>
            {sample.collected_date && (
              <View style={styles.row}>
                <Text style={styles.label}>Fecha de toma</Text>
                <Text style={styles.value}>
                  {sample.collected_date} {sample.collected_time ?? ""}
                </Text>
              </View>
            )}
            {sample.received_date && (
              <View style={styles.row}>
                <Text style={styles.label}>Fecha de recepción</Text>
                <Text style={styles.value}>
                  {sample.received_date} {sample.received_time ?? ""}
                </Text>
              </View>
            )}
          </>
        )}

        <Text style={styles.sectionTitle}>RESULTADOS</Text>
        <View style={styles.table}>
          <View style={styles.tableHeaderRow} fixed>
            <Text style={[styles.tableCell, styles.colExam, styles.tableHeaderText]}>Examen</Text>
            <Text style={[styles.tableCell, styles.colResult, styles.tableHeaderText]}>Resultado</Text>
            <Text style={[styles.tableCell, styles.colUnit, styles.tableHeaderText]}>Unidad</Text>
            <Text style={[styles.tableCell, styles.colRange, styles.tableHeaderText]}>Valores de referencia</Text>
            <Text style={[styles.tableCell, styles.colFlag, styles.tableHeaderText]}>Interpretación</Text>
          </View>
          {items.map((item) => {
            const flag = flagDisplay(item.lab_results?.flag);
            const columnStyle = [styles.tableCell];
            return (
              <View key={item.id} style={styles.tableRow} wrap={false}>
                <Text style={[...columnStyle, styles.colExam]}>{item.clinical_analyses.name}</Text>
                <Text style={[...columnStyle, styles.colResult, styles.colResultValue]}>{item.lab_results?.result_value || "N/D"}</Text>
                <Text style={[...columnStyle, styles.colUnit]}>{item.lab_results?.unit || "N/D"}</Text>
                <Text style={[...columnStyle, styles.colRange]}>{item.lab_results?.reference_range_text || "N/D"}</Text>
                <Text style={[...columnStyle, styles.colFlag, flag ? { color: flag.color, fontWeight: 700 } : undefined]}>
                  {flag ? flag.label : "No calculada"}
                </Text>
              </View>
            );
          })}
        </View>

        {items.some((i) => i.lab_results?.observation) && (
          <>
            <Text style={styles.sectionTitle}>OBSERVACIONES</Text>
            {items
              .filter((i) => i.lab_results?.observation)
              .map((i) => (
                <View key={i.id} style={styles.observationCard}>
                  <Text style={styles.observationName}>{i.clinical_analyses.name}</Text>
                  <Text style={styles.observationText}>{i.lab_results?.observation}</Text>
                </View>
              ))}
          </>
        )}

        <View style={styles.signatureBlock} wrap={false}>
          <View style={styles.signatureWrap}>
            {sealUrl && (
              // eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf/renderer Image (not next/image), no alt prop exists
              <Image src={sealUrl} style={styles.sealBehind} />
            )}
            {signatureUrl && (
              // eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf/renderer Image (not next/image), no alt prop exists
              <Image src={signatureUrl} style={styles.signatureImg} />
            )}
            <View style={styles.signatureLine}>
              <Text>{report.responsible_name || settings.responsible_name || "N/D"}</Text>
              <Text style={{ fontSize: 8, color: "#4b5768" }}>
                {report.responsible_title || settings.responsible_title || ""}
              </Text>
              <Text style={{ fontSize: 8, color: "#4b5768" }}>
                {report.responsible_license || settings.responsible_license || ""}
              </Text>
            </View>
          </View>
        </View>

        <Text style={styles.footer} fixed>
          {settings.lab_name} · Documento generado por LABDEX · {settings.website || ""}
        </Text>
      </Page>
    </Document>
  );
}
