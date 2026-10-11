import { professionalName } from "./documents";
import type { DocumentPage } from "./document-layout";
import type { PatientApplication } from "./patient-applications";

type ApplicationReportRow = PatientApplication & { patientName: string; variation: number | null };

function displayDate(value: string) {
  return value ? value.slice(0, 10).split("-").reverse().join("/") : "—";
}

function centeredX(text: string, size: number, bold = false) {
  const width = text.length * size * (bold ? 0.58 : 0.54);
  return Math.max(30, (595 - width) / 2);
}


export function applicationReportPages(patientName: string, rows: ApplicationReportRow[]): DocumentPage[] {
  if (!rows.length) return [];
  const pages: DocumentPage[] = [];
  const perPage = 18;
  const first = rows[0]!;
  const last = rows.at(-1)!;

  for (let start = 0; start < rows.length; start += perPage) {
    const pageRows = rows.slice(start, start + perPage);
    const lines: DocumentPage = [
      { text: professionalName, x: 42, y: 58, size: 14, bold: true, color: "#123c3d" },
      { text: "Relatório de Aplicações e Histórico de Peso", x: 42, y: 88, size: 17, bold: true, color: "#123c3d" },
      { text: `Paciente: ${patientName}`, x: 42, y: 116, size: 11, bold: true },
      { text: `Período: ${displayDate(first.application_date)} a ${displayDate(last.application_date)} • ${rows.length} registro(s)`, x: 42, y: 136, size: 9, color: "#475569" },
      { text: "Data", x: 42, y: 178, size: 9, bold: true, color: "#21655f" },
      { text: "Procedimento", x: 105, y: 178, size: 9, bold: true, color: "#21655f" },
      { text: "Peso", x: 255, y: 178, size: 9, bold: true, color: "#21655f" },
      { text: "Variação", x: 315, y: 178, size: 9, bold: true, color: "#21655f" },
      { text: "Observações", x: 380, y: 178, size: 8, bold: true, color: "#21655f" },
    ];

    pageRows.forEach((row, index) => {
      const y = 202 + index * 27;
      const variation = row.variation === null ? "—" : `${row.variation > 0 ? "+" : ""}${row.variation.toFixed(2).replace(".", ",")} kg`;
      const notes = (row.notes ?? "—").trim() || "—";
      lines.push(
        { text: displayDate(row.application_date), x: 42, y, size: 8.5 },
        { text: row.procedure_name.slice(0, 18), x: 105, y, size: 8.5 },
        { text: `${Number(row.current_weight_kg).toFixed(2).replace(".", ",")} kg`, x: 255, y, size: 8.5 },
        { text: variation, x: 315, y, size: 8.5 },
        { text: notes.slice(0, 42), x: 380, y, size: 7.5, color: "#475569" },
      );
    });

    if (start === 0) {
      const initial = Number(rows[0]!.current_weight_kg);
      const current = Number(rows.at(-1)!.current_weight_kg);
      const variation = current - initial;
      lines.push({ text: `Peso inicial: ${initial.toFixed(2).replace(".", ",")} kg`, x: 42, y: 710, size: 9, color: "#475569" });
      lines.push({ text: `Peso atual: ${current.toFixed(2).replace(".", ",")} kg`, x: 210, y: 710, size: 9, color: "#475569" });
      lines.push({ text: `Variação total: ${variation > 0 ? "+" : ""}${variation.toFixed(2).replace(".", ",")} kg`, x: 380, y: 710, size: 9, bold: true, color: "#21655f" });
    }

    lines.push(
      { text: "Dr. Frederick Parreira • CRP 04/86194 • CRBM 30421", x: centeredX("Dr. Frederick Parreira • CRP 04/86194 • CRBM 30421", 8), y: 770, size: 8, color: "#475569" },
      { text: `Página ${Math.floor(start / perPage) + 1} de ${Math.ceil(rows.length / perPage)}`, x: 475, y: 815, size: 8, color: "#94a3b8" },
    );
    pages.push(lines);
  }
  return pages;
}

export function applicationReportFilename(patientName: string) {
  const safe = patientName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return `relatorio-aplicacoes-${safe || "paciente"}`;
}
