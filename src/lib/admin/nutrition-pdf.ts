import { calculatePlanNutrition, isTrustedNutritionSource } from "@/lib/admin/nutrition-calculations";
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
export type NutritionPdfTotals = { calories: number | null; protein: number | null; carbohydrate: number | null; fat: number | null; fiber: number | null };
export type NutritionPdfMealPart = { name: string; items: NutritionPdfItem[]; totals: NutritionPdfTotals; notes?: string; continued: boolean; finalPart: boolean };
export type NutritionPdfSection = { title: string; lines: string[]; kind: "general" | "review" | "source" };
export type NutritionPdfPage = { meals: NutritionPdfMealPart[]; summary: boolean; appendix: boolean; sections: NutritionPdfSection[]; number: number; count: number };
export type NutritionPdfEnergy = { bmr_kcal: number | null; estimated_daily_kcal: number | null; adjusted_daily_kcal: number | null; professional_reviewed: boolean; activity_factor: number | null; activity_level: string; objective: string | null };
export type NutritionPdfDocument = { pages: NutritionPdfPage[]; patient: string; evaluationDate: string | null; objective: string; emissionDate: string; draft: boolean; status: string; observations: string[]; warnings: string[]; sources: string[]; reviewer: string | null; energy?: NutritionPdfEnergy | null; dailyTotals: NutritionPdfTotals };

const numberFormat = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
export const formatNutritionAmount = (value: number | null, unit: string) => value === null ? "—" : `${numberFormat.format(value)} ${unit}`;
const colors = { dark: "#174b45", green: "#2f756b", sage: "#6f9b90", ink: "#263b39", muted: "#60716e", line: "#d8e2df", pale: "#f0f5f3", amber: "#8b5b21", amberBg: "#fbf5e9" };
const line = (text: string, x: number, y: number, size = 10, bold = false, color = colors.ink): DocumentPage[number] => ({ text, x, y, size, bold, color });
const rule = (y: number, x = 52, width = 491, color = colors.line): DocumentPage[number] => ({ text: "", x, y, size: 0, color, kind: "rule", width });
const cap = (value: number | null, unit: string) => formatNutritionAmount(value, unit);
const unapprovedNotice = (_status: string) => "Material para fins de estudo — não validado para uso profissional.";
const fitLines = (text: string, max = 88) => {
  const words = text.split(/\s+/).filter(Boolean);
  const rows: string[] = [];
  let row = "";
  for (const word of words) {
    if (row && `${row} ${word}`.length > max) { rows.push(row); row = word; }
    else row = row ? `${row} ${word}` : word;
  }
  if (row) rows.push(row);
  return rows.length ? rows : [""];
};
const itemHeight = (item: NutritionPdfItem) => 32 + Math.max(0, fitLines(item.food, 45).length - 1) * 11 + (item.alternatives?.length ? fitLines(`Substituições para avaliação: ${item.alternatives.join(" · ")}`, 84).length * 11 : 0) + (item.notes ? fitLines(item.notes, 84).length * 11 : 0);
const mealHeight = (meal: NutritionPdfMeal, _totals: NutritionPdfTotals, includeTotal = true) => 42 + meal.items.reduce((height, item) => height + itemHeight(item), 0) + (includeTotal ? 23 : 0) + (meal.notes ? fitLines(meal.notes, 84).length * 11 : 0);
const totalsFrom = (totals: Record<string, number | null>): NutritionPdfTotals => ({ calories: totals.calories_kcal ?? null, protein: totals.protein_g ?? null, carbohydrate: totals.carbohydrate_g ?? null, fat: totals.fat_g ?? null, fiber: totals.fiber_g ?? null });
const tidyInstruction = (value: string) => value.replace(/\(\s*\)/g, "").replace(/calories_kcal/g, "calorias").replace(/protein_g/g, "proteínas").replace(/carbohydrate_g/g, "carboidratos").replace(/fat_g/g, "gorduras").replace(/fiber_g/g, "fibras").replace(/\s+/g, " ").trim();

