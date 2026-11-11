import { professionalName, displayDate } from './documents';
import type { DocumentLine, DocumentPage } from './document-layout';
import { bodySilhouetteLines, waistHasLargestReduction, type BodyReportRow as ReportRow } from './body-progress-silhouette';

type ChartSeries = { key: string; label: string; color: string };

export const bodyProgressCharts: { title: string; series: ChartSeries[] }[] = [
  { title: 'Evolução do peso (kg)', series: [{ key: 'weight_kg', label: 'Peso', color: '#2c5f4f' }] },
  { title: 'Circunferências principais (cm)', series: [
    { key: 'chest_cm', label: 'Tórax', color: '#2c5f4f' },
    { key: 'waist_cm', label: 'Cintura', color: '#9c6c36' },
    { key: 'abdomen_cm', label: 'Abdômen', color: '#b08d57' },
    { key: 'hip_cm', label: 'Quadril', color: '#78948a' },
  ] },
  { title: 'Braços (cm)', series: [{ key: 'right_arm_cm', label: 'Direito', color: '#2c5f4f' }, { key: 'left_arm_cm', label: 'Esquerdo', color: '#b08d57' }] },
  { title: 'Coxas (cm)', series: [{ key: 'right_thigh_cm', label: 'Direita', color: '#2c5f4f' }, { key: 'left_thigh_cm', label: 'Esquerda', color: '#b08d57' }] },
];

export function bodyProgressChartLines(spec: { title: string; series: ChartSeries[] }, rows: ReportRow[], dates: string[], width = 400, height = 190): DocumentPage {
  const lines: DocumentPage = [];
  chart(lines, spec.title, spec.series, rows, dates, 0, 0, width, height);
  return lines;
}

const ink = '#1a1a1a';
const muted = '#6b6b6b';
const soft = '#92928e';
const lineColor = '#e8e6e1';
const accent = '#2c5f4f';
const gold = '#b08d57';

function text(text: string, x: number, y: number, size = 9, color = ink, bold = false): DocumentLine {
  return { text, x, y, size, color, bold };
}

function shape(kind: 'rule' | 'rect' | 'line' | 'point', x: number, y: number, color: string, options: Partial<DocumentLine> = {}): DocumentLine {
  return { text: '', x, y, size: 0, color, kind, ...options };
}

