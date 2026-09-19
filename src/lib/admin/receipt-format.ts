export function formatReceiptCpf(value: string | null | undefined): string {
  const digits = (value ?? '').replace(/\D/g, '');
  return digits.length === 11
    ? digits.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4')
    : value?.trim() || 'não informado';
}

const units = ['zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
const teens = ['dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
const tens = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
const hundreds = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];

function integerInWords(value: number): string {
  if (value < 10) return units[value]!;
  if (value < 20) return teens[value - 10]!;
  if (value < 100) return tens[Math.floor(value / 10)] + (value % 10 ? ` e ${units[value % 10]}` : '');
  if (value === 100) return 'cem';
  if (value < 1000) return hundreds[Math.floor(value / 100)] + (value % 100 ? ` e ${integerInWords(value % 100)}` : '');
  const scale = value >= 1000000 ? 1000000 : 1000;
  const count = Math.floor(value / scale);
  const remainder = value % scale;
  const group = scale === 1000 ? (count === 1 ? 'mil' : `${integerInWords(count)} mil`) : `${integerInWords(count)} ${count === 1 ? 'milhão' : 'milhões'}`;
  const connector = remainder < 100 || remainder % 100 === 0 ? ' e ' : ' ';
  return group + (remainder ? connector + integerInWords(remainder) : '');
}

export function receiptAmountInWords(amount: number): string {
  // Convert to integer centavos first so decimal rounding matches the displayed amount.
  const totalCents = Math.round(Number(amount) * 100);
  const reais = Math.floor(totalCents / 100);
  const cents = totalCents % 100;
  const parts: string[] = [];
  if (reais || !cents) {
    const currency = reais === 1 ? 'real' : reais > 0 && reais % 1000000 === 0 ? 'de reais' : 'reais';
    parts.push(`${integerInWords(reais)} ${currency}`);
  }
  if (cents) parts.push(`${integerInWords(cents)} ${cents === 1 ? 'centavo' : 'centavos'}`);
  return parts.join(' e ');
}