export function buildNutritionPdfDocument(input: Omit<NutritionPdfDocument, "pages" | "dailyTotals"> & { meals: NutritionPdfMeal[] }): NutritionPdfDocument {
  const calculation = calculatePlanNutrition(input.meals as unknown as Array<{ name?: string; items?: Array<Record<string, unknown>> }>);
  const calculatedMeals = calculation.meals as unknown as NutritionPdfMeal[];
  const mealTotals = calculation.meals.map((meal) => totalsFrom(meal.totals as unknown as Record<string, number | null>));
  const dailyTotals = totalsFrom(calculation.totals as unknown as Record<string, number | null>);
  const pages: NutritionPdfPage[] = [{ meals: [], summary: true, appendix: false, sections: [], number: 1, count: 1 }];
  const patientLines = fitLines(input.patient, 48).length;
  const objectiveLines = fitLines(input.objective || "Não informado", 42).length;
  const firstContentY = 153 + 22 + patientLines * 13 + objectiveLines * 14 + (input.reviewer ? 14 : 0) + (input.draft ? 27 : 14) + 55 + 12 + 56;
  const pageCapacity = (page: NutritionPdfPage) => page.number === 1 ? 700 - firstContentY : 508 - (input.draft ? 14 : 0);
  const pageUsed = (page: NutritionPdfPage) => page.meals.reduce((sum, meal) => sum + mealHeight({ name: meal.name, items: meal.items, notes: meal.notes }, meal.totals, meal.finalPart), 0) + page.sections.reduce((sum, section) => sum + 26 + section.lines.length * 12, 0);
  const newPage = () => pages.push({ meals: [], summary: false, appendix: false, sections: [], number: pages.length + 1, count: 1 });

  calculatedMeals.forEach((meal, mealIndex) => {
    const fullHeight = mealHeight(meal, mealTotals[mealIndex]!);
    let page = pages[pages.length - 1]!;
    let remainingCapacity = pageCapacity(page) - pageUsed(page);
    if (fullHeight <= pageCapacity(page) && fullHeight > remainingCapacity) {
      newPage();
      page = pages[pages.length - 1]!;
      remainingCapacity = pageCapacity(page);
    }
    if (fullHeight <= remainingCapacity) {
      page.meals.push({ name: meal.name, items: meal.items, totals: mealTotals[mealIndex]!, notes: meal.notes, continued: false, finalPart: true });
      return;
    }
    let remaining = [...meal.items];
    let continued = false;
    while (remaining.length) {
      page = pages[pages.length - 1]!;
      remainingCapacity = pageCapacity(page) - pageUsed(page);
      const itemLimit = Math.max(120, remainingCapacity);
      const chunk: NutritionPdfItem[] = [];
      let used = 43 + 8;
      while (remaining.length && (chunk.length === 0 || used + itemHeight(remaining[0]) + 38 <= itemLimit)) {
        const item = remaining.shift()!;
        chunk.push(item);
        used += itemHeight(item);
      }
      page.meals.push({ name: meal.name, items: chunk, totals: mealTotals[mealIndex]!, notes: remaining.length ? undefined : meal.notes, continued, finalPart: remaining.length === 0 });
      continued = true;
      if (remaining.length) newPage();
    }
  });

  const general = input.observations.map(tidyInstruction).filter((value) => value.length >= 5 && !/\(\s*\)|\b(?:undefined|null)\b/i.test(value)).flatMap((value) => fitLines(value, 87));
  const review = [...new Set([...input.warnings, ...calculation.issues].map(tidyInstruction).filter((value) => value.length >= 5))].flatMap((value) => fitLines(value, 87));
  const sourceLines = input.sources.length ? fitLines([...new Set(input.sources)].join(" · "), 92) : [];
  const appendixSections: NutritionPdfSection[] = [
    ...(general.length ? [{ title: "ORIENTAÇÕES GERAIS", lines: general, kind: "general" as const }] : []),
    ...(review.length ? [{ title: "OBSERVAÇÕES PARA REVISÃO PROFISSIONAL", lines: review, kind: "review" as const }] : []),
    ...(sourceLines.length ? [{ title: "FONTES NUTRICIONAIS", lines: sourceLines, kind: "source" as const }] : []),
  ];
  for (const section of appendixSections) {
    let page = pages[pages.length - 1]!;
    let used = pageUsed(page);
    const capacity = pageCapacity(page);
    if (used + 26 + section.lines.length * 12 > capacity) {
      newPage();
      page = pages[pages.length - 1]!;
      used = 0;
    }
    const maxLines = Math.max(1, Math.floor((pageCapacity(page) - used - 26) / 12));
    for (let start = 0; start < section.lines.length; start += maxLines) {
      if (start > 0) { newPage(); page = pages[pages.length - 1]!; }
      page.sections.push({ ...section, title: start === 0 ? section.title : `${section.title} · CONTINUAÇÃO`, lines: section.lines.slice(start, start + maxLines) });
    }
  }
  if (appendixSections.length) pages[pages.length - 1]!.appendix = true;
  pages.forEach((page, index) => { page.number = index + 1; page.count = pages.length; });
  return { ...input, dailyTotals, warnings: review, pages };
}

