import { describe, expect, test } from 'bun:test';
import { bodySilhouetteLines, waistHasLargestReduction } from './body-progress-silhouette';
import { bodyProgressReportPages, bodyProgressCharts, bodyProgressChartLines } from './body-progress-report';

const row = (key, variation, difference, values = ['100 cm', '77 cm']) => ({ key, label: key, variation, difference, values });
const rows = [
  row('weight_kg', '−14,9 kg', -14.9, ['90 kg', '75,1 kg']),
  row('chest_cm', '−10 cm', -10),
  row('right_arm_cm', '−4 cm', -4),
  row('left_arm_cm', '−3 cm', -3),
  row('waist_cm', '−23 cm', -23),
  row('hip_cm', '−12 cm', -12),
  row('right_thigh_cm', '−6 cm', -6),
  row('left_thigh_cm', '−5 cm', -5),
];

describe('silhueta e dashboard corporal', () => {
  test('mantém oito callouts com valores reais e seis formas vetoriais SVG/PDF', () => {
    const lines = bodySilhouetteLines(rows);
    expect(lines.filter((line) => line.kind === 'path')).toHaveLength(6);
    for (const path of lines.filter((line) => line.kind === 'path')) {
      expect(path.path).toContain('C');
      expect(path.pdfPath).toContain('c');
      expect(path.pdfPath).not.toMatch(/NaN|undefined|Infinity/);
    }
    for (const label of ['Peso total', 'Busto / Tórax', 'Braço direito', 'Braço esquerdo', 'Cintura', 'Quadril', 'Coxa direita', 'Coxa esquerda']) {
      expect(lines.some((line) => line.text === label)).toBe(true);
    }
    expect(lines.some((line) => line.text === '-14,9 kg')).toBe(true);
    expect(lines.some((line) => line.text === '-23 cm')).toBe(true);
  });

  test('destaca cintura apenas se for a maior redução das circunferências', () => {
    expect(waistHasLargestReduction(rows)).toBe(true);
    expect(waistHasLargestReduction([...rows, row('abdomen_cm', '−24 cm', -24)])).toBe(false);
    expect(waistHasLargestReduction([row('waist_cm', '+2 cm', 2)])).toBe(false);
    expect(waistHasLargestReduction([row('waist_cm', '+0 cm', 0)])).toBe(false);
    expect(waistHasLargestReduction([])).toBe(false);
    expect(waistHasLargestReduction([...rows, row('height_cm', '−30 cm', -30)])).toBe(true);
    expect(bodySilhouetteLines(rows).find((line) => line.text === 'Cintura').color).toBe('#b08d57');
  });

  test('exibe ausência de dados sem inventar resultados', () => {
    expect(bodySilhouetteLines([]).filter((line) => line.text === '—')).toHaveLength(8);
    expect(bodyProgressReportPages('Paciente de teste', [], [])).toEqual([]);
    const lines = bodyProgressChartLines(bodyProgressCharts[0], [], ['2026-01-01']);
    expect(lines.some((line) => line.text.includes('Dados insuficientes'))).toBe(true);
  });

  test('mantém quatro gráficos e pagina todas as avaliações sem descartar colunas', () => {
    const dates = Array.from({ length: 7 }, (_, index) => `2026-01-0${index + 1}`);
    const historyRows = rows.map((entry) => ({ ...entry, values: dates.map((_, index) => `${100 - index} cm`) }));
    const pages = bodyProgressReportPages('Paciente de teste', dates, historyRows);
    expect(pages).toHaveLength(3);
    for (const chart of bodyProgressCharts) expect(pages[0].some((line) => line.text === chart.title)).toBe(true);
    expect(pages[0].some((line) => line.kind === 'path')).toBe(true);
    for (const entry of historyRows) {
      for (const value of entry.values) expect(pages.slice(1).flat().some((line) => line.text === value)).toBe(true);
    }
    for (const line of pages.flat()) {
      expect(Number.isFinite(line.x)).toBe(true);
      expect(Number.isFinite(line.y)).toBe(true);
      expect(line.y).toBeLessThanOrEqual(842);
    }
  });
});
