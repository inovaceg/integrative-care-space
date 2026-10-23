import * as XLSX from "xlsx";

export type TacoImportRow = {
  codigo_taco: number;
  nome: string;
  energia_kcal: number | null;
  proteinas_g: number | null;
  carboidratos_g: number | null;
  gorduras_g: number | null;
  fibras_g: number | null;
  sodio_mg: number | null;
  excel_row: number;
  errors: string[];
  duplicate_in_file: boolean;
};

const headerKey = (value: unknown) => String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").replace(/[^a-z0-9]/g, "");
const sheetKey = (value: string) => headerKey(value);
const parseNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;
  let text = value.trim().replace(/\s/g, "");
  if (!text || /^[-–—]+$/.test(text)) return null;
  if (text.includes(",") && text.includes(".")) {
    text = text.lastIndexOf(",") > text.lastIndexOf(".") ? text.replace(/\./g, "").replace(",", ".") : text.replace(/,/g, "");
  } else if (text.includes(",")) text = text.replace(",", ".");
  const number = Number(text);
  return Number.isFinite(number) ? number : null;
};
const normalizeFoodName = (value: string) => headerKey(value);

export function parseTacoWorkbook(buffer: ArrayBuffer): TacoImportRow[] {
  const workbook = XLSX.read(buffer, { type: "array", cellDates: false });
  const sheetName = workbook.SheetNames.find((name) => sheetKey(name) === "alimentosprincipais");
  if (!sheetName) throw new Error("A planilha não contém a aba ‘Alimentos - principais’.");
  const sheet = workbook.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: null, raw: true });
  const requiredHeaders = ["codigotaco", "alimento", "energiakcal", "proteinasg", "carboidratosg", "gordurasg", "fibrasg", "sodiomg"];
  const headerRowIndex = matrix.slice(0, 20).findIndex((row) => {
    const keys = row.map(headerKey);
    return requiredHeaders.every((header) => keys.includes(header));
  });
  if (headerRowIndex < 0) throw new Error("Não encontrei os oito cabeçalhos esperados na aba ‘Alimentos - principais’. Confira os nomes das colunas.");
  const headerCells = matrix[headerRowIndex].map(headerKey);
  const indexes = Object.fromEntries(requiredHeaders.map((header) => [header, headerCells.indexOf(header)])) as Record<typeof requiredHeaders[number], number>;
  const seenCodes = new Set<number>();
  const rows: TacoImportRow[] = [];

  matrix.slice(headerRowIndex + 1).forEach((cells, index) => {
    if (!cells.some((cell) => cell !== null && cell !== undefined && String(cell).trim() !== "")) return;
    const code = parseNumber(cells[indexes.codigotaco]);
    const nameValue = cells[indexes.alimento];
    const name = typeof nameValue === "string" ? nameValue.trim() : String(nameValue ?? "").trim();
    const energy = parseNumber(cells[indexes.energiakcal]);
    const protein = parseNumber(cells[indexes.proteinasg]);
    const carbs = parseNumber(cells[indexes.carboidratosg]);
    const fat = parseNumber(cells[indexes.gordurasg]);
    const fiber = parseNumber(cells[indexes.fibrasg]);
    const sodium = parseNumber(cells[indexes.sodiomg]);
    const errors: string[] = [];
    if (code === null || !Number.isInteger(code) || code <= 0) errors.push("Código TACO inválido.");
    if (!name) errors.push("Nome do alimento ausente.");
    if (energy === null || protein === null || carbs === null) errors.push("Energia, proteínas e carboidratos são obrigatórios e devem ser numéricos.");
    const numericValues = [["energia", energy, 1000], ["proteínas", protein, 100], ["carboidratos", carbs, 100], ["gorduras", fat, 100], ["fibras", fiber, 100], ["sódio", sodium, 100000]] as const;
    for (const [label, value, maximum] of numericValues) {
      if (value !== null && (value < 0 || value > maximum)) errors.push(`${label} fora do intervalo plausível por 100 g.`);
    }
    const duplicateInFile = code !== null && seenCodes.has(code);
    if (code !== null && !duplicateInFile) seenCodes.add(code);
    rows.push({ codigo_taco: code ?? 0, nome: name, energia_kcal: energy, proteinas_g: protein, carboidratos_g: carbs, gorduras_g: fat, fibras_g: fiber, sodio_mg: sodium, excel_row: headerRowIndex + index + 2, errors, duplicate_in_file: duplicateInFile });
  });
  if (rows.length === 0) throw new Error("A aba ‘Alimentos - principais’ não contém registros de alimentos.");
  return rows;
}

export function checkTacoReferenceFoods(rows: TacoImportRow[]) {
  const controls = [
    { label: "Arroz integral cozido", test: (name: string) => name.includes("arrozintegral") && name.includes("cozido"), min: 118, max: 130, expected: 124 },
    { label: "Arroz branco tipo 1 cozido", test: (name: string) => name.includes("arroz") && name.includes("tipo1") && name.includes("cozido") && !name.includes("integral"), min: 120, max: 136, expected: 128 },
    { label: "Aveia em flocos crua", test: (name: string) => name.includes("aveiaemflocos") && name.includes("crua"), min: 380, max: 410, expected: 394 },
  ];
  return controls.map((control) => {
    const matches = rows.filter((row) => control.test(normalizeFoodName(row.nome)));
    const match = matches.find((row) => row.energia_kcal !== null);
    if (!match) return { label: control.label, expected: control.expected, actual: null as number | null, ok: false, detail: "Não encontrado na planilha." };
    const actual = match.energia_kcal;
    const ok = actual !== null && actual >= control.min && actual <= control.max;
    return { label: control.label, expected: control.expected, actual, ok, detail: ok ? `Conferido (${actual} kcal/100 g).` : `Valor divergente: ${actual} kcal/100 g; esperado aproximadamente ${control.expected}.` };
  });
}

export function validTacoRows(rows: TacoImportRow[]) {
  return rows.filter((row) => row.errors.length === 0 && !row.duplicate_in_file);
}
