export type DemoFood = {
  id: string;
  name: string;
  category: string;
  kcal100g: number;
  protein100g: number;
  carbs100g: number;
  fat100g: number;
  householdMeasure: string;
  allergens: string[];
  allergenInfoKnown?: boolean;
  restrictions: string[];
  gluten: "free" | "contains" | "unknown";
  lactose: "free" | "contains" | "unknown";
  source: string;
  license: string;
  status: "draft" | "demo_validated";
  demoOnly: true;
  fiber100g?: number | null;
  calciumMg100g?: number | null;
  ironMg100g?: number | null;
  sodiumMg100g?: number | null;
  potassiumMg100g?: number | null;
  nutritionMissing?: string[];
  importCode?: string;
  importNotes?: string;
};

export type DemoItem = { foodId: string; grams: number; alternatives: string[] };
export type DemoMealTemplate = {
  id: string;
  name: string;
  category: string;
  time: string;
  items: DemoItem[];
};
export type DemoMeal = DemoMealTemplate & {
  totals: Nutrients;
};
export type Nutrients = { kcal: number; protein: number; carbs: number; fat: number };
export type DemoPlan = {
  label: "SIMULAÇÃO FICTÍCIA — NÃO É PRESCRIÇÃO";
  days: Array<{ day: number; meals: DemoMeal[]; totals: Nutrients }>;
  targets: { kcal: number; protein: number };
};
export type DemoGenerationInput = {
  days: number;
  targetKcal: number | null;
  targetProtein: number | null;
  allergies: string[];
  restrictions: string[];
  clinicalReviewConfirmed: boolean;
};

export const demoFoods: DemoFood[] = [
  { id: "demo-oats", name: "Aveia em flocos (fictícia)", category: "Cereais", kcal100g: 380, protein100g: 13, carbs100g: 68, fat100g: 7, householdMeasure: "1 colher de sopa = 10 g", allergens: ["glúten"], restrictions: [], gluten: "contains", lactose: "free", source: "DADO FICTÍCIO DE DEMONSTRAÇÃO", license: "Não licenciado para uso clínico", status: "demo_validated", demoOnly: true },
  { id: "demo-yogurt", name: "Iogurte natural (fictício)", category: "Laticínios", kcal100g: 60, protein100g: 5, carbs100g: 7, fat100g: 2, householdMeasure: "1 pote = 170 g", allergens: ["leite"], restrictions: [], gluten: "free", lactose: "contains", source: "DADO FICTÍCIO DE DEMONSTRAÇÃO", license: "Não licenciado para uso clínico", status: "demo_validated", demoOnly: true },
  { id: "demo-banana", name: "Banana (fictícia)", category: "Frutas", kcal100g: 89, protein100g: 1.1, carbs100g: 23, fat100g: 0.3, householdMeasure: "1 unidade média = 100 g", allergens: [], restrictions: [], gluten: "free", lactose: "free", source: "DADO FICTÍCIO DE DEMONSTRAÇÃO", license: "Não licenciado para uso clínico", status: "demo_validated", demoOnly: true },
  { id: "demo-rice", name: "Arroz cozido (fictício)", category: "Cereais", kcal100g: 130, protein100g: 2.7, carbs100g: 28, fat100g: 0.3, householdMeasure: "1 colher de servir = 80 g", allergens: [], restrictions: [], gluten: "free", lactose: "free", source: "DADO FICTÍCIO DE DEMONSTRAÇÃO", license: "Não licenciado para uso clínico", status: "demo_validated", demoOnly: true },
  { id: "demo-beans", name: "Feijão cozido (fictício)", category: "Leguminosas", kcal100g: 76, protein100g: 4.8, carbs100g: 14, fat100g: 0.5, householdMeasure: "1 concha pequena = 100 g", allergens: [], restrictions: [], gluten: "free", lactose: "free", source: "DADO FICTÍCIO DE DEMONSTRAÇÃO", license: "Não licenciado para uso clínico", status: "demo_validated", demoOnly: true },
  { id: "demo-chicken", name: "Frango grelhado (fictício)", category: "Proteínas", kcal100g: 165, protein100g: 31, carbs100g: 0, fat100g: 3.6, householdMeasure: "1 filé pequeno = 100 g", allergens: [], restrictions: [], gluten: "free", lactose: "free", source: "DADO FICTÍCIO DE DEMONSTRAÇÃO", license: "Não licenciado para uso clínico", status: "demo_validated", demoOnly: true },
  { id: "demo-vegetables", name: "Legumes cozidos (fictícios)", category: "Vegetais", kcal100g: 35, protein100g: 2, carbs100g: 7, fat100g: 0.2, householdMeasure: "1 xícara = 130 g", allergens: [], restrictions: [], gluten: "free", lactose: "free", source: "DADO FICTÍCIO DE DEMONSTRAÇÃO", license: "Não licenciado para uso clínico", status: "demo_validated", demoOnly: true },
  { id: "demo-potato", name: "Batata cozida (fictícia)", category: "Tubérculos", kcal100g: 86, protein100g: 1.7, carbs100g: 20, fat100g: 0.1, householdMeasure: "1 unidade média = 150 g", allergens: [], restrictions: [], gluten: "free", lactose: "free", source: "DADO FICTÍCIO DE DEMONSTRAÇÃO", license: "Não licenciado para uso clínico", status: "demo_validated", demoOnly: true },
  { id: "demo-fish", name: "Peixe grelhado (fictício)", category: "Proteínas", kcal100g: 140, protein100g: 26, carbs100g: 0, fat100g: 3, householdMeasure: "1 filé = 120 g", allergens: ["peixe"], restrictions: [], gluten: "free", lactose: "free", source: "DADO FICTÍCIO DE DEMONSTRAÇÃO", license: "Não licenciado para uso clínico", status: "demo_validated", demoOnly: true },
];

