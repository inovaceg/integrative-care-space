import { calculatePlanNutrition, isTrustedNutritionSource, sumVerifiedMeal } from "@/lib/admin/nutrition-calculations";
import type { DocumentPage } from "@/lib/admin/document-layout";

export type NutritionPdfItem = {
  food: string;
  portion: string;
  quantity_g?: number | undefined;
  calories_kcal?: number | undefined;
  calories_source?: string | undefined;
  protein_g?: number | undefined;
  protein_source?: string | undefined;
  carbohydrate_g?: number | undefined;
  carbohydrate_source?: string | undefined;
  fat_g?: number | undefined;
  fat_source?: string | undefined;
  fiber_g?: number | undefined;
  fiber_source?: string | undefined;
  alternatives?: string[] | undefined;
  notes?: string | undefined;
  source_code?: string | null | undefined;
  nutrition_per_100g?: { calories_kcal?: number | null; protein_g?: number | null; carbohydrate_g?: number | null; fat_g?: number | null; fiber_g?: number | null } | undefined;
};
export type NutritionPdfMeal = { name: string; items: NutritionPdfItem[]; notes?: string | undefined };
export type NutritionPdfPlan = { meals: NutritionPdfMeal[]; objective?: string; observations?: string[]; warnings?: string[] };
export type NutritionPdfTotals = { calories: number | null; protein: number | null; carbohydrate: number | null; fat: number | null; fiber: number | null };
export type NutritionPdfMealPart = { name: string; items: NutritionPdfItem[]; totals: NutritionPdfTotals; notes?: string; continued: boolean; finalPart: boolean };
export type NutritionPdfPage = { meals: NutritionPdfMealPart[]; appendix: boolean; number: number; count: number };
export type NutritionPdfDocument = { pages: NutritionPdfPage[]; patient: string; evaluationDate: string | null; objective: string; emissionDate: string; draft: boolean; status: string; observations: string[]; warnings: string[]; sources: string[]; reviewer: string | null };

const numberFormat = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
export const formatNutritionAmount = (value: number | null, unit: string) => value === null ? "—" : `${numberFormat.format(value)} ${unit}`;
const charLines = (text: string, max = 43) => {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    if (line && `${line} ${word}`.length > max) { lines.push(line); line = word; }
    else line = line ? `${line} ${word}` : word;
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
};
const rowHeight = (item: NutritionPdfItem) => 28 + (charLines(item.food).length - 1) * 11 + (item.alternatives?.length ? charLines(`Alternativas para avaliação: ${item.alternatives.join(" · ")}`, 78).length * 12 : 0);
const mealOverhead = 97;
const totalsFor = (items: NutritionPdfItem[]): NutritionPdfTotals => {
  const records = items as unknown as Array<Record<string, unknown>>;
  return {
    calories: sumVerifiedMeal(records, "calories_kcal", "calories_source"),
    protein: sumVerifiedMeal(records, "protein_g", "protein_source"),
    carbohydrate: sumVerifiedMeal(records, "carbohydrate_g", "carbohydrate_source"),
    fat: sumVerifiedMeal(records, "fat_g", "fat_source"),
    fiber: sumVerifiedMeal(records, "fiber_g", "fiber_source"),
  };
};
const mealHeight = (meal: NutritionPdfMeal) => mealOverhead + meal.items.reduce((sum, item) => sum + rowHeight(item), 0) + (meal.notes ? charLines(meal.notes, 78).length * 12 + 10 : 0);

