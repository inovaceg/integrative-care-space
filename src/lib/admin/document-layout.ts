import { areaSpecialties, displayDate, professionalAreas, professionalName, type DocumentContent, type DocumentType, type ProfessionalArea } from './documents';

export type DocumentLine = { text: string; x: number; y: number; size: number; bold?: boolean; color?: string };
export type DocumentPage = DocumentLine[];
const width = 511;

function wrap(text: string, size: number, bold = false): string[] {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d')!;
  context.font = `${bold ? 'bold' : 'normal'} ${size}px Arial`;
  return text.replace(/\r/g, '').split('\n').flatMap(paragraph => {
    if (!paragraph) return [''];
    const lines: string[] = [];
    let line = '';
    for (const word of paragraph.split(/\s+/)) {
      if (context.measureText(line ? `${line} ${word}` : word).width <= width) { line = line ? `${line} ${word}` : word; continue; }
      if (line) lines.push(line);
      line = '';
      for (const char of word) {
        if (context.measureText(line + char).width > width) { lines.push(line); line = ''; }
        line += char;
      }
    }
    if (line) lines.push(line);
    return lines;
  });
}

export function layoutDocument(area: ProfessionalArea, type: DocumentType, content: DocumentContent, draft = false): DocumentPage[] {
  const identity = professionalAreas[area];
  const specialtyLines = areaSpecialties[area].flatMap(text => wrap(text, 10));
  const bodyStart = 119 + specialtyLines.length * 15;
  const pages: DocumentPage[] = [];
  let page: DocumentPage;
  let y = 0;
  function newPage() {
    page = [
      { text: professionalName.toUpperCase(), x: 42, y: 48, size: 15, bold: true, color: '#123c3d' },
      { text: `${identity.title} • ${identity.registration}`, x: 42, y: 70, size: 11 },
      ...specialtyLines.map((text, index) => ({ text, x: 42, y: 94 + index * 15, size: 10 })),
      { text: draft ? 'RASCUNHO • NÃO FINALIZADO' : '', x: 42, y: bodyStart - 17, size: 8, color: '#64748b' },
    ];
    pages.push(page);
    y = bodyStart;
  }
  function block(parts: { text: string; bold?: boolean; size?: number }[], gap = 13) {
    const lines = parts.flatMap(part => wrap(part.text, part.size ?? 11, part.bold).map(text => ({ text, bold: part.bold ?? false, size: part.size ?? 11 })));
    const height = lines.reduce((sum, line) => sum + line.size * 1.5, 0);
    // Keep complete items together unless the item is longer than one page.
    if (height <= 735 - bodyStart && y + height > 735) newPage();
    for (const line of lines) {
      if (y + line.size * 1.5 > 735) newPage();
      page.push({ ...line, x: 42, y });
      y += line.size * 1.5;
    }
    y += gap;
  }
  newPage();
  block([{ text: `PACIENTE: ${content.patient.name}`, bold: true }, { text: `DATA: ${displayDate(content.patient.date)}` }, ...(content.patient.cpf ? [{ text: `CPF: ${content.patient.cpf}` }] : []), ...(content.patient.birthDate ? [{ text: `Nascimento: ${displayDate(content.patient.birthDate)}` }] : []), ...(content.patient.phone ? [{ text: `Telefone: ${content.patient.phone}` }] : [])]);
  block([{ text: type.toUpperCase(), size: 14, bold: true }], 18);
  if (type === 'Receituário' && content.mode === 'structured') {
    content.items.forEach((item, i) => block([
      { text: `${i + 1}. ${item.product}`, bold: true },
      ...([['Apresentação', item.presentation], ['Concentração', item.concentration], ['Quantidade', item.quantity], ['Via de administração', item.route], ['USO', item.dosage], ['Duração do tratamento', item.duration], ['Observações', item.notes]]).filter(([, value]) => value).map(([label, value]) => ({ text: `${label}: ${value}` })),
    ]));
  } else if (type === 'Solicitação de Exames') {
    content.exams.forEach((exam, i) => block([{ text: `${i + 1}. ${exam.name}`, bold: true }, ...(exam.notes ? [{ text: exam.notes }] : [])]));
    if (content.clinicalNotes) block([{ text: 'OBSERVAÇÕES CLÍNICAS', bold: true }, { text: content.clinicalNotes }]);
  } else if (content.text) block([{ text: content.text }]);
  if (content.guidance) block([{ text: 'ORIENTAÇÕES ADICIONAIS', bold: true }, { text: content.guidance }]);
  if (y + 102 > 735) newPage();
  y = Math.max(y + 35, 642);
  block([{ text: '____________________________________' }, { text: professionalName, bold: true }, { text: identity.title }, { text: identity.registration }], 0);
  const footer = wrap(content.footer, 8);
  pages.forEach((p, index) => {
    footer.forEach((text, i) => p.push({ text, x: 42, y: 770 + i * 10, size: 8, color: '#64748b' }));
    p.push({ text: `${index + 1} / ${pages.length}`, x: 523, y: 825, size: 8, color: '#64748b' });
  });
  return pages;
}

export function documentFilename(type: DocumentType, content: DocumentContent) {
  const name = content.patient.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '');
  const prefix = type === 'Solicitação de Exames' ? 'Solicitacao_Exames' : type.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '_');
  return `${prefix}_${name}_${content.patient.date.split('-').reverse().join('-')}`;
}

// Standard PDF fonts use WinAnsi. Unsupported characters are rejected, never silently changed.
function pdfText(text: string) {
  const extra: Record<string, number> = { '€': 128, '‚': 130, 'ƒ': 131, '„': 132, '…': 133, '†': 134, '‡': 135, 'ˆ': 136, '‰': 137, 'Š': 138, '‹': 139, 'Œ': 140, 'Ž': 142, '‘': 145, '’': 146, '“': 147, '”': 148, '•': 149, '–': 150, '—': 151, '˜': 152, '™': 153, 'š': 154, '›': 155, 'œ': 156, 'ž': 158, 'Ÿ': 159 };
  let output = '';
  for (const char of text) {
    const code = extra[char] ?? char.charCodeAt(0);
    if (code > 255) throw new Error('Este texto contém caracteres especiais não suportados pelo PDF direto. Use Imprimir e escolha Salvar como PDF para preservá-los.');
    output += code.toString(16).padStart(2, '0');
  }
  return `<${output}>`;
}
export function downloadDocumentPdf(pages: DocumentPage[], filename: string) {
  const objects: string[] = ['', '', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>'];
  const kids: string[] = [];
  for (const lines of pages) {
    const pageId = objects.length + 1;
    const streamId = pageId + 1;
    kids.push(`${pageId} 0 R`);
    const stream = lines.map(line => {
      const hex = (line.color ?? '#17232d').slice(1);
      const color = [0, 2, 4].map(i => (parseInt(hex.slice(i, i + 2), 16) / 255).toFixed(3)).join(' ');
      return `BT /${line.bold ? 'F2' : 'F1'} ${line.size} Tf ${color} rg 1 0 0 1 ${line.x} ${842 - line.y} Tm ${pdfText(line.text)} Tj ET`;
    }).join('\n');
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${streamId} 0 R >>`, `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
  }
  objects[0] = '<< /Type /Catalog /Pages 2 0 R >>';
  objects[1] = `<< /Type /Pages /Count ${pages.length} /Kids [${kids.join(' ')}] >>`;
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, i) => { offsets.push(pdf.length); pdf += `${i + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map(offset => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  const url = URL.createObjectURL(new Blob([pdf], { type: 'application/pdf' }));
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = `${filename}.pdf`; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