export const demoMealTemplates: DemoMealTemplate[] = [
  { id: "demo-breakfast", name: "Desjejum demonstrativo", category: "Desjejum", time: "08:00", items: [{ foodId: "demo-oats", grams: 60, alternatives: [] }, { foodId: "demo-yogurt", grams: 200, alternatives: [] }, { foodId: "demo-banana", grams: 120, alternatives: [] }] },
  { id: "demo-lunch", name: "Almoço demonstrativo", category: "Almoço", time: "12:30", items: [{ foodId: "demo-rice", grams: 200, alternatives: [] }, { foodId: "demo-beans", grams: 130, alternatives: [] }, { foodId: "demo-chicken", grams: 130, alternatives: ["demo-fish"] }, { foodId: "demo-vegetables", grams: 150, alternatives: [] }] },
  { id: "demo-dinner", name: "Jantar demonstrativo", category: "Jantar", time: "19:30", items: [{ foodId: "demo-potato", grams: 300, alternatives: ["demo-rice"] }, { foodId: "demo-fish", grams: 120, alternatives: ["demo-chicken"] }, { foodId: "demo-vegetables", grams: 150, alternatives: [] }] },
  { id: "demo-snack", name: "Lanche demonstrativo", category: "Lanche", time: "16:00", items: [{ foodId: "demo-banana", grams: 150, alternatives: [] }, { foodId: "demo-yogurt", grams: 170, alternatives: [] }] },
];

export class DemoGenerationError extends Error {}

function matchesRestriction(food: DemoFood, allergies: string[], restrictions: string[]) {
  const blockedAllergens = allergies.map((value) => value.trim().toLocaleLowerCase("pt-BR")).filter(Boolean);
  const blockedRestrictions = restrictions.map((value) => value.trim().toLocaleLowerCase("pt-BR")).filter(Boolean);
  if (food.allergens.some((allergen) => blockedAllergens.includes(allergen.toLocaleLowerCase("pt-BR")))) return true;
  if (blockedRestrictions.includes("sem glúten") && food.gluten !== "free") return true;
  if (blockedRestrictions.includes("sem lactose") && food.lactose !== "free") return true;
  return food.restrictions.some((restriction) => blockedRestrictions.includes(restriction.toLocaleLowerCase("pt-BR")));
}

function totalsForItems(items: DemoItem[], foods: DemoFood[]): Nutrients {
  return items.reduce((totals, item) => {
    const food = foods.find((candidate) => candidate.id === item.foodId);
    if (!food) return totals;
    const factor = item.grams / 100;
    totals.kcal += food.kcal100g * factor;
    totals.protein += food.protein100g * factor;
    totals.carbs += food.carbs100g * factor;
    totals.fat += food.fat100g * factor;
    return totals;
  }, { kcal: 0, protein: 0, carbs: 0, fat: 0 });
}

const roundNutrients = (value: Nutrients): Nutrients => ({ kcal: Math.round(value.kcal), protein: Math.round(value.protein * 10) / 10, carbs: Math.round(value.carbs * 10) / 10, fat: Math.round(value.fat * 10) / 10 });
const hasCompleteMacros = (food: DemoFood) => !food.nutritionMissing?.some((key) => ["energia_kcal_100g", "proteinas_g_100g", "carboidratos_g_100g", "gorduras_g_100g"].includes(key));

export function isDemoFoodAllowed(food: DemoFood, allergies: string[], restrictions: string[]): boolean {
  return food.status === "demo_validated" && food.demoOnly && food.allergenInfoKnown !== false && hasCompleteMacros(food) && !matchesRestriction(food, allergies, restrictions);
}

