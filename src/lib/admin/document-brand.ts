type PathCommand =
  | ['M' | 'L', number, number]
  | ['C', number, number, number, number, number, number]
  | ['Z'];

const background: PathCommand[] = [
  ['M', 14, 0], ['L', 50, 0], ['C', 57.73, 0, 64, 6.27, 64, 14],
  ['L', 64, 50], ['C', 64, 57.73, 57.73, 64, 50, 64],
  ['L', 14, 64], ['C', 6.27, 64, 0, 57.73, 0, 50],
  ['L', 0, 14], ['C', 0, 6.27, 6.27, 0, 14, 0], ['Z'],
];
const psi: PathCommand[] = [
  ['M', 32, 14], ['L', 32, 51],
  ['M', 25, 51], ['L', 39, 51],
  ['M', 27, 14], ['L', 37, 14],
  ['M', 14, 18], ['L', 22, 18],
  ['M', 18, 18], ['L', 18, 29],
  ['C', 18, 39, 24, 43, 32, 43],
  ['C', 40, 43, 46, 39, 46, 29], ['L', 46, 18],
  ['M', 42, 18], ['L', 50, 18],
];

function svgPath(commands: PathCommand[]) {
  return commands.map(([command, ...values]) => `${command} ${values.join(' ')}`).join(' ');
}

function pdfPath(commands: PathCommand[]) {
  const operators = { M: 'm', L: 'l', C: 'c', Z: 'h' };
  return commands.map(([command, ...values]) => `${values.join(' ')} ${operators[command]}`).join('\n');
}

const size = 30;
const x = (595 - size) / 2;
const y = 14;
const scale = size / 64;
const color = '#2f8f82';
const strokeWidth = 3.5;

export const documentBrand = {
  transform: `translate(${x} ${y}) scale(${scale})`,
  backgroundPath: svgPath(background),
  symbolPath: svgPath(psi),
  color,
  strokeWidth,
};

// Both renderers use the same geometry; PDF's vertical axis runs bottom-to-top.
export const documentBrandPdf = `q
${scale} 0 0 ${-scale} ${x} ${842 - y} cm
${47 / 255} ${143 / 255} ${130 / 255} rg
${pdfPath(background)}
f
1 1 1 RG
${strokeWidth} w
1 J
1 j
${pdfPath(psi)}
S
Q`;
