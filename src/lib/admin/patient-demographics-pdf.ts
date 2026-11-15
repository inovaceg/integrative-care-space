import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
import type { PatientRecord } from "./records";
import { ageGroupCounts, ageOf, patientLocality } from "./patient-demographics";

export function downloadPatientDemographicsPdf(patients: PatientRecord[]) {
  (pdfMake as any).vfs = pdfFonts;
  const { counts, unknown } = ageGroupCounts(patients);
  const content: any[] = [
    { text: "DASHBOARD DEMOGRÁFICO DE PACIENTES", style: "title" },
    { text: `Gerado em ${new Date().toLocaleString("pt-BR")} · ${patients.length} paciente(s)`, style: "subtitle", margin: [0, 4, 0, 14] },
    { text: "Distribuição por faixa etária", style: "section" },
    { table: { headerRows: 1, widths: ["*", 80], body: [["Faixa etária", "Pacientes"], ...counts.map((item) => [item.label === "60+" ? "60 anos ou mais" : `${item.label} anos`, String(item.count)]), ["Idade não informada", String(unknown)]] }, layout: "lightHorizontalLines", margin: [0, 0, 0, 16] },
    { text: "Pacientes incluídos nos filtros", style: "section", margin: [0, 0, 0, 8] },
    { table: { headerRows: 1, widths: ["*", 55, 150, 90], body: [["Nome", "Idade", "Localidade", "Status"], ...patients.map((patient) => [patient.nome, ageOf(patient.data_nascimento) === null ? "—" : `${ageOf(patient.data_nascimento)} anos`, patientLocality(patient), patient.status || "Não informado"]) ] }, layout: "lightHorizontalLines", dontBreakRows: true },
    { text: "Confidencial — contém dados pessoais. Uso restrito ao atendimento.", style: "notice", margin: [0, 16, 0, 0] },
  ];
  const definition = {
    pageSize: "A4",
    pageMargins: [40, 42, 40, 42],
    defaultStyle: { font: "Roboto", fontSize: 9, color: "#334155" },
    styles: { title: { fontSize: 17, bold: true, color: "#123c3d" }, subtitle: { fontSize: 9, color: "#64748b" }, section: { fontSize: 11, bold: true, color: "#176b62", margin: [0, 0, 0, 8] }, notice: { fontSize: 8, color: "#64748b" } },
    footer: (page: number, pages: number) => ({ text: `${page} / ${pages}`, alignment: "right", margin: [0, 0, 40, 0], fontSize: 8, color: "#64748b" }),
    content,
  };
  pdfMake.createPdf(definition).download("dashboard-demografico-pacientes.pdf");
}
