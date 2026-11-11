import { describe, expect, test } from 'bun:test';
import { layoutDocument } from './document-layout';
import { emptyContent } from './documents';

function contentWithLines(count) {
  const content = emptyContent();
  content.patient = { name: 'Paciente de teste', date: '2026-11-11', cpf: 'Documento de teste', birthDate: '1990-01-01', phone: 'Telefone de teste' };
  content.mode = 'free';
  content.text = Array.from({ length: count }, (_, index) => `Conteúdo de teste ${index + 1}.`).join('\n');
  return content;
}

const bodyLines = (page) => page.filter((line) => line.text.startsWith('Conteúdo de teste'));

describe('paginação de orientações ao paciente', () => {
  test('mantém identificação, texto curto e assinatura em uma folha', () => {
    const pages = layoutDocument('psicologia', 'Orientações ao Paciente', contentWithLines(10), true);
    expect(pages).toHaveLength(1);
    expect(bodyLines(pages[0])).toHaveLength(10);
    expect(pages[0].some((line) => line.kind === 'signature-line')).toBe(true);
  });

  test('começa o texto na primeira folha e não cria folha só de assinatura', () => {
    const pages = layoutDocument('psicologia', 'Orientações ao Paciente', contentWithLines(26), true);
    expect(pages).toHaveLength(2);
    expect(bodyLines(pages[0]).length).toBeGreaterThan(0);
    expect(bodyLines(pages[1]).length).toBeGreaterThanOrEqual(3);
    expect(pages[1].some((line) => line.kind === 'signature-line')).toBe(true);
  });

  test('divide texto longo sem perder linhas nem invadir o rodapé', () => {
    const pages = layoutDocument('psicologia', 'Orientações ao Paciente', contentWithLines(80), true);
    expect(pages.length).toBeGreaterThan(1);
    expect(pages.flatMap(bodyLines)).toHaveLength(80);
    for (const page of pages) {
      expect(bodyLines(page).length).toBeGreaterThan(0);
      for (const line of bodyLines(page)) expect(line.y + line.size * 1.5).toBeLessThanOrEqual(730);
    }
    const last = pages.at(-1);
    const signature = last.find((line) => line.kind === 'signature-line');
    expect(signature.y + 43).toBeLessThanOrEqual(730);
    expect(signature.y - 80).toBeGreaterThan(bodyLines(last).at(-1).y);
  });
});
