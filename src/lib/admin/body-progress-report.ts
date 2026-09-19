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

  // Professional identification stays below the 15-measure table and above the A4 footer area.
  lines.push(
    { text: professionalName, x: 42, y: 610, size: 11, bold: true, color: '#123c3d' },
    { text: 'Dr. em Psicanálise • Psicólogo Clínico • Biomédico Esteta e Integrativo', x: 42, y: 628, size: 8.5, color: '#475569' },
    { text: 'CRP 04/86194 • CRBM 30421', x: 42, y: 644, size: 9, bold: true, color: '#21655f' },
    { text: 'Telefone: (32) 9 9193-1779 | drfredmartins.com.br', x: 42, y: 674, size: 9, color: '#475569' },
    { text: 'Juiz de Fora – MG', x: 42, y: 691, size: 9, color: '#475569' },
  );
  return [lines];
}

export function bodyProgressReportFilename(patientName: string, beforeDate: string, afterDate: string) {
  const safe = `${patientName}-${beforeDate}-${afterDate}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
  return `relatorio-evolucao-corporal-${safe || 'paciente'}`;
}
