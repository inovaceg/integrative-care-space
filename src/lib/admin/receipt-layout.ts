import type { DocumentPage } from './document-layout';
import { displayDate } from './documents';
import { receiptMoney, type Receipt } from './receipts';
import { formatReceiptCpf, receiptAmountInWords } from './receipt-format';

type ReceiptBlock = { text: string; size: number; bold?: boolean; color?: string; centered?: boolean; gap?: number };

export function layoutReceipt(receipt: Receipt): DocumentPage[] {
  const context = document.createElement('canvas').getContext('2d')!;
  const page: DocumentPage = [];
  const width = 511;

  function wrap(text: string, size: number, bold: boolean): string[] {
    context.font = `${bold ? 'bold' : 'normal'} ${size}px Arial`;
    return text.replace(/\r/g, '').split('\n').flatMap(paragraph => {
      const lines: string[] = [];
      let line = '';
      for (const word of paragraph.trim().split(/\s+/)) {
        if (context.measureText(line ? `${line} ${word}` : word).width <= width) {
          line = line ? `${line} ${word}` : word;
          continue;
        }
        if (line) lines.push(line);
        line = '';
        for (const char of word) {
          if (context.measureText(line + char).width > width) { lines.push(line); line = ''; }
          line += char;
        }
      }
      lines.push(line);
      return lines;
    });
  }

  // Independent bounded sections keep long names/notes on A4 without clipping or removing content.
  function section(blocks: ReceiptBlock[], top: number, bottom: number) {
    let scale = 1;
    let prepared: { block: ReceiptBlock; size: number; lines: string[] }[];
    let height: number;
    do {
      prepared = blocks.map(block => ({ block, size: block.size * scale, lines: wrap(block.text, block.size * scale, !!block.bold) }));
      height = prepared.reduce((sum, item) => sum + item.lines.length * item.size * 1.45 + (item.block.gap ?? 10) * scale, 0);
      if (height <= bottom - top) break;
      scale *= 0.95;
    } while (true);
    let y = top;
    for (const { block, size, lines } of prepared) {
      context.font = `${block.bold ? 'bold' : 'normal'} ${size}px Arial`;
      for (const text of lines) {
        y += size * 1.45;
        page.push({ text, x: block.centered ? (595 - context.measureText(text).width) / 2 : 42, y, size, bold: !!block.bold, color: block.color ?? '#334155' });
      }
      y += (block.gap ?? 10) * scale;
    }
  }

  section([
    { text: 'RECIBO DE PAGAMENTO', size: 18, bold: true, color: '#123c3d', gap: 5 },
    { text: `${receipt.receipt_number}  •  Emissão: ${displayDate(receipt.issue_date)}`, size: 10, gap: 4 },
    ...(receipt.status !== 'FINALIZADO' ? [{ text: receipt.status === 'CANCELADO' ? 'CANCELADO — SEM VALIDADE' : 'RASCUNHO — NÃO FINALIZADO', size: 9, bold: true, color: '#92400e', gap: 0 }] : []),
  ], 52, 128);

  section([
    { text: 'VALOR RECEBIDO', size: 9, bold: true, color: '#64748b', gap: 2 },
    { text: receiptMoney(receipt.amount), size: 30, bold: true, color: '#21655f', gap: 0 },
  ], 151, 224);

  section([
    { text: `Recebi de ${receipt.patient_name}, CPF ${formatReceiptCpf(receipt.patient_cpf)}, a importância de ${receiptMoney(receipt.amount)} (${receiptAmountInWords(receipt.amount)}), referente ao pagamento de consulta de ${receipt.professional_area}.`, size: 12, gap: 23 },
    { text: `Data do pagamento: ${displayDate(receipt.payment_date ?? '')}`, size: 11, bold: true, gap: 6 },
    { text: `Forma de pagamento: ${receipt.payment_method}`, size: 11, gap: 6 },
    { text: `Área: ${receipt.professional_area}`, size: 11, gap: 16 },
    ...(receipt.notes?.trim() ? [{ text: `Observações: ${receipt.notes.trim()}`, size: 9, color: '#64748b', gap: 12 }] : []),
    { text: `${receipt.city}, ${displayDate(receipt.issue_date)}.`, size: 10, gap: 0 },
  ], 245, 562);

  section([
    { text: '____________________________________________', size: 11, centered: true, color: '#94a3b8', gap: 7 },
    { text: receipt.professional_name, size: 12, centered: true, bold: true, color: '#123c3d', gap: 3 },
    { text: receipt.professional_title, size: 10, centered: true, gap: 3 },
    { text: receipt.professional_registration, size: 10, centered: true, bold: true, color: '#21655f', gap: 5 },
    { text: 'Assinatura do profissional responsável', size: 8, centered: true, color: '#64748b', gap: 0 },
  ], 599, 713);

  if (receipt.footer?.trim()) {
    section([{ text: receipt.footer.trim(), size: 7, centered: true, color: '#94a3b8', gap: 0 }], 742, 812);
  }
  return [page];
}
