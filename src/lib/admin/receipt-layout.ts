import type { DocumentLine, DocumentPage } from './document-layout';
import { documentBrand } from './document-brand';
import { displayDate } from './documents';
import { receiptMoney, type Receipt } from './receipts';
import { formatReceiptCpf, receiptAmountInWords } from './receipt-format';

const colors = { dark: '#163f3b', green: '#2c5f4f', soft: '#eef4ef', gold: '#b08d57', ink: '#263c37', muted: '#52635c', border: '#dbe5dd' };

// Converts the original logo and receipt cards to identical vector geometry in both renderers.
function vector(raw: string, color: string, x = 0, y = 0, scale = 1, strokeWidth?: number): DocumentLine {
  let path = '';
  let pdfPath = '';
  for (const match of raw.matchAll(/([MLCZ])([^MLCZ]*)/g)) {
    const command = match[1];
    const values = (match[2].match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
    const points = values.map((value, index) => value * scale + (index % 2 ? y : x));
    path += `${command} ${points.join(' ')} `;
    pdfPath += `${points.map((value, index) => index % 2 ? 842 - value : value).join(' ')} ${command === 'Z' ? 'h' : command.toLowerCase()} `;
  }
  return { text: '', kind: 'path', x, y, size: 0, color, path, pdfPath, strokeWidth };
}

export function layoutReceipt(receipt: Receipt): DocumentPage[] {
  const context = typeof document === 'undefined' ? null : document.createElement('canvas').getContext('2d');
  const measure = (value: string, size: number, bold = false) => {
    if (context) { context.font = `${bold ? 'bold' : 'normal'} ${size}px Arial`; return context.measureText(value).width; }
    return value.length * size * 0.55;
  };
  function wrap(value: string, size: number, width = 475, bold = false): string[] {
    return value.replace(/\r/g, '').split('\n').flatMap(paragraph => {
      const lines: string[] = [];
      let line = '';
      for (const word of paragraph.trim().split(/\s+/)) {
        if (measure(line ? `${line} ${word}` : word, size, bold) <= width) { line = line ? `${line} ${word}` : word; continue; }
        if (line) lines.push(line);
        line = '';
        for (const char of word) {
          if (line && measure(line + char, size, bold) > width) { lines.push(line); line = ''; }
          line += char;
        }
      }
      lines.push(line);
      return lines;
    });
  }

  const headerTokens = new Set([receipt.professional_name, ...receipt.professional_title.split('•')].map(value => value.trim().toLocaleLowerCase('pt-BR')));
  const footerParts = receipt.footer.split(/\r?\n/).map(line => line.split('•').map(value => value.trim()).filter(value => value && !headerTokens.has(value.toLocaleLowerCase('pt-BR'))).join(' • ')).filter(Boolean);
  if (!footerParts.some(line => line.includes(receipt.professional_registration))) footerParts.unshift(receipt.professional_registration);
  const footerAll = [...new Set(footerParts)].flatMap(value => wrap(value, 9, 487));
  // Unusually long custom footers flow with the content, never shrink into unreadable text.
  const extendedFooter = footerAll.length > 6;
  const footerLines = extendedFooter ? wrap(receipt.professional_registration, 9, 487) : footerAll;
  const footerTop = 800 - footerLines.length * 13;
  const contentBottom = footerTop - 20;
  const declaration = wrap('Declaro o recebimento do valor acima, referente ao serviço descrito neste recibo.', 9.5, 511);
  const location = wrap(`${receipt.city}, ${displayDate(receipt.issue_date)}.`, 10, 511);
  const signHeight = declaration.length * 13 + location.length * 14 + 125;
  const pages: DocumentPage[] = [];
  let page: DocumentPage = [];
  let y = 0;

  function text(value: string, x: number, baseline: number, size = 11, bold = false, color = colors.ink) {
    page.push({ text: value, x, y: baseline, size, bold, color });
  }
  function centered(value: string, baseline: number, size: number, bold = false, color = colors.ink) {
    text(value, (595 - measure(value, size, bold)) / 2, baseline, size, bold, color);
  }
  function box(x: number, top: number, width: number, height: number, color: string) {
    const r = 8;
    page.push(vector(`M ${x + r} ${top} L ${x + width - r} ${top} C ${x + width} ${top} ${x + width} ${top} ${x + width} ${top + r} L ${x + width} ${top + height - r} C ${x + width} ${top + height} ${x + width} ${top + height} ${x + width - r} ${top + height} L ${x + r} ${top + height} C ${x} ${top + height} ${x} ${top + height} ${x} ${top + height - r} L ${x} ${top + r} C ${x} ${top} ${x} ${top} ${x + r} ${top} Z`, color));
  }
  function rule(top: number, color = colors.border) { page.push({ text: '', x: 42, y: top, size: 0, kind: 'rule', width: 511, color }); }
  function newPage() {
    page = [];
    pages.push(page);
    page.push(vector(documentBrand.backgroundPath, colors.green, 42, 42, 0.625));
    page.push(vector(documentBrand.symbolPath, '#ffffff', 42, 42, 0.625, documentBrand.strokeWidth * 0.625));
    let headerY = 55;
    wrap(receipt.professional_name, 13, 450, true).forEach(line => { text(line, 98, headerY, 13, true, colors.dark); headerY += 17; });
    wrap(receipt.professional_title, 9.5, 450).forEach(line => { text(line, 98, headerY, 9.5, false, colors.muted); headerY += 13; });
    y = Math.max(98, headerY + 9);
    rule(y, colors.gold);
    text(pages.length === 1 ? 'RECIBO DE PAGAMENTO' : 'RECIBO DE PAGAMENTO · CONTINUAÇÃO', 42, y + 30, 18, true, colors.dark);
    y += 51;
    wrap(`Nº ${receipt.receipt_number}  •  Emissão: ${displayDate(receipt.issue_date)}`, 10, 511).forEach(line => { text(line, 42, y, 10, false, colors.muted); y += 14; });
    if (receipt.status !== 'FINALIZADO') {
      text(receipt.status === 'CANCELADO' ? 'CANCELADO — SEM VALIDADE' : 'RASCUNHO — NÃO FINALIZADO', 42, y + 5, 9, true, '#865624');
      y += 24;
    }
    y += 8;
  }
  function room(height: number) { if (y + height > contentBottom) newPage(); }
  function field(label: string, value: string, tinted = false, reserveSignature = false) {
    const lines = wrap(value, 11);
    let index = 0;
    while (index < lines.length) {
      room(65);
      const capacity = Math.max(1, Math.floor((contentBottom - y - 43) / 15));
      let count = Math.min(lines.length - index, capacity);
      if (reserveSignature && index + count === lines.length && y + 33 + count * 15 + 8 + signHeight > contentBottom) {
        if (count > 3) count -= 3;
        else { newPage(); continue; }
      }
      const chunk = lines.slice(index, index + count);
      const height = 33 + chunk.length * 15;
      if (tinted) box(42, y, 511, height, colors.soft);
      text(index ? `${label} · CONTINUAÇÃO` : label, 60, y + 18, 8.5, true, colors.green);
      chunk.forEach((line, offset) => text(line, 60, y + 37 + offset * 15, 11));
      y += height + 8;
      index += chunk.length;
      if (index < lines.length) newPage();
    }
  }
  newPage();

  const amountWords = wrap(receiptAmountInWords(receipt.amount), 10);
  const amountHeight = 76 + amountWords.length * 13;
  room(amountHeight + 12);
  box(42, y, 511, amountHeight, colors.dark);
  text('VALOR RECEBIDO', 60, y + 21, 9, true, '#c4d9cd');
  text(receiptMoney(receipt.amount), 60, y + 58, 30, true, '#ffffff');
  amountWords.forEach((line, index) => text(line, 60, y + 78 + index * 13, 10, false, '#e3ece7'));
  y += amountHeight + 12;

  field('DADOS DO PAGADOR', `${receipt.patient_name}\nCPF: ${formatReceiptCpf(receipt.patient_cpf)}`, true);
  field('DESCRIÇÃO DO SERVIÇO', receipt.service_description);

  const methodLines = wrap(receipt.payment_method, 10.5, 225);
  const areaLines = wrap(receipt.professional_area, 10.5, 225);
  const paymentHeight = 68 + Math.max(methodLines.length, areaLines.length) * 14;
  room(paymentHeight + 10 + (!receipt.notes?.trim() && !extendedFooter ? signHeight : 0));
  box(42, y, 511, paymentHeight, colors.soft);
  text('DATA DO PAGAMENTO', 60, y + 19, 8, true, colors.green);
  text('FORMA DE PAGAMENTO', 316, y + 19, 8, true, colors.green);
  text(displayDate(receipt.payment_date ?? ''), 60, y + 36, 11);
  methodLines.forEach((line, index) => text(line, 316, y + 36 + index * 14, 10.5));
  const areaY = y + 55 + (methodLines.length - 1) * 14;
  text('ÁREA PROFISSIONAL', 60, areaY, 8, true, colors.green);
  areaLines.forEach((line, index) => text(line, 60, areaY + 17 + index * 14, 10.5));
  y += paymentHeight + 10;

  if (receipt.notes?.trim()) field('OBSERVAÇÕES', receipt.notes.trim(), false, !extendedFooter);
  if (extendedFooter) field('INFORMAÇÕES COMPLEMENTARES DO EMITENTE', footerParts.join('\n'), false, true);

  room(signHeight);
  declaration.forEach(line => { text(line, 42, y + 12, 9.5, false, colors.muted); y += 13; });
  y += 8;
  location.forEach(line => { text(line, 42, y + 12, 10); y += 14; });
  const signatureY = y + 88;
  page.push({ text: '', x: 297.5, y: signatureY, size: 11, kind: 'signature-line' });
  centered('Assinatura do profissional responsável', signatureY + 24, 9, false, colors.muted);

  pages.forEach((current, index) => {
    page = current;
    rule(footerTop - 9, colors.gold);
    footerLines.forEach((line, offset) => centered(line, footerTop + 7 + offset * 13, 9, false, colors.muted));
    if (pages.length > 1) centered(`Página ${index + 1} de ${pages.length}`, 820, 8, false, colors.muted);
  });
  return pages;
}
