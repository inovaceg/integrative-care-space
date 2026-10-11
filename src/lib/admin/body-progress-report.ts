import { professionalName, displayDate } from './documents';
import type { DocumentPage } from './document-layout';

type ReportRow = { label: string; values: string[]; variation: string };

function centeredX(text: string, size: number, bold = false): number {
  let width = text.length * size * 0.55;
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (context) {
      context.font = `${bold ? 'bold' : 'normal'} ${size}px Arial`;
      width = context.measureText(text).width;
    }
  }
  return (595 - width) / 2;
}

export function bodyProgressReportPages(patientName: string, dates: string[], rows: ReportRow[]): DocumentPage[] {
  if (!dates.length) return [];
  const pages: DocumentPage[] = [];
  const perPage = 3;
  const pageCount = Math.ceil(dates.length / perPage);
  const firstDate = displayDate(dates[0]!);
  const lastDate = displayDate(dates[dates.length - 1]!);

  // Divide as datas em blocos para manter todas as avaliações legíveis em A4.
  for (let start = 0; start < dates.length; start += perPage) {
    const pageNumber = Math.floor(start / perPage) + 1;
    const columns = dates.slice(start, start + perPage);
    const lines: DocumentPage = [
      { text: professionalName, x: 42, y: 58, size: 14, bold: true, color: '#123c3d' },
      { text: 'Relatório de Evolução Corporal', x: 42, y: 88, size: 18, bold: true, color: '#123c3d' },
      { text: `Paciente: ${patientName}`, x: 42, y: 116, size: 11, bold: true },
      { text: `Período: ${firstDate} a ${lastDate} • ${dates.length} avaliação(ões)`, x: 42, y: 136, size: 10, color: '#475569' },
      { text: 'Variação total: último valor preenchido menos o primeiro, em todas as páginas.', x: 42, y: 154, size: 8, color: '#475569' },
      { text: 'Medida', x: 42, y: 182, size: 9, bold: true, color: '#21655f' },
      { text: 'Variação total', x: 475, y: 182, size: 8, bold: true, color: '#21655f' },
    ];
    columns.forEach((date, index) => {
      const x = 211 + index * 88;
      lines.push(
        { text: `${start + index + 1}ª avaliação`, x, y: 176, size: 8, bold: true, color: '#21655f' },
        { text: displayDate(date), x, y: 189, size: 8, color: '#475569' },
      );
    });
    rows.forEach((row, index) => {
      const y = 214 + index * 20;
      lines.push({ text: row.label, x: 42, y, size: 8.5 });
      columns.forEach((_, column) => {
        lines.push({ text: row.values[start + column] ?? '—', x: 211 + column * 88, y, size: 8 });
      });
      // Helvetica/WinAnsi aceita o hífen, mas não o sinal matemático U+2212.
      lines.push({ text: row.variation.replace(/−/g, '-'), x: 475, y, size: 8 });
    });
    lines.push({ text: '—: medida não informada ou avaliações insuficientes para calcular a variação.', x: 42, y: 578, size: 8, color: '#475569' });

    const professionalRole = 'Dr. em Psicanálise • Psicólogo Clínico • Biomédico Esteta e Integrativo';
    const registration = 'CRP 04/86194 • CRBM 30421';
    const contact = 'Telefone: (32) 9 9193-1779 | drfredmartins.com.br';
    const location = 'Juiz de Fora – MG';
    lines.push(
      { text: professionalName, x: centeredX(professionalName, 11, true), y: 610, size: 11, bold: true, color: '#123c3d' },
      { text: professionalRole, x: centeredX(professionalRole, 8.5), y: 628, size: 8.5, color: '#475569' },
      { text: registration, x: centeredX(registration, 9, true), y: 644, size: 9, bold: true, color: '#21655f' },
      { text: contact, x: centeredX(contact, 9), y: 674, size: 9, color: '#475569' },
      { text: location, x: centeredX(location, 9), y: 691, size: 9, color: '#475569' },
      { text: `Página ${pageNumber} de ${pageCount}`, x: 475, y: 725, size: 8, color: '#475569' },
    );
    pages.push(lines);
  }
  return pages;
}

export function bodyProgressReportFilename(patientName: string, beforeDate: string, afterDate: string) {
  const safe = `${patientName}-${beforeDate}-${afterDate}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
  return `relatorio-evolucao-corporal-${safe || 'paciente'}`;
}
