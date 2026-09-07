import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
import type { LabReport, LabSettings, Patient, Sample } from "@/lib/supabase/labTypes";
import type { OrderItemWithDetails } from "@/lib/lab/queries";
import { calculateAge } from "@/lib/lab/shared";

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 10, fontFamily: "Helvetica", color: "#10151c" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
  labName: { fontSize: 16, fontWeight: 700 },
  labMeta: { fontSize: 9, color: "#4b5768", marginTop: 2 },
  logo: { width: 60, height: 60, objectFit: "contain" },
  reportTitle: { fontSize: 12, fontWeight: 700, textAlign: "right" },
  reportMeta: { fontSize: 9, color: "#4b5768", textAlign: "right", marginTop: 2 },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 700,
    marginTop: 14,
    marginBottom: 6,
    paddingBottom: 3,
    borderBottomWidth: 1,
    borderBottomColor: "#dde3ea",
  },
  row: { flexDirection: "row", marginBottom: 3 },
  label: { width: 110, color: "#4b5768" },
  value: { flex: 1, fontWeight: 500 },
  table: { marginTop: 4 },
  tableHeaderRow: { flexDirection: "row", backgroundColor: "#eef1f5", paddingVertical: 5, paddingHorizontal: 4 },
  tableRow: { flexDirection: "row", paddingVertical: 5, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: "#eef1f5" },
  colExam: { flex: 2.4 },
  colResult: { flex: 1.4 },
  colUnit: { flex: 1 },
  colRange: { flex: 1.8 },
  tableHeaderText: { fontWeight: 700, fontSize: 9 },
  footer: { position: "absolute", bottom: 24, left: 36, right: 36, fontSize: 8, color: "#8592a3", textAlign: "center" },
  signatureBlock: { marginTop: 40, flexDirection: "row", justifyContent: "space-between" },
  signatureLine: { borderTopWidth: 1, borderTopColor: "#10151c", marginTop: 40, paddingTop: 4, width: 200, textAlign: "center" },
  sealImage: { width: 70, height: 70, objectFit: "contain" },
});

export interface LabReportPdfProps {
  report: LabReport;
  settings: LabSettings;
  patient: Patient;
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
  sample,
  items,
  logoUrl,
  signatureUrl,
  sealUrl,
}: LabReportPdfProps) {
  const issuedDate = report.issued_at ?? report.created_at;

  return (
    <Document title={`LABDEX-${report.report_number}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
            {logoUrl && (
              // eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf/renderer Image (not next/image), no alt prop exists
              <Image src={logoUrl} style={styles.logo} />
            )}
            <View>
              <Text style={styles.labName}>{settings.lab_name}</Text>
              {settings.address && <Text style={styles.labMeta}>{settings.address}</Text>}
              {settings.phone && <Text style={styles.labMeta}>Tel: {settings.phone}</Text>}
              {settings.email && <Text style={styles.labMeta}>{settings.email}</Text>}
            </View>
          </View>
          <View>
            <Text style={styles.reportTitle}>INFORME DE RESULTADOS</Text>
            <Text style={styles.reportMeta}>N.º {report.report_number}</Text>
            <Text style={styles.reportMeta}>
              Emitido: {new Date(issuedDate).toLocaleDateString("es")}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>DATOS DEL PACIENTE</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Nombre completo</Text>
          <Text style={styles.value}>
            {patient.first_name} {patient.last_name}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Documento</Text>
          <Text style={styles.value}>{patient.document_id || "—"}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Edad</Text>
          <Text style={styles.value}>{calculateAge(patient.birth_date) ?? "—"}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Sexo</Text>
          <Text style={styles.value}>{patient.sex ?? "—"}</Text>
        </View>

        {sample && (
          <>
            <Text style={styles.sectionTitle}>DATOS DE LA MUESTRA</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Tipo de muestra</Text>
              <Text style={styles.value}>{sample.sample_type}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Código de muestra</Text>
              <Text style={styles.value}>{sample.sample_code}</Text>
            </View>
            {sample.collected_date && (
              <View style={styles.row}>
                <Text style={styles.label}>Fecha de toma</Text>
                <Text style={styles.value}>
                  {sample.collected_date} {sample.collected_time ?? ""}
                </Text>
              </View>
            )}
          </>
        )}

        <Text style={styles.sectionTitle}>RESULTADOS</Text>
        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.colExam, styles.tableHeaderText]}>Examen</Text>
            <Text style={[styles.colResult, styles.tableHeaderText]}>Resultado</Text>
            <Text style={[styles.colUnit, styles.tableHeaderText]}>Unidad</Text>
            <Text style={[styles.colRange, styles.tableHeaderText]}>Valores de referencia</Text>
          </View>
          {items.map((item) => (
            <View key={item.id} style={styles.tableRow}>
              <Text style={styles.colExam}>{item.clinical_analyses.name}</Text>
              <Text style={styles.colResult}>{item.lab_results?.result_value || "—"}</Text>
              <Text style={styles.colUnit}>{item.lab_results?.unit || "—"}</Text>
              <Text style={styles.colRange}>{item.lab_results?.reference_range_text || "—"}</Text>
            </View>
          ))}
        </View>

        {items.some((i) => i.lab_results?.observation) && (
          <>
            <Text style={styles.sectionTitle}>OBSERVACIONES</Text>
            {items
              .filter((i) => i.lab_results?.observation)
              .map((i) => (
                <Text key={i.id} style={{ marginBottom: 3 }}>
                  {i.clinical_analyses.name}: {i.lab_results?.observation}
                </Text>
              ))}
          </>
        )}

        <View style={styles.signatureBlock}>
          <View style={styles.signatureLine}>
            {signatureUrl && (
              // eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf/renderer Image (not next/image), no alt prop exists
              <Image src={signatureUrl} style={{ width: 100, height: 40, alignSelf: "center", marginBottom: -40 }} />
            )}
            <Text>{report.responsible_name || settings.responsible_name || "—"}</Text>
            <Text style={{ fontSize: 8, color: "#4b5768" }}>
              {report.responsible_title || settings.responsible_title || ""}
            </Text>
            <Text style={{ fontSize: 8, color: "#4b5768" }}>
              {report.responsible_license || settings.responsible_license || ""}
            </Text>
          </View>
          {sealUrl && (
            // eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf/renderer Image (not next/image), no alt prop exists
            <Image src={sealUrl} style={styles.sealImage} />
          )}
        </View>

        <Text style={styles.footer} fixed>
          {settings.lab_name} · Documento generado por LABDEX · {settings.website || ""}
        </Text>
      </Page>
    </Document>
  );
}
