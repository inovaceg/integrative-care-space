import type { DocumentPage } from './document-layout';

export type BodyReportRow = { key: string; label: string; values: string[]; variation: string; difference?: number | null };

// Coordinates are shared by the SVG dashboard and the vector PDF (no raster image).
const anatomy = [
  'M 150 52 C 124 52 123 101 150 104 C 177 101 176 52 150 52 Z',
  'M 141 103 L 141 119 C 130 124 117 122 109 135 C 100 153 112 175 120 194 C 127 212 115 234 112 252 C 108 274 119 291 134 295 L 166 295 C 181 291 192 274 188 252 C 185 234 173 212 180 194 C 188 175 200 153 191 135 C 183 122 170 124 159 119 L 159 103 Z',
  'M 109 135 C 96 144 90 176 85 198 L 73 246 C 70 259 78 264 84 253 L 103 209 L 118 164 Z',
  'M 191 135 C 204 144 210 176 215 198 L 227 246 C 230 259 222 264 216 253 L 197 209 L 182 164 Z',
  'M 134 287 C 116 307 119 341 123 365 L 126 424 C 126 436 140 436 141 425 L 150 342 L 149 297 Z',
  'M 166 287 C 184 307 181 341 177 365 L 174 424 C 174 436 160 436 159 425 L 150 342 L 151 297 Z',
];

function vectorPath(source: string, x: number, y: number, scale: number) {
  const tokens = source.match(/[MCLZ]|-?\d+(?:\.\d+)?/g) ?? [];
  let svg = '';
  let pdf = '';
  for (let i = 0; i < tokens.length;) {
    const command = tokens[i++]!;
    if (command === 'Z') { svg += ' Z'; pdf += ' h'; continue; }
    const count = command === 'C' ? 6 : 2;
    const coords = tokens.slice(i, i + count).map(Number);
    i += count;
    const mapped = coords.map((value, index) => index % 2 === 0 ? x + value * scale : y + value * scale);
    svg += ` ${command} ${mapped.join(' ')}`;
    pdf += ` ${mapped.map((value, index) => index % 2 === 0 ? value : 842 - value).join(' ')} ${command.toLowerCase()}`;
  }
  return { path: svg.trim(), pdfPath: pdf.trim() };
}

export function bodySilhouetteLines(rows: BodyReportRow[], x = 0, y = 0, width = 300): DocumentPage {
  const scale = width / 300;
  const lines: DocumentPage = anatomy.map((source) => ({ text: '', x, y, size: 0, kind: 'path', color: '#cddbd4', ...vectorPath(source, x, y, scale) }));
  const highlightWaist = waistHasLargestReduction(rows);
  const tags = [
    { key: 'weight_kg', label: 'Peso total', tx: 111, ty: 7, ax: 150, ay: 52 },
    { key: 'chest_cm', label: 'Busto / Tórax', tx: 2, ty: 112, ax: 133, ay: 152 },
    { key: 'right_arm_cm', label: 'Braço direito', tx: 2, ty: 176, ax: 100, ay: 194 },
    { key: 'left_arm_cm', label: 'Braço esquerdo', tx: 218, ty: 176, ax: 200, ay: 194 },
    { key: 'waist_cm', label: 'Cintura', tx: 218, ty: 230, ax: 174, ay: 223 },
    { key: 'hip_cm', label: 'Quadril', tx: 2, ty: 269, ax: 119, ay: 267 },
    { key: 'right_thigh_cm', label: 'Coxa direita', tx: 2, ty: 345, ax: 128, ay: 336 },
    { key: 'left_thigh_cm', label: 'Coxa esquerda', tx: 218, ty: 345, ax: 172, ay: 336 },
  ];
  for (const tag of tags) {
    const row = rows.find((entry) => entry.key === tag.key);
    const color = tag.key === 'weight_kg' || (tag.key === 'waist_cm' && highlightWaist) ? '#b08d57' : '#2c5f4f';
    const tx = x + tag.tx * scale;
    const ty = y + tag.ty * scale;
    const tagWidth = 80 * scale;
    lines.push({ text: '', x: tx + tagWidth / 2, y: ty + 18 * scale, x2: x + tag.ax * scale, y2: y + tag.ay * scale, size: 0, kind: 'line', color });
    lines.push({ text: '', x: tx - scale, y: ty - scale, width: tagWidth + 2 * scale, height: 36 * scale, size: 0, kind: 'rect', color });
    lines.push({ text: '', x: tx, y: ty, width: tagWidth, height: 34 * scale, size: 0, kind: 'rect', color: '#ffffff' });
    lines.push({ text: (row?.variation ?? '—').replace(/−/g, '-'), x: tx + 5 * scale, y: ty + 14 * scale, size: 12 * scale, color, bold: true });
    lines.push({ text: tag.label, x: tx + 5 * scale, y: ty + 27 * scale, size: 9 * scale, color });
  }
  return lines;
}
export function waistHasLargestReduction(rows: BodyReportRow[]) {
  const waist = rows.find((row) => row.key === 'waist_cm')?.difference;
  const changes = rows.filter((row) => row.key.endsWith('_cm') && row.key !== 'height_cm' && row.difference != null).map((row) => row.difference!);
  return waist != null && waist < 0 && waist === Math.min(...changes);
}
