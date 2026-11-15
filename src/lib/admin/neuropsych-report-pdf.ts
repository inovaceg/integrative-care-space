import type { DocumentLine, DocumentPage } from '@/lib/admin/document-layout';

const left = 42;
const bodyWidth = 511;
const headerTop = 28;
const headerBottom = 156;
const footerTop = 752;
const maxBodyY = 730;

function wrapText(text: string, maxChars = 92) {
  return text.replace(/\r/g, '').split('\n').flatMap((paragraph) => {
    if (!paragraph) return [''];
    const words = paragraph.split(/\s+/);
    const lines: string[] = [];
    let line = '';
    for (const word of words) {
      if (!line || `${line} ${word}`.length <= maxChars) {
        line = line ? `${line} ${word}` : word;
      } else {
        lines.push(line);
        line = word;
      }
    }
    if (line) lines.push(line);
    return lines;
  });
}

function headerCard(patientName: string, birthDate: string | null, reportTitle: string, emittedAt: string, draft: boolean): DocumentLine[] {
  const bottom = 842 - headerTop - (headerBottom - headerTop);
  const top = 842 - headerTop;
  const path = `58 ${bottom} m 537 ${bottom} l 546 ${bottom} 553 ${bottom + 7} 553 ${bottom + 16} c 553 ${top - 16} l 553 ${top - 7} 546 ${top} 537 ${top} c 58 ${top} l 49 ${top} 42 ${top - 7} 42 ${top - 16} c 42 ${bottom + 16} l 42 ${bottom + 7} 49 ${bottom} 58 ${bottom} c h`;
  return [
    { text: '', x: left, y: headerTop, size: 0, color: '#123c3d', kind: 'path', pdfPath: path },
    { text: `${draft ? 'RASCUNHO · ' : ''}LAUDO NEUROPSICOLÓGICO · ${emittedAt}`, x: 62, y: 58, size: 9, bold: true, color: '#a5e2d7' },
    { text: reportTitle, x: 62, y: 91, size: 22, bold: true, color: '#ffffff' },
    { text: patientName.toLocaleUpperCase('pt-BR'), x: 62, y: 119, size: 13, bold: true, color: '#ffffff' },
    { text: `Nascimento: ${birthDate || 'não informado'}`, x: 62, y: 143, size: 9.5, color: '#d7eeea' },
  ];
}

export function buildNeuropsychReportPages(input: {
  patientName: string;
  birthDate: string | null;
  reportTitle: string;
  emittedAt: string;
  draft: boolean;
  sections: [string, string][];
  linkedAssessments: { title: string; age_group: string; status: string; instruments: string[]; intake: Record<string, string> }[];
  sessions: { session_date: string; notes: string }[];
  result: { instrument_name: string; application_date: string; version: string; raw_score: string; standardized_score: string; percentile: string; classification: string; qualitative_notes: string; conditions: string } | null;
}): DocumentPage[] {
  const pages: DocumentPage[] = [];
  let page: DocumentPage = [];
  let y = 184;

  function startPage() {
    page = headerCard(input.patientName, input.birthDate, input.reportTitle, input.emittedAt, input.draft);
    pages.push(page);
    y = 184;
  }

  function addLine(text: string, options: { size?: number; bold?: boolean; color?: string; x?: number; maxChars?: number } = {}) {
    const size = options.size ?? 9.5;
    for (const part of wrapText(text, options.maxChars ?? 92)) {
      if (y + size * 1.55 > maxBodyY) startPage();
      page.push({ text: part, x: options.x ?? left, y, size, bold: options.bold ?? false, color: options.color ?? '#334155' });
      y += size * 1.55;
    }
  }

  startPage();
  for (const [heading, body] of input.sections) {
    if (y + 45 > maxBodyY) startPage();
    y += 5;
    addLine(heading, { size: 12, bold: true, color: '#123c3d', maxChars: 72 });
    addLine(body || 'Não informado.');
    y += 7;
  }
  for (const assessment of input.linkedAssessments) {
    if (y + 45 > maxBodyY) startPage();
    y += 5;
    addLine(`AVALIAÇÃO VINCULADA · ${assessment.title} · ${assessment.age_group} · ${assessment.status}`, { size: 11, bold: true, color: '#123c3d', maxChars: 82 });
    addLine(`Bateria selecionada: ${assessment.instruments.join(', ') || 'não informada'}`);
    for (const [key, value] of Object.entries(assessment.intake)) if (value) addLine(`${key}: ${value}`);
    y += 7;
  }
  if (input.sessions.length) {
    addLine('SESSÕES DE AVALIAÇÃO', { size: 11, bold: true, color: '#123c3d' });
    for (const session of input.sessions) addLine(`${session.session_date}: ${session.notes || 'sem observações registradas'}`);
  }
  if (input.result?.instrument_name) {
    const result = input.result;
    addLine('RESULTADO REGISTRADO MANUALMENTE', { size: 11, bold: true, color: '#123c3d' });
    addLine(`Instrumento: ${result.instrument_name} · Data: ${result.application_date || 'não informada'} · Versão: ${result.version || 'não informada'}`);
    addLine(`Escore bruto: ${result.raw_score || '—'} · Escore padronizado: ${result.standardized_score || '—'} · Percentil: ${result.percentile || '—'}`);
    addLine(`Classificação conforme manual: ${result.classification || '—'}`);
    if (result.qualitative_notes) addLine(`Observações: ${result.qualitative_notes}`);
    if (result.conditions) addLine(`Condições de aplicação: ${result.conditions}`);
  }

  pages.forEach((currentPage, index) => {
    currentPage.push(
      { text: '', x: left, y: footerTop, size: 0, kind: 'rule', color: '#d9e4e1', width: bodyWidth },
      { text: 'Dr. Frederick Martins Parreira', x: left, y: 778, size: 9, bold: true, color: '#123c3d' },
      { text: 'CRP 04/86194 · CRBM 30421 · Juiz de Fora – MG', x: left, y: 794, size: 8, color: '#64748b' },
      { text: 'Documento confidencial · Elaborado e revisado pelo profissional responsável.', x: left, y: 810, size: 7.5, color: '#64748b' },
      { text: `Página ${index + 1} de ${pages.length}`, x: left + bodyWidth - 72, y: 810, size: 7.5, color: '#64748b', align: 'right' },
    );
  });
  return pages;
}

export function neuropsychReportFilename(patientName: string) {
  const safe = patientName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase();
  return `laudo-neuropsicologico-${safe || 'paciente'}`;
}

export const neuropsychReportLayout = { bodyWidth, headerTop, headerBottom };
  