export function buildNutritionPdfDocument(input: Omit<NutritionPdfDocument, "pages"> & { meals: NutritionPdfMeal[] }): NutritionPdfDocument {
  const calculation = calculatePlanNutrition(input.meals as unknown as Array<{ name?: string; items?: Array<Record<string, unknown>> }>);
  const calculatedMeals = calculation.meals as unknown as NutritionPdfMeal[];
  const pages: NutritionPdfPage[] = [{ meals: [], appendix: false, number: 1, count: 1 }];
  const currentPage = () => pages[pages.length - 1]!;
  let available = 520;
  const nextPage = () => {
    pages.push({ meals: [], appendix: false, number: pages.length + 1, count: 1 });
    available = 620;
  };
  for (const meal of calculatedMeals) {
    let remaining = [...meal.items];
    let continued = false;
    while (remaining.length) {
      const totalHeight = mealHeight({ ...meal, items: remaining });
      if (totalHeight <= available) {
        currentPage().meals.push({ name: meal.name, items: remaining, totals: totalsFor(meal.items), notes: meal.notes, continued, finalPart: true });
        available -= totalHeight;
        remaining = [];
        continue;
      }
      if (available < mealOverhead + rowHeight(remaining[0]) + 28) nextPage();
      const chunk: NutritionPdfItem[] = [];
      let chunkHeight = mealOverhead;
      while (remaining.length && (chunk.length === 0 || chunkHeight + rowHeight(remaining[0]) + 28 <= available)) {
        const item = remaining.shift()!;
        chunk.push(item);
        chunkHeight += rowHeight(item);
      }
      if (!chunk.length) {
        nextPage();
        continue;
      }
      currentPage().meals.push({ name: meal.name, items: chunk, totals: totalsFor(meal.items), continued, finalPart: remaining.length === 0 });
      available -= chunkHeight + 28;
      continued = true;
      if (remaining.length) nextPage();
      else if (meal.notes) currentPage().meals[currentPage().meals.length - 1]!.notes = meal.notes;
    }
    if (!meal.items.length) {
      const height = mealOverhead + 28;
      if (height > available) nextPage();
      pages[pages.length - 1].meals.push({ name: meal.name, items: [], totals: totalsFor([]), notes: meal.notes, continued: false, finalPart: true });
      available -= height;
    }
  }
  if (pages.some((page) => page.meals.length > 0) || available < 180) nextPage();
  pages[pages.length - 1].appendix = true;
  pages.forEach((page, index) => { page.number = index + 1; page.count = pages.length; });
  return { ...input, warnings: [...new Set([...input.warnings, ...calculation.issues])], pages };
}

const color = { dark: "#1f514b", sage: "#72958a", ink: "#334155", muted: "#64748b", pale: "#e6f0ed" };
const docLine = (text: string, x: number, y: number, size = 9, bold = false, textColor = color.ink): DocumentPage[number] => ({ text, x, y, size, bold, color: textColor });
const rule = (y: number, x = 52, width = 491): DocumentPage[number] => ({ text: "", x, y, size: 0, color: color.sage, kind: "rule", width });
const cap = (value: number | null, unit: string) => formatNutritionAmount(value, unit);
const macroText = (totals: NutritionPdfTotals) => `Proteínas: ${cap(totals.protein, "g")}  |  Carboidratos: ${cap(totals.carbohydrate, "g")}  |  Gorduras: ${cap(totals.fat, "g")}`;
const itemMacroText = (item: NutritionPdfItem) => `P ${cap(item.protein_g ?? null, "g")} · C ${cap(item.carbohydrate_g ?? null, "g")} · G ${cap(item.fat_g ?? null, "g")} · Fibra ${cap(item.fiber_g ?? null, "g")}`;