export function recalculateDemoMeal(meal: DemoMealTemplate, foods: DemoFood[]): DemoMeal {
  const items = meal.items.map((item) => ({ ...item, alternatives: [...item.alternatives] }));
  return { ...meal, items, totals: roundNutrients(totalsForItems(items, foods)) };
}

export function recalculateDemoPlan(plan: DemoPlan, foods: DemoFood[]): DemoPlan {
  return { ...plan, days: plan.days.map((day) => {
    const meals = day.meals.map((meal) => recalculateDemoMeal(meal, foods));
    return { ...day, meals, totals: roundNutrients(meals.reduce((total, meal) => ({ kcal: total.kcal + meal.totals.kcal, protein: total.protein + meal.totals.protein, carbs: total.carbs + meal.totals.carbs, fat: total.fat + meal.totals.fat }), { kcal: 0, protein: 0, carbs: 0, fat: 0 })) };
  }) };
}

export function generateDemoPlan(input: DemoGenerationInput, foods: DemoFood[] = demoFoods, templates: DemoMealTemplate[] = demoMealTemplates): DemoPlan {
  if (![1, 3, 7].includes(input.days)) throw new DemoGenerationError("Escolha um período de 1, 3 ou 7 dias.");
  if (!input.targetKcal || !Number.isFinite(input.targetKcal) || input.targetKcal < 500) throw new DemoGenerationError("Informe uma meta energética demonstrativa válida.");
  if (!input.targetProtein || !Number.isFinite(input.targetProtein) || input.targetProtein < 1) throw new DemoGenerationError("Informe uma meta proteica demonstrativa válida.");
  if (!input.clinicalReviewConfirmed) throw new DemoGenerationError("Confirme que alergias, intolerâncias e restrições foram revisadas neste cenário fictício.");
  const targetKcal = input.targetKcal;
  const targetProtein = input.targetProtein;

  const usableFoods = foods.filter((food) => food.status === "demo_validated" && food.demoOnly && hasCompleteMacros(food));
  const safeTemplates = templates.filter((template) => template.items.length > 0 && template.items.every((item) => {
    const food = usableFoods.find((candidate) => candidate.id === item.foodId);
    return Boolean(food && food.allergenInfoKnown !== false && !matchesRestriction(food, input.allergies, input.restrictions));
  }));
  const mealCategories = [...new Set(safeTemplates.map((template) => template.category))];
  if (mealCategories.length < 3) throw new DemoGenerationError("Não há refeições demonstrativas suficientes compatíveis com as restrições selecionadas.");

  const baseDay = ["Desjejum", "Almoço", "Jantar"].map((category) => safeTemplates.find((template) => template.category === category)).filter((meal): meal is DemoMealTemplate => Boolean(meal));
  if (baseDay.length !== 3) throw new DemoGenerationError("O catálogo demonstrativo não possui desjejum, almoço e jantar compatíveis.");
  const baseKcal = baseDay.reduce((sum, meal) => sum + totalsForItems(meal.items, usableFoods).kcal, 0);
  const portionFactor = targetKcal / baseKcal;
  if (portionFactor < 0.75 || portionFactor > 1.25) throw new DemoGenerationError("A meta está fora da faixa de ajuste demonstrativa de porções (75% a 125%). Nenhuma proposta foi criada.");

  const days = Array.from({ length: input.days }, (_, index) => {
    const dailyMeals = baseDay.map((template) => recalculateDemoMeal({ ...template, items: template.items.map((item) => {
      const alternate = index % 2 === 1
        ? item.alternatives.map((id) => usableFoods.find((food) => food.id === id)).find((food) => food && !matchesRestriction(food, input.allergies, input.restrictions))
        : undefined;
      return { ...item, foodId: alternate?.id ?? item.foodId, grams: Math.round(item.grams * portionFactor), alternatives: item.alternatives.filter((id) => {
        const food = usableFoods.find((candidate) => candidate.id === id);
        return Boolean(food && food.allergenInfoKnown !== false && !matchesRestriction(food, input.allergies, input.restrictions));
      }) };
    }) }, usableFoods));
    return { day: index + 1, meals: dailyMeals, totals: roundNutrients(dailyMeals.reduce((sum, meal) => ({ kcal: sum.kcal + meal.totals.kcal, protein: sum.protein + meal.totals.protein, carbs: sum.carbs + meal.totals.carbs, fat: sum.fat + meal.totals.fat }), { kcal: 0, protein: 0, carbs: 0, fat: 0 })) };
  });

  if (days.some((day) => day.totals.protein < targetProtein)) throw new DemoGenerationError("As combinações demonstrativas compatíveis não alcançam a meta proteica informada dentro dos limites de porção.");
  return { label: "SIMULAÇÃO FICTÍCIA — NÃO É PRESCRIÇÃO", days, targets: { kcal: targetKcal, protein: targetProtein } };
}

