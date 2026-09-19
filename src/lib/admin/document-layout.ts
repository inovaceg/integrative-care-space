import { areaSpecialties, displayDate, professionalAreas, professionalName, type DocumentContent, type DocumentType, type ProfessionalArea } from './documents';
import { documentBrandPdf } from './document-brand';

export type DocumentLine = { text: string; x: number; y: number; size: number; bold?: boolean; color?: string; align?: 'left' | 'center' | 'right' };
export type DocumentPage = DocumentLine[];
const pageWidth = 595;
const width = 511;

function measureTextWidth(text: string, size: number, bold = false): number {
  if (typeof document === 'undefined') return text.length * size * 0.55;
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) return text.length * size * 0.55;
  context.font = `${bold ? 'bold' : 'normal'} ${size}px Arial`;
  return context.measureText(text).width;
}

function wrap(text: string, size: number, bold = false, maxW = width): string[] {
  if (typeof document === 'undefined') return [text];
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d')!;
  context.font = `${bold ? 'bold' : 'normal'} ${size}px Arial`;
  return text.replace(/\r/g, '').split('\n').flatMap(paragraph => {
    if (!paragraph) return [''];
    const lines: string[] = [];
    let line = '';
    for (const word of paragraph.split(/\s+/)) {
      if (context.measureText(line ? `${line} ${word}` : word).width <= maxW) { line = line ? `${line} ${word}` : word; continue; }
      if (line) lines.push(line);
      line = '';
      for (const char of word) {
        if (context.measureText(line + char).width > maxW) { lines.push(line); line = ''; }
        line += char;
      }
    }
    if (line) lines.push(line);
    return lines;
  });
}

function centeredX(text: string, size: number, bold = false): number {
  const measured = measureTextWidth(text, size, bold);
  return Math.max(20, Math.round((pageWidth - measured) / 2));
}