const nutritionSummaryLines = (document: NutritionPdfDocument, y: number): DocumentPage => {
  const lines: DocumentPage = [];
  lines.push(line("RESUMO NUTRICIONAL DIÁRIO", 52, y, 10, true, colors.dark));
  const values = [
    ["CALORIAS", cap(document.dailyTotals.calories, "kcal")],
    ["PROTEÍNAS", cap(document.dailyTotals.protein, "g")],
    ["CARBOIDRATOS", cap(document.dailyTotals.carbohydrate, "g")],
    ["GORDURAS", cap(document.dailyTotals.fat, "g")],
    ...(document.dailyTotals.fiber === null ? [] : [["FIBRAS", cap(document.dailyTotals.fiber, "g")]]),
  ];
  const columnWidth = 491 / values.length;
  values.forEach(([label, value], index) => {
    const x = 52 + index * columnWidth;
    lines.push(line(label, x + 5, y + 19, 8.5, true, colors.muted));
    lines.push(line(value, x + 5, y + 38, 12.5, true, colors.dark));
  });
  return lines;
};

function mealDocumentLines(meal: NutritionPdfMealPart, startY: number): DocumentPage {
  const lines: DocumentPage = [];
  let y = startY;
  lines.push(line(`${meal.name.toLocaleUpperCase("pt-BR")}${meal.continued ? " · CONTINUAÇÃO" : ""}`, 52, y, 12.5, true, colors.dark));
  y += 17;
  lines.push(line("ALIMENTO", 52, y, 8.5, true, colors.sage));
  lines.push(line("QUANTIDADE", 365, y, 8.5, true, colors.sage));
  lines.push(line("CALORIAS", 474, y, 8.5, true, colors.sage));
  y += 7;
  lines.push(rule(y));
  y += 10;
  for (const item of meal.items) {
    const names = fitLines(item.food, 45);
    names.forEach((name, index) => lines.push(line(name, 52, y + index * 11, 10.5, false, colors.ink)));
    lines.push(line(item.portion || (item.quantity_g !== undefined ? `${numberFormat.format(item.quantity_g)} g` : "—"), 365, y, 9.5, false, colors.ink));
    lines.push(line(cap(item.calories_kcal ?? null, "kcal"), 474, y, 9.5, true, colors.ink));
    y += names.length * 11 + 2;
    const macro = `Proteínas ${cap(item.protein_g ?? null, "g")}  ·  Carboidratos ${cap(item.carbohydrate_g ?? null, "g")}  ·  Gorduras ${cap(item.fat_g ?? null, "g")}${item.fiber_g == null ? "" : `  ·  Fibras ${cap(item.fiber_g, "g")}`}`;
    lines.push(line(macro, 63, y, 9, false, colors.muted));
    y += 12;
    if (item.alternatives?.length) {
      for (const alt of fitLines(`Substituições para avaliação: ${item.alternatives.join(" · ")}`, 84)) {
        lines.push(line(alt, 63, y, 9, false, colors.muted)); y += 11;
      }
    }
    if (item.notes) for (const note of fitLines(item.notes, 84)) { lines.push(line(note, 63, y, 9, false, colors.muted)); y += 11; }
    lines.push(rule(y, 63, 480, "#e7ecea"));
    y += 7;
  }
  if (meal.finalPart) {
    lines.push(line(`Total da refeição: ${cap(meal.totals.calories, "kcal")}`, 52, y, 10.5, true, colors.dark));
    y += 14;
    lines.push(line(`Proteínas ${cap(meal.totals.protein, "g")}  ·  Carboidratos ${cap(meal.totals.carbohydrate, "g")}  ·  Gorduras ${cap(meal.totals.fat, "g")}${meal.totals.fiber === null ? "" : `  ·  Fibras ${cap(meal.totals.fiber, "g")}`}`, 52, y, 9, false, colors.muted));
  }
  return lines;
}

