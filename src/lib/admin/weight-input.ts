export function normalizeWeightInput(raw: string): string {
  const cleaned = raw.replace(',', '.').replace(/[^\d.]/g, '')
  const decimalIndex = cleaned.indexOf('.')
  return decimalIndex < 0
    ? cleaned
    : `${cleaned.slice(0, decimalIndex)}.${cleaned.slice(decimalIndex + 1).replace(/\./g, '').slice(0, 3)}`
}

export function formatWeightInput(raw: string): string {
  const normalized = normalizeWeightInput(raw)
  if (!normalized || normalized === '.') return ''
  const value = Number(normalized)
  return Number.isFinite(value) ? value.toFixed(3).replace('.', ',') : ''
}
