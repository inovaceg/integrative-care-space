import { describe, expect, test } from 'bun:test';
import { layoutReceipt } from './receipt-layout';
import { signatureAsset } from './document-layout';
import { receiptMoney } from './receipts';
import { formatReceiptCpf } from './receipt-format';

const receipt = {
  id: 'receipt-fixture', user_id: 'professional-fixture', patient_id: 'patient-fixture',
  receipt_number: 'REC-TESTE-0042', patient_name: 'Pagador fictício para teste', patient_cpf: '12345678901',
  professional_area: 'Psicologia', professional_registration: 'REGISTRO DE TESTE',
  professional_name: 'Profissional fictício', professional_title: 'Título profissional de teste',
  city: 'Cidade de teste', footer: 'Profissional fictício\nTítulo profissional de teste\nREGISTRO DE TESTE\nContato de teste',
  service_description: 'Descrição específica do atendimento registrado', amount: 375.49,
  payment_method: 'Pix', payment_date: '2026-11-10', issue_date: '2026-11-11', notes: '',
  status: 'FINALIZADO', created_at: '2026-11-11T12:00:00Z',
};
const textOf = pages => pages.flat().map(line => line.text).join(' ').replace(/\s+/g, ' ');

describe('recibo premium A4', () => {
  test('preserva os dados do recibo sem modificar o objeto de origem', () => {
    const original = JSON.stringify(receipt);
    const pages = layoutReceipt(receipt);
    const text = textOf(pages);
    expect(pages).toHaveLength(1);
    for (const value of [receipt.receipt_number, receipt.patient_name, formatReceiptCpf(receipt.patient_cpf), receiptMoney(receipt.amount), receipt.service_description, receipt.professional_area, receipt.payment_method, receipt.city, '10/11/2026', '11/11/2026']) expect(text).toContain(value);
    expect(JSON.stringify(receipt)).toBe(original);
    expect(text).not.toContain('OBSERVAÇÕES');
  });

  test('não repete os dados profissionais do cabeçalho no rodapé', () => {
    const lines = layoutReceipt(receipt).flat();
    expect(lines.filter(line => line.text === receipt.professional_name)).toHaveLength(1);
    expect(lines.filter(line => line.text === receipt.professional_title)).toHaveLength(1);
    expect(lines.filter(line => line.text === receipt.professional_registration)).toHaveLength(1);
    const contact = lines.find(line => line.text === 'Contato de teste');
    expect(contact.size).toBeGreaterThanOrEqual(9);
    expect(contact.color).toBe('#52635c');
  });

  test('mantém a assinatura original com área livre de texto', () => {
    expect(signatureAsset).toBe('/assets/professional-signature.png');
    const lines = layoutReceipt(receipt).flat();
    const signature = lines.find(line => line.kind === 'signature-line');
    expect(signature).toBeDefined();
    expect(signature.y - 80).toBeGreaterThan(lines.find(line => line.text.startsWith(receipt.city)).y);
    expect(signature.y + 24).toBeLessThan(lines.find(line => line.text === 'Contato de teste').y);
    expect(lines.filter(line => line.kind === 'path' && line.strokeWidth)).toHaveLength(1);
  });

  test('mantém os avisos obrigatórios de rascunho e cancelamento', () => {
    expect(textOf(layoutReceipt({ ...receipt, status: 'RASCUNHO' }))).toContain('RASCUNHO — NÃO FINALIZADO');
    expect(textOf(layoutReceipt({ ...receipt, status: 'CANCELADO' }))).toContain('CANCELADO — SEM VALIDADE');
    expect(textOf(layoutReceipt(receipt))).not.toContain('SEM VALIDADE');
  });

  test('pagina observações extensas sem apagar texto nem tornar a fonte ilegível', () => {
    const notes = Array.from({ length: 70 }, (_, index) => `Observação de teste ${index + 1}, preservada integralmente.`).join('\n');
    const pages = layoutReceipt({ ...receipt, notes });
    const text = textOf(pages);
    expect(pages.length).toBeGreaterThan(1);
    for (let index = 1; index <= 70; index++) expect(text).toContain(`Observação de teste ${index}, preservada integralmente.`);
    expect(pages.flat().filter(line => line.kind === 'signature-line')).toHaveLength(1);
    expect(pages.at(-1).some(line => line.text.startsWith('Observação de teste'))).toBe(true);
    for (const line of pages.flat()) {
      expect(Number.isFinite(line.x)).toBe(true);
      expect(Number.isFinite(line.y)).toBe(true);
      if (!line.kind) {
        expect(line.size).toBeGreaterThanOrEqual(8);
        expect(line.y).toBeGreaterThanOrEqual(42);
        expect(line.y).toBeLessThanOrEqual(820);
      }
      if (line.pdfPath) expect(line.pdfPath).not.toMatch(/NaN|Infinity|undefined/);
    }
  });
});