function parseValue(value: string | undefined): number | null {
  if (!value || value === '—') return null;
  const numeric = Number(value.trim().split(/\s+/)[0]!.replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(numeric) ? numeric : null;
}

function compactDate(value: string): string {
  return value ? `${value.slice(8, 10)}/${value.slice(5, 7)}` : '—';
}

function header(patientName: string, dates: string[], pageLabel: string): DocumentPage {
  const first = displayDate(dates[0] ?? '');
  const last = displayDate(dates.at(-1) ?? '');
  return [
    text('RELATÓRIO CLÍNICO', 42, 38, 8, gold, true),
    text('Evolução Corporal', 42, 66, 21, '#123c3d', true),
    text(`Paciente: ${patientName}`, 42, 91, 10, ink, true),
    text(`Período: ${first} a ${last}  ·  ${dates.length} avaliação(ões)`, 42, 108, 8.5, muted),
    text(pageLabel, 500, 39, 8, soft),
    shape('rule', 42, 121, lineColor, { width: 511 }),
  ];
}

function chart(lines: DocumentPage, title: string, series: ChartSeries[], rows: ReportRow[], dates: string[], x: number, y: number, width: number, height: number) {
  lines.push(text(title, x, y + 12, 9, ink, true));
  const top = y + 28;
  const left = x + 30;
  const right = x + width - 12;
  const bottom = y + height - 24;
  const plotWidth = right - left;
  const plotHeight = bottom - top;
  const valuesBySeries = series.map((entry) => ({
    ...entry,
    values: rows.find((row) => row.key === entry.key)?.values.map(parseValue) ?? dates.map(() => null),
  }));
  const allValues = valuesBySeries.flatMap((entry) => entry.values.filter((value): value is number => value != null));
  if (!allValues.length) {
    lines.push(text('Dados insuficientes para exibir a evolução.', left, top + 30, 7, soft));
    return;
  }
  let min = Math.min(...allValues);
  let max = Math.max(...allValues);
  if (min === max) { min -= 1; max += 1; }
  const pad = (max - min) * 0.12;
  min -= pad;
  max += pad;
  for (let i = 0; i < 3; i += 1) {
    const gridY = top + (plotHeight * i) / 2;
    const tick = (max - ((max - min) * i) / 2).toLocaleString('pt-BR', { maximumFractionDigits: 1 });
    lines.push(shape('rule', left, gridY, '#eeedea', { width: plotWidth }));
    lines.push(text(tick, x, gridY + 2, 6.5, soft));
  }
  valuesBySeries.forEach((entry) => {
    const points = entry.values.map((value, index) => value == null ? null : ({
      x: dates.length === 1 ? left + plotWidth / 2 : left + (plotWidth * index) / (dates.length - 1),
      y: bottom - ((value - min) / (max - min)) * plotHeight,
    }));
    points.forEach((point, index) => {
      if (!point) return;
      const previous = points[index - 1];
      if (previous) lines.push(shape('line', previous.x, previous.y, entry.color, { x2: point.x, y2: point.y }));
      lines.push(shape('point', point.x, point.y, entry.color, { radius: 2.2 }));
    });
  });
  const labelStride = Math.max(1, Math.ceil(dates.length / 5));
  dates.forEach((date, index) => {
    if (index % labelStride !== 0 && index !== dates.length - 1) return;
    const label = compactDate(date);
    const px = dates.length === 1 ? left + plotWidth / 2 : left + (plotWidth * index) / (dates.length - 1);
    lines.push(text(label, px - 10, bottom + 13, 6.5, soft));
  });
  let legendX = x + 12;
  const legendY = y + height - 3;
  valuesBySeries.forEach((entry) => {
    lines.push(shape('line', legendX, legendY - 2, entry.color, { x2: legendX + 13, y2: legendY - 2 }));
    lines.push(text(entry.label, legendX + 18, legendY, 6.5, muted));
    legendX += 20 + entry.label.length * 4.2;
  });
}

function kpiStrip(lines: DocumentPage, rows: ReportRow[]) {
  const metrics = [
    { key: 'weight_kg', label: 'PESO' },
    { key: 'body_fat_percentage', label: 'GORDURA' },
    { key: 'muscle_mass_kg', label: 'MÚSCULO' },
    { key: 'visceral_fat_level', label: 'GORDURA VISCERAL' },
    { key: 'metabolic_age_years', label: 'IDADE METABÓLICA' },
  ];
  const cardWidth = 96;
  const gap = 8;
  metrics.forEach((metric, index) => {
    const x = 42 + index * (cardWidth + gap);
    const row = rows.find((item) => item.key === metric.key);
    const valid = row?.values.filter((value) => value !== '—') ?? [];
    const firstValue = valid[0] ?? '—';
    const lastValue = valid.at(-1) ?? '—';
    const variation = row?.variation ?? '—';
    const delta = variation === '—' ? '—' : variation.replace(/−/g, '-');
    lines.push(shape('rect', x, 137, '#ffffff', { width: cardWidth, height: 62 }));
    lines.push(shape('rect', x, 137, lineColor, { width: cardWidth, height: 0.7 }));
    lines.push(text(metric.label, x + 6, 151, 5.4, soft, true));
    lines.push(text(delta, x + 6, 169, 11, accent, true));
    lines.push(text(`${firstValue} / ${lastValue}`, x + 6, 187, 5.8, muted));
  });
}

function trendPage(patientName: string, dates: string[], rows: ReportRow[], pageNumber: number, pageCount: number): DocumentPage {
  const lines: DocumentPage = [shape('rect', 0, 0, '#f7f6f3', { width: 595, height: 842 }), ...header(patientName, dates, `Página ${pageNumber} de ${pageCount}`)];
  kpiStrip(lines, rows);
  lines.push(shape('rect', 35, 214, '#ffffff', { width: 205, height: 338 }));
  lines.push(text('VARIAÇÃO POR REGIÃO', 47, 232, 8, accent, true));
  lines.push(text('Último valor menos o primeiro registrado', 47, 245, 6, muted));
  lines.push(...bodySilhouetteLines(rows, 42, 256, 190));
  if (waistHasLargestReduction(rows)) lines.push(text('Cintura: maior redução entre as circunferências', 47, 542, 6.5, gold, true));
  bodyProgressCharts.forEach((spec, index) => {
    const x = index < 2 ? 259 : index === 2 ? 42 : 308;
    const y = index === 0 ? 219 : index === 1 ? 391 : 576;
    const width = index < 2 ? 294 : 245;
    const height = index < 2 ? 150 : 135;
    lines.push(shape('rect', x - 6, y - 5, '#ffffff', { width: width + 12, height: height + 13 }));
    chart(lines, spec.title, spec.series, rows, dates, x, y, width, height);
  });
  lines.push(shape('rule', 42, 735, lineColor, { width: 511 }));
  lines.push(text(professionalName, 42, 758, 8, '#123c3d', true));
  lines.push(text('CRP 04/86194  ·  CRBM 30421  ·  Juiz de Fora – MG', 42, 773, 7, muted));
  lines.push(text('Variações descritivas das medidas registradas; não representam, isoladamente, avaliação de saúde.', 42, 791, 6.6, muted));
  return lines;
}

function tablePage(patientName: string, dates: string[], rows: ReportRow[], pageNumber: number, pageCount: number): DocumentPage {
  const lines = header(patientName, dates, `Página ${pageNumber} de ${pageCount}`);
  lines.push(text('Histórico completo de avaliações', 42, 148, 12, '#123c3d', true));
  lines.push(text('Medida', 42, 179, 7, soft, true));
  const labelWidth = 142;
  const variationX = 472;
  const columnsWidth = variationX - 42 - labelWidth;
  const columnWidth = columnsWidth / dates.length;
  dates.forEach((date, index) => {
    const dateLabel = compactDate(date);
    lines.push(text(dateLabel, 42 + labelWidth + index * columnWidth + 3, 179, 6.8, accent, true));
  });
  lines.push(text('Variação', variationX, 179, 6.8, accent, true));
  lines.push(shape('rule', 42, 188, lineColor, { width: 511 }));
  rows.forEach((row, rowIndex) => {
    const y = 207 + rowIndex * 25;
    if (rowIndex % 2 === 0) lines.push(shape('rect', 42, y - 12, '#fafaf8', { width: 511, height: 19 }));
    lines.push(text(row.label, 46, y, 7.1, muted));
    dates.forEach((_, column) => {
      lines.push(text(row.values[column] ?? '—', 42 + labelWidth + column * columnWidth + 3, y, 6.7, ink));
    });
    lines.push(text(row.variation.replace(/−/g, '-'), variationX, y, 7, accent, true));
  });
  lines.push(shape('rule', 42, 690, lineColor, { width: 511 }));
  lines.push(text('— indica medida não registrada. A variação compara o primeiro e o último valor preenchidos.', 42, 708, 7, muted));
  lines.push(text(professionalName, 42, 758, 8, '#123c3d', true));
  lines.push(text('CRP 04/86194  ·  CRBM 30421  ·  Juiz de Fora – MG', 42, 773, 7, muted));
  lines.push(text('Relatório de acompanhamento corporal', 42, 791, 6.6, muted));
  return lines;
}

export function bodyProgressReportPages(patientName: string, dates: string[], rows: ReportRow[]): DocumentPage[] {
  if (!dates.length) return [];
  const tablePages = Math.ceil(dates.length / 5);
  const pageCount = 1 + tablePages;
  const pages: DocumentPage[] = [trendPage(patientName, dates, rows, 1, pageCount)];
  for (let start = 0; start < dates.length; start += 5) {
    const pageDates = dates.slice(start, start + 5);
    const pageRows = rows.map((row) => ({ ...row, values: pageDates.map((_, index) => row.values[start + index] ?? '—') }));
    pages.push(tablePage(patientName, pageDates, pageRows, pages.length + 1, pageCount));
  }
  return pages;
}

export function bodyProgressReportFilename(patientName: string, beforeDate: string, afterDate: string) {
  const safe = `${patientName}-${beforeDate}-${afterDate}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
  return `relatorio-evolucao-corporal-${safe || 'paciente'}`;
}
