import type { DocumentPage } from './document-layout';
import { displayDate } from './documents';
import { receiptMoney, type Receipt } from './receipts';

export function layoutReceipt(receipt: Receipt): DocumentPage[] {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d')!;
  const pages: DocumentPage[] = [];
  let page: DocumentPage = [];
  let y = 160;
  function newPage() {
    page = [
      { text: 'RECIBO DE PAGAMENTO', x: 42, y: 72, size: 17, bold: true, color: '#123c3d' },
      { text: receipt.receipt_number, x: 42, y: 98, size: 11, bold: true },
      { text: `${receipt.professional_area} · ${receipt.status}`, x: 42, y: 118, size: 10 },
    ];
    pages.push(page);
    y = 160;
  }
  function block(text: string, size = 11, bold = false, centered = false) {
    context.font = `${bold ? 'bold' : 'normal'} ${size}px Arial`;
    const lines: string[] = [];
    for (const paragraph of text.replace(/\r/g, '').split('\n')) {
      let line = '';
      for (const word of paragraph.split(/\s+/)) {
        if (context.measureText(line ? `${line} ${word}` : word).width <= 511) {
          line = line ? `${line} ${word}` : word;
        } else {
          if (line) lines.push(line);
          line = '';
          for (const char of word) {
            if (context.measureText(line + char).width > 511) { lines.push(line); line = ''; }
            line += char;
          }
        }
      }
      lines.push(line);
    }
    for (const text of lines) {
      if (y > 700) newPage();
      const x = centered ? (595 - context.measureText(text).width) / 2 : 42;
      page.push({ text, x, y, size, bold });
      y += size * 1.6;
    }
    y += 12;
  }
  newPage();
  if (receipt.status !== 'FINALIZADO') block(receipt.status === 'CANCELADO' ? 'CANCELADO — SEM VALIDADE' : 'RASCUNHO — NÃO FINALIZADO', 12, true);
  block(`Recebi de ${receipt.patient_name}, CPF ${receipt.patient_cpf || 'não informado'}, a importância de ${receiptMoney(receipt.amount)}, referente a ${receipt.service_description}.`, 12);
  block(`Valor: ${receiptMoney(receipt.amount)}`, 14, true);
  block(`Data do pagamento: ${displayDate(receipt.payment_date ?? '')}\nForma de pagamento: ${receipt.payment_method}\nÁrea: ${receipt.professional_area}`);
  if (receipt.notes) block(`Observações: ${receipt.notes}`);
  block(`${receipt.city}, ${displayDate(receipt.issue_date)}.`);
  if (y > 475) newPage();
  y = Math.max(y + 25, 480);
  block('____________________________________________');
  block(`${receipt.professional_name}\n${receipt.professional_title}\n${receipt.professional_registration}`, 11, true);
  block('Assinatura do profissional responsável', 9);
  if (receipt.footer) block(receipt.footer, 8, false, true);
  pages.forEach((lines, index) => lines.push({ text: `Página ${index + 1} de ${pages.length}`, x: 42, y: 815, size: 8, color: '#64748b' }));
  return pages;
}