export function parseDemoFoodCsv(text: string): { rows: Array<Record<string, string>>; errors: string[]; duplicates: string[] } {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return { rows: [], errors: ["O CSV precisa conter cabeçalho e pelo menos uma linha."], duplicates: [] };
  const headerLine = lines[0] ?? "";
  const delimiter = headerLine.includes(";") ? ";" : ",";
  const parseLine = (line: string) => {
    const cells: string[] = [];
    let cell = "";
    let quoted = false;
    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];
      if (char === '"' && line[i + 1] === '"' && quoted) { cell += '"'; i += 1; }
      else if (char === '"') quoted = !quoted;
      else if (char === delimiter && !quoted) { cells.push(cell.trim()); cell = ""; }
      else cell += char ?? "";
    }
    cells.push(cell.trim());
    return cells;
  };
  const headers = parseLine(headerLine).map((header) => header.toLocaleLowerCase("pt-BR"));
  const isTaco = headers.includes("codigo_taco") && headers.includes("energia_kcal_100g");
  const required = isTaco
    ? ["nome", "energia_kcal_100g", "proteinas_g_100g", "carboidratos_g_100g"]
    : ["nome", "categoria", "calorias_kcal_100g", "proteina_g_100g", "carboidrato_g_100g", "gordura_g_100g", "alergenicos", "fonte", "licenca"];
  const missing = required.filter((header) => !headers.includes(header));
  if (missing.length) return { rows: [], errors: [`Colunas obrigatórias ausentes: ${missing.join(", ")}.`], duplicates: [] };
  const rawRows = lines.slice(1).map((line) => Object.fromEntries(headers.map((header, index) => [header, parseLine(line)[index] ?? ""])));
  const rows = isTaco ? rawRows.map((raw) => {
    const nutrientKeys = ["energia_kcal_100g", "proteinas_g_100g", "carboidratos_g_100g", "gorduras_g_100g", "fibras_g_100g", "calcio_mg_100g", "ferro_mg_100g", "sodio_mg_100g", "potassio_mg_100g"];
    const mapped: Record<string, string> = { ...raw, categoria: raw.categoria || "TACO importado", calorias_kcal_100g: raw.energia_kcal_100g ?? "", proteina_g_100g: raw.proteinas_g_100g ?? "", carboidrato_g_100g: raw.carboidratos_g_100g ?? "", gordura_g_100g: raw.gorduras_g_100g ?? "", alergenicos: raw.alergenicos || "", fonte: raw.fonte || "TACO — origem declarada no arquivo recebido", licenca: raw.licenca || "Não informada no arquivo — manter como rascunho", medida_caseira: raw.medidas_caseiras || "", gluten_status: raw.contem_gluten || "unknown", lactose_status: raw.contem_lactose || "unknown" };
    mapped.nutrition_missing = nutrientKeys.filter((key) => {
      const value = raw[key]?.trim() ?? "";
      return !value || !Number.isFinite(Number(value.replace(",", "."))) || Number(value.replace(",", ".")) < 0;
    }).join("|");
    for (const key of nutrientKeys) {
      const value = raw[key]?.trim() ?? "";
      if (!value || !Number.isFinite(Number(value.replace(",", "."))) || Number(value.replace(",", ".")) < 0) raw[key] = "0";
    }
    return mapped;
  }) : rawRows;
  const errors: string[] = [];
  rows.forEach((row, index) => {
    const line = index + 2;
    if (!row.nome?.trim() || (!isTaco && (!row.categoria?.trim() || !row.fonte?.trim() || !row.licenca?.trim()))) errors.push(`Linha ${line}: nome, categoria, fonte e licença são obrigatórios.`);
    const requiredValues = isTaco ? ["calorias_kcal_100g", "proteina_g_100g", "carboidrato_g_100g"] : ["calorias_kcal_100g", "proteina_g_100g", "carboidrato_g_100g", "gordura_g_100g"];
    for (const key of requiredValues) {
      const value = Number(row[key]?.replace(",", "."));
      if (row[key]?.trim() === "" || !Number.isFinite(value) || value < 0) errors.push(`Linha ${line}: ${key} deve ser um número não negativo.`);
    }
  });
  const names = new Set<string>();
  const duplicates: string[] = [];
  rows.forEach((row, index) => {
    const name = (row.nome ?? "").trim();
    const normalized = name.toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (names.has(normalized)) duplicates.push(`Linha ${index + 2}: “${name}” aparece mais de uma vez no arquivo.`);
    names.add(normalized);
  });
  return { rows, errors: [...new Set(errors)], duplicates };
}