export function layoutDocument(area: ProfessionalArea, type: DocumentType, content: DocumentContent, draft = false): DocumentPage[] {
  const identity = professionalAreas[area];
  const specialtyLines = areaSpecialties[area].flatMap(text => wrap(text, 9.5, false, 511));
  
  // Header starts at y=56 (allowing space for the central logo icon at top y=22)
  // Header lines: Name (y=62), Title/Reg (y=78), Specialties (y=94+), divider line (y=...)
  const headerTextBottom = 96 + specialtyLines.length * 14;
  const bodyStart = headerTextBottom + 26;
  
  const pages: DocumentPage[] = [];
  let page: DocumentPage;
  let y = 0;

  function newPage() {
    page = [];
    
    // Header - Centralized with prominent typography
    const nameUpper = professionalName.toUpperCase();
    page.push({
      text: nameUpper,
      x: centeredX(nameUpper, 14, true),
      y: 62,
      size: 14,
      bold: true,
      color: '#123c3d',
      align: 'center',
    });

    const subTitle = `${identity.title}  •  ${identity.registration}`;
    page.push({
      text: subTitle,
      x: centeredX(subTitle, 10.5, true),
      y: 78,
      size: 10.5,
      bold: true,
      color: '#21655f',
      align: 'center',
    });

    specialtyLines.forEach((text, index) => {
      page.push({
        text,
        x: centeredX(text, 9, false),
        y: 94 + index * 13,
        size: 9,
        color: '#475569',
        align: 'center',
      });
    });

    if (draft) {
      const draftText = 'RASCUNHO • NÃO FINALIZADO';
      page.push({
        text: draftText,
        x: centeredX(draftText, 8, true),
        y: bodyStart - 12,
        size: 8,
        bold: true,
        color: '#94a3b8',
        align: 'center',
      });
    }

    pages.push(page);
    y = bodyStart;
  }

  function block(parts: { text: string; bold?: boolean; size?: number; align?: 'left' | 'center' }[], gap = 13) {
    const lines = parts.flatMap(part => wrap(part.text, part.size ?? 11, part.bold).map(text => ({ text, bold: part.bold ?? false, size: part.size ?? 11, align: part.align })));
    const height = lines.reduce((sum, line) => sum + line.size * 1.5, 0);
    if (height <= 735 - bodyStart && y + height > 730) newPage();
    for (const line of lines) {
      if (y + line.size * 1.5 > 730) newPage();
      const xPos = line.align === 'center' ? centeredX(line.text, line.size, line.bold) : 42;
      page.push({ ...line, x: xPos, y });
      y += line.size * 1.5;
    }
    y += gap;
  }

  newPage();

  // Patient info box / metadata
  block([
    { text: `PACIENTE: ${content.patient.name}`, bold: true },
    { text: `DATA: ${displayDate(content.patient.date)}` },
    ...(content.patient.cpf ? [{ text: `CPF: ${content.patient.cpf}` }] : []),
    ...(content.patient.birthDate ? [{ text: `Nascimento: ${displayDate(content.patient.birthDate)}` }] : []),
    ...(content.patient.phone ? [{ text: `Telefone: ${content.patient.phone}` }] : []),
  ], 16);

  // Document Title
  block([{ text: type.toUpperCase(), size: 13, bold: true }], 18);

  if (type === 'Receituário' && content.mode === 'structured') {
    content.items.forEach((item, i) => block([
      { text: `${i + 1}. ${item.product}`, bold: true },
      ...([['Apresentação', item.presentation], ['Concentração', item.concentration], ['Quantidade', item.quantity], ['Via de administração', item.route], ['USO', item.dosage], ['Duração do tratamento', item.duration], ['Observações', item.notes]]).filter(([, value]) => value).map(([label, value]) => ({ text: `${label}: ${value}` })),
    ]));
  } else if (type === 'Solicitação de Exames') {
    content.exams.forEach((exam, i) => block([{ text: `${i + 1}. ${exam.name}`, bold: true }, ...(exam.notes ? [{ text: exam.notes }] : [])]));
    if (content.clinicalNotes) block([{ text: 'OBSERVAÇÕES CLÍNICAS', bold: true }, { text: content.clinicalNotes }]);
  } else if (content.text) {
    block([{ text: content.text }]);
  }

  if (content.guidance) {
    block([{ text: 'ORIENTAÇÕES ADICIONAIS', bold: true }, { text: content.guidance }]);
  }

  // Signature Block (Centered)
  if (y + 90 > 725) newPage();
  y = Math.max(y + 30, 640);
  
  const signLine = '_____________________________________________';
  const signName = professionalName;
  const signTitle = identity.title;
  const signReg = identity.registration;

  page.push(
    { text: signLine, x: centeredX(signLine, 11, false), y, size: 11, color: '#64748b', align: 'center' },
    { text: signName, x: centeredX(signName, 11, true), y: y + 16, size: 11, bold: true, color: '#123c3d', align: 'center' },
    { text: signTitle, x: centeredX(signTitle, 9.5, false), y: y + 30, size: 9.5, color: '#475569', align: 'center' },
    { text: signReg, x: centeredX(signReg, 9.5, true), y: y + 43, size: 9.5, bold: true, color: '#21655f', align: 'center' }
  );

  // Footer - Centralized
  const footerLines = content.footer ? wrap(content.footer, 8, false, 511) : [];
  pages.forEach((p, index) => {
    footerLines.forEach((text, i) => {
      p.push({
        text,
        x: centeredX(text, 8, false),
        y: 775 + i * 11,
        size: 8,
        color: '#64748b',
        align: 'center',
      });
    });
    const pageNumber = `Página ${index + 1} de ${pages.length}`;
    p.push({
      text: pageNumber,
      x: centeredX(pageNumber, 7.5, false),
      y: 818,
      size: 7.5,
      color: '#94a3b8',
      align: 'center',
    });
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

export function downloadDocumentPdf(pages: DocumentPage[], filename: string, showBrand = false) {
  const objects: string[] = ['', '', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>'];
  const kids: string[] = [];
  
  for (const lines of pages) {
    const pageId = objects.length + 1;
    const streamId = pageId + 1;
    kids.push(`${pageId} 0 R`);
    
    // Draw decorative header elements in PDF stream
    // 1) Central emblem, optionally replaced by the prescription brand
    // 2) Top header separator line
    // 3) Footer separator line
    let drawCommands = `${showBrand ? documentBrandPdf : `q
0.184 0.561 0.510 rg
297.5 818 10 0 360 arc fill
1 1 1 rg
296 812 3 12 re fill
291.5 816.5 12 3 re fill
Q`}
q
0.82 0.88 0.86 RG
0.75 w
42 708 m 553 708 l S
42 75 m 553 75 l S
Q
`;

    const textStream = lines.map(line => {
      const hex = (line.color ?? '#17232d').slice(1);
      const color = [0, 2, 4].map(i => (parseInt(hex.slice(i, i + 2), 16) / 255).toFixed(3)).join(' ');
      return `BT /${line.bold ? 'F2' : 'F1'} ${line.size} Tf ${color} rg 1 0 0 1 ${line.x} ${842 - line.y} Tm ${pdfText(line.text)} Tj ET`;
    }).join('\n');

    const fullStream = drawCommands + '\n' + textStream;

    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${streamId} 0 R >>`,
      `<< /Length ${fullStream.length} >>\nstream\n${fullStream}\nendstream`
    );
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
