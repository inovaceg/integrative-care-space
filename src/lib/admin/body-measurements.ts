// O banco mantém a altura em centímetros; formulários e relatórios usam metros.
export function measurementForDisplay(key: string, value: number | null | undefined): number | null {
  if (value == null) return null;
  return key === "height_cm" ? value / 100 : value;
}

export function parseMeasurement(key: string, input: string | undefined): number | null {
  const text = input?.trim() ?? "";
  if (!text) return null;
  if (!/^(?:\d+(?:[.,]\d*)?|[.,]\d+)$/.test(text)) return NaN;
  const value = Number(text.replace(",", "."));
  if (!Number.isFinite(value)) return NaN;
  return key === "height_cm" ? Math.round(value * 10000) / 100 : value;
}

export function measurementForInput(key: string, value: number): string {
  return measurementForDisplay(key, value)!.toLocaleString("pt-BR", {
    useGrouping: false,
    maximumFractionDigits: key === "height_cm" ? 4 : 2,
  });
}