export function nutritionPdfDocumentPages(document: NutritionPdfDocument): DocumentPage[] {
  return document.pages.map((page) => {
    const lines: DocumentPage = [];
    let y: number;
    if (page.number === 1) {
      y = 153;
      lines.push(line(document.draft ? "PROPOSTA ALIMENTAR" : "PLANEJAMENTO ALIMENTAR", 52, y, 17, true, colors.dark));
      y += 22;
      const patientLines = fitLines(document.patient, 48);
      patientLines.forEach((text, index) => lines.push(line(`Paciente: ${text}`, 52, y + index * 13, 11, true, colors.ink)));
      if (document.evaluationDate) lines.push(line(`Avaliação: ${document.evaluationDate}`, 410, y, 9, false, colors.muted));
      y += patientLines.length * 13;
      const objectiveLines = fitLines(document.objective || "Não informado", 42);
      objectiveLines.forEach((text, index) => lines.push(line(index === 0 ? `Objetivo: ${text}` : text, 52, y + index * 14, 10, false, colors.ink)));
      lines.push(line(`Elaboração: ${document.emissionDate}`, 410, y, 9.5, false, colors.ink));
      y += objectiveLines.length * 14;
      if (document.reviewer) { lines.push(line(document.reviewer, 52, y, 9, false, colors.muted)); y += 14; }
      lines.push(line(`SITUAÇÃO: ${document.status.toLocaleUpperCase("pt-BR")}`, 52, y, 9.5, true, document.draft ? colors.amber : colors.green));
      y += 14;
      if (document.draft) { lines.push(line(unapprovedNotice(document.status), 52, y, 8.5, false, colors.amber)); y += 13; }
      lines.push(...nutritionSummaryLines(document, y));
      y += 55;
      lines.push(rule(y));
      y += 12;
    } else {
      y = 153;
      lines.push(line(`${document.draft ? "PROPOSTA ALIMENTAR" : "PLANEJAMENTO ALIMENTAR"} · CONTINUAÇÃO`, 52, y, 13, true, colors.dark));
      y += 23;
      if (document.draft) { lines.push(line(unapprovedNotice(document.status), 52, y, 8.5, false, colors.amber)); y += 14; }
      lines.push(rule(y));
      y += 16;
    }
    if (page.number === 1 && document.energy) {
      const energy = document.energy;
      lines.push(line("NECESSIDADES ENERGÉTICAS", 52, y, 10, true, colors.dark));
      y += 14;
      lines.push(line(`TMB estimada: ${cap(energy.bmr_kcal, "kcal/dia")} · GET estimado: ${cap(energy.estimated_daily_kcal, "kcal/dia")}`, 52, y, 9, false, colors.ink));
      y += 12;
      lines.push(line(`Meta diária ${energy.professional_reviewed ? "validada" : "estimada, não aprovada"}: ${cap(energy.professional_reviewed ? energy.adjusted_daily_kcal : null, "kcal/dia")} · Cardápio: ${cap(document.dailyTotals.calories, "kcal/dia")}`, 52, y, 9, true, energy.professional_reviewed ? colors.green : colors.amber));
      y += 12;
      const energyDifference = energy.professional_reviewed && energy.adjusted_daily_kcal && document.dailyTotals.calories !== null ? document.dailyTotals.calories - energy.adjusted_daily_kcal : null;
      lines.push(line(`Diferença entre cardápio e meta: ${energyDifference === null ? "não calculada" : `${cap(energyDifference, "kcal")} (${numberFormat.format(energyDifference / energy.adjusted_daily_kcal! * 100)}%)`}`, 52, y, 8.5, false, colors.muted));
      y += 18;
    }
    for (const meal of page.meals) {
      lines.push(...mealDocumentLines(meal, y));
      y += mealHeight({ name: meal.name, items: meal.items, notes: meal.notes }, meal.totals, meal.finalPart);
    }
    for (const section of page.sections) {
      y += 4;
      const color = section.kind === "review" ? colors.amber : colors.dark;
      lines.push(line(section.title, 52, y, 10.5, true, color));
      y += 15;
      for (const text of section.lines) {
        for (const part of fitLines(text, 87)) {
          lines.push(line(`• ${part}`, 56, y, 9.5, false, colors.ink));
          y += 12;
        }
      }
      y += 7;
    }
    lines.push(line(`Página ${page.number} de ${page.count}  ·  Planejamento alimentar  ·  Emissão: ${document.emissionDate}`, 123, 749, 8.5, false, colors.muted));
    return lines;
  });
}

export function trustedNutritionItem(item: NutritionPdfItem) {
  return isTrustedNutritionSource(item.calories_source) && isTrustedNutritionSource(item.protein_source) && isTrustedNutritionSource(item.carbohydrate_source) && isTrustedNutritionSource(item.fat_source);
}