export function nutritionPdfDocumentPages(document: NutritionPdfDocument): DocumentPage[] {
  return document.pages.map((page) => {
    const lines: DocumentPage = [];
    let y = page.number === 1 ? 61 : 64;
    lines.push(docLine(page.number === 1 ? "PLANEJAMENTO ALIMENTAR" : "PLANEJAMENTO ALIMENTAR · CONTINUAÇÃO", 52, y, 18, true, color.dark));
    y += 24;
    if (document.draft) { lines.push(docLine("RASCUNHO — NÃO É PRESCRIÇÃO", 52, y, 10, true, "#9a5b16")); y += 17; }
    if (page.number === 1) {
      lines.push(docLine(`Paciente: ${document.patient}`, 52, y, 9.5, true)); y += 15;
      lines.push(docLine(`Data da avaliação: ${document.evaluationDate ?? "Não informada"}`, 52, y, 9)); y += 14;
      lines.push(docLine(`Objetivo: ${document.objective || "Não informado"}`, 52, y, 9)); y += 14;
      lines.push(docLine(`Data de emissão: ${document.emissionDate}`, 52, y, 9)); y += 15;
      if (document.reviewer) { lines.push(docLine(document.reviewer, 52, y, 8.5, false, color.muted)); y += 13; }
      lines.push(rule(y, 52, 491)); y += 16;
    } else {
      y += 5;
      lines.push(rule(y, 52, 491)); y += 16;
    }
    for (const meal of page.meals) {
      lines.push(docLine(`${meal.name.toLocaleUpperCase("pt-BR")}${meal.continued ? " · CONTINUAÇÃO" : ""}`, 52, y, 11.5, true, color.dark)); y += 17;
      lines.push(docLine("Alimento", 52, y, 8.5, true, color.sage));
      lines.push(docLine("Quantidade", 365, y, 8.5, true, color.sage));
      lines.push(docLine("Calorias", 478, y, 8.5, true, color.sage)); y += 7;
      lines.push(rule(y, 52, 491)); y += 9;
      for (const item of meal.items) {
        const nameLines = charLines(item.food);
        nameLines.forEach((name, index) => lines.push(docLine(name, 52, y + index * 11, 9)));
        lines.push(docLine(item.portion || (item.quantity_g !== undefined ? `${numberFormat.format(item.quantity_g)} g` : "—"), 365, y, 9));
        lines.push(docLine(cap(item.calories_kcal ?? null, "kcal"), 478, y, 9));
        y += nameLines.length * 11 + 6;
        lines.push(docLine(itemMacroText(item), 62, y, 7.5, false, color.muted));
        y += 11;
        if (item.alternatives?.length) {
          lines.push(docLine(`Alternativas para avaliação: ${item.alternatives.join(" · ")}`, 62, y, 8, false, color.muted));
          y += 12;
        }
      }
      lines.push(rule(y, 52, 491)); y += 13;
      if (meal.finalPart) {
        lines.push(docLine(`Total da refeição: ${cap(meal.totals.calories, "kcal")}`, 52, y, 9.5, true, color.dark)); y += 14;
        lines.push(docLine(macroText(meal.totals), 52, y, 8.5, false, color.muted)); y += 14;
        if (meal.totals.fiber !== null) { lines.push(docLine(`Fibras: ${cap(meal.totals.fiber, "g")}`, 52, y, 8.5, false, color.muted)); y += 12; }
      }
      if (meal.notes) { charLines(meal.notes, 78).forEach((part) => { lines.push(docLine(part, 52, y, 8.5, false, color.muted)); y += 12; }); }
      y += 10;
    }
    if (page.appendix) {
      y += 2;
      lines.push(rule(y, 52, 491)); y += 15;
      const daily = totalsFor(document.pages.flatMap((item) => item.meals.flatMap((meal) => meal.items)));
      lines.push(docLine("RESUMO NUTRICIONAL DIÁRIO", 52, y, 11, true, color.dark)); y += 17;
      lines.push(docLine(`Calorias: ${cap(daily.calories, "kcal")}  |  Proteínas: ${cap(daily.protein, "g")}`, 52, y, 9, true)); y += 14;
      lines.push(docLine(`Carboidratos: ${cap(daily.carbohydrate, "g")}  |  Gorduras: ${cap(daily.fat, "g")}${daily.fiber === null ? "" : `  |  Fibras: ${cap(daily.fiber, "g")}`}`, 52, y, 9, true)); y += 19;
      if (document.observations.length) {
        lines.push(docLine("ORIENTAÇÕES", 52, y, 10.5, true, color.dark)); y += 15;
        for (const observation of document.observations) {
          charLines(observation, 78).forEach((part) => { lines.push(docLine(part, 52, y, 8.5)); y += 12; });
          y += 4;
        }
      }
      if (document.warnings.length) {
        lines.push(docLine("ATENÇÃO", 52, y, 9, true, "#9a5b16")); y += 13;
        for (const warning of document.warnings) charLines(warning, 78).forEach((part) => { lines.push(docLine(part, 52, y, 8)); y += 11; });
      }
      if (document.sources.length) {
        y += 8;
        lines.push(docLine("FONTES DOS DADOS NUTRICIONAIS", 52, y, 9, true, color.dark)); y += 13;
        lines.push(docLine("Referências de composição informadas no catálogo:", 52, y, 8, false, color.muted)); y += 12;
        for (const source of document.sources) {
          charLines(source, 78).forEach((part) => { lines.push(docLine(part, 52, y, 8, false, color.muted)); y += 11; });
        }
      }
    }
    lines.push(docLine(`Página ${page.number} de ${page.count}`, 264, 815, 7.5, false, color.muted));
    return lines;
  });
}

export function trustedNutritionItem(item: NutritionPdfItem) {
  return isTrustedNutritionSource(item.calories_source) && isTrustedNutritionSource(item.protein_source) && isTrustedNutritionSource(item.carbohydrate_source) && isTrustedNutritionSource(item.fat_source);
}
