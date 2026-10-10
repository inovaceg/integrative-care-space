export function parseMeasurement(input: string | undefined): number | null {
  const text = input?.trim() ?? "";
  if (!text) return null;
  if (!/^(?:\d+(?:[.,]\d*)?|[.,]\d+)$/.test(text)) return NaN;
  const value = Number(text.replace(",", "."));
  return Number.isFinite(value) ? value : NaN;
}

export function measurementForInput(value: number): string {
  return value.toLocaleString("pt-BR", {
    useGrouping: false,
    maximumFractionDigits: 2,
  });
}
