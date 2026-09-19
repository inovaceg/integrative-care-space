import { professionalName, displayDate } from './documents';
import type { DocumentPage } from './document-layout';

type ReportRow = { label: string; before: string; after: string; variation: string };

export function bodyProgressReportPages(patientName: string, beforeDate: string, afterDate: string, rows: ReportRow[]): DocumentPage[] {
  const lines: DocumentPage = [
    { text: professionalName, x: 42, y: 58, size: 14, bold: true, color: '#123c3d' },
    { text: 'Relatório de Evolução Corporal', x: 42, y: 88, size: 18, bold: true, color: '#123c3d' },
    { text: `Paciente: ${patientName}`, x: 42, y: 116, size: 11, bold: true },
    { text: `Avaliações: ${displayDate(beforeDate)}  •  ${displayDate(afterDate)}`, x: 42, y: 136, size: 10, color: '#475569' },
    { text: 'Medida', x: 42, y: 178, size: 10, bold: true, color: '#21655f' },
    { text: 'Antes', x: 280, y: 178, size: 10, bold: true, color: '#21655f' },
    { text: 'Atual', x: 370, y: 178, size: 10, bold: true, color: '#21655f' },
    { text: 'Variação', x: 460, y: 178, size: 10, bold: true, color: '#21655f' },
  ];
  rows.forEach((row, index) => {
    const y = 202 + index * 24;
    lines.push(
      { text: row.label, x: 42, y, size: 9 },
      { text: row.before, x: 280, y, size: 9 },
      { text: row.after, x: 370, y, size: 9 },
      { text: row.variation, x: 460, y, size: 9 },
    );
  });
  return [lines];
}

export function bodyProgressReportFilename(patientName: string, beforeDate: string, afterDate: string) {
  const safe = `${patientName}-${beforeDate}-${afterDate}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
  return `relatorio-evolucao-corporal-${safe || 'paciente'}`;
}
