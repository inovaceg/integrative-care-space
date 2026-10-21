import type { DemoFood } from "./nutrition-demo-engine";

export type NutritionFoodRow = {
  id?: string;
  source_code: string | null;
  name: string;
  category: string;
  energy_kcal_100g: number;
  proteins_g_100g: number;
  carbohydrates_g_100g: number;
  fats_g_100g: number | null;
  fibers_g_100g: number | null;
  calcium_mg_100g: number | null;
  iron_mg_100g: number | null;
  sodium_mg_100g: number | null;
  potassium_mg_100g: number | null;
  household_measure: string;
  allergens: string[];
  allergen_info_known: boolean;
  gluten_status: DemoFood["gluten"];
  lactose_status: DemoFood["lactose"];
  source: string;
  license: string;
  validation_status: "draft" | "verified";
  nutrition_missing: string[];
  import_notes: string | null;
};

const normalizedName = (value: string) => value.trim().toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const missingValue = (food: DemoFood, field: string) => food.nutritionMissing?.includes(field) ?? false;

export function nutritionRowToDemoFood(row: NutritionFoodRow): DemoFood {
  return {
    id: row.id ?? `nutrition-${row.source_code ?? normalizedName(row.name)}`,
    name: row.name,
    category: row.category,
    kcal100g: Number(row.energy_kcal_100g),
    protein100g: Number(row.proteins_g_100g),
    carbs100g: Number(row.carbohydrates_g_100g),
    fat100g: Number(row.fats_g_100g ?? 0),
    fiber100g: Number(row.fibers_g_100g ?? 0),
    calciumMg100g: Number(row.calcium_mg_100g ?? 0),
    ironMg100g: Number(row.iron_mg_100g ?? 0),
    sodiumMg100g: Number(row.sodium_mg_100g ?? 0),
    potassiumMg100g: Number(row.potassium_mg_100g ?? 0),
    householdMeasure: row.household_measure,
    allergens: row.allergens,
    allergenInfoKnown: row.allergen_info_known,
    restrictions: [],
    gluten: row.gluten_status,
    lactose: row.lactose_status,
    source: row.source,
    license: row.license,
    status: row.validation_status === "verified" ? "demo_validated" : "draft",
    demoOnly: true,
    nutritionMissing: row.nutrition_missing,
    importCode: row.source_code ?? undefined,
    importNotes: row.import_notes ?? undefined,
  };
}

export function demoFoodToNutritionRow(food: DemoFood): NutritionFoodRow {
  const missing = food.nutritionMissing ?? [];
  const normalized = normalizedName(food.name);
  return {
    source_code: food.importCode ?? `local:${normalized}`,
    name: food.name.trim(),
    category: food.category.trim() || "Importado",
    energy_kcal_100g: food.kcal100g,
    proteins_g_100g: food.protein100g,
    carbohydrates_g_100g: food.carbs100g,
    fats_g_100g: missingValue(food, "gorduras_g_100g") ? null : food.fat100g,
    fibers_g_100g: missingValue(food, "fibras_g_100g") ? null : food.fiber100g ?? null,
    calcium_mg_100g: missingValue(food, "calcio_mg_100g") ? null : food.calciumMg100g ?? null,
    iron_mg_100g: missingValue(food, "ferro_mg_100g") ? null : food.ironMg100g ?? null,
    sodium_mg_100g: missingValue(food, "sodio_mg_100g") ? null : food.sodiumMg100g ?? null,
    potassium_mg_100g: missingValue(food, "potassio_mg_100g") ? null : food.potassiumMg100g ?? null,
    household_measure: food.householdMeasure,
    allergens: food.allergens,
    allergen_info_known: food.allergenInfoKnown ?? false,
    gluten_status: food.gluten,
    lactose_status: food.lactose,
    source: food.source,
    license: food.license,
    validation_status: "draft",
    nutrition_missing: missing,
    import_notes: food.importNotes ?? null,
  };
}

export function tacoCsvRowToNutritionFood(row: Record<string, string>): NutritionFoodRow {
  const numeric = (key: string) => Number((row[key] ?? "0").replace(",", "."));
  const missing = (row.nutrition_missing ?? "").split("|").filter(Boolean);
  const glutenValue = (row.gluten_status ?? "").toLocaleLowerCase("pt-BR");
  const lactoseValue = (row.lactose_status ?? "").toLocaleLowerCase("pt-BR");
  const convertStatus = (value: string): DemoFood["gluten"] => value === "free" || value === "livre" || value === "não" ? "free" : value === "contains" || value === "contém" || value === "sim" ? "contains" : "unknown";
  return {
    source_code: row.codigo_taco || `csv:${normalizedName(row.nome ?? "")}`,
    name: (row.nome ?? "").trim(),
    category: (row.categoria ?? "TACO importado").trim(),
    energy_kcal_100g: numeric("calorias_kcal_100g"),
    proteins_g_100g: numeric("proteina_g_100g"),
    carbohydrates_g_100g: numeric("carboidrato_g_100g"),
    fats_g_100g: missing.includes("gorduras_g_100g") ? null : numeric("gordura_g_100g"),
    fibers_g_100g: missing.includes("fibras_g_100g") ? null : numeric("fibras_g_100g"),
    calcium_mg_100g: missing.includes("calcio_mg_100g") ? null : numeric("calcio_mg_100g"),
    iron_mg_100g: missing.includes("ferro_mg_100g") ? null : numeric("ferro_mg_100g"),
    sodium_mg_100g: missing.includes("sodio_mg_100g") ? null : numeric("sodio_mg_100g"),
    potassium_mg_100g: missing.includes("potassio_mg_100g") ? null : numeric("potassio_mg_100g"),
    household_measure: row.medida_caseira || "Não informada",
    allergens: (row.alergenicos || "").split(/[|;]/).map((value) => value.trim().toLocaleLowerCase("pt-BR")).filter((value) => value && value !== "nenhum"),
    allergen_info_known: Boolean(row.alergenicos?.trim()) && row.status_alergenicos !== "desconhecido",
    gluten_status: convertStatus(glutenValue),
    lactose_status: convertStatus(lactoseValue),
    source: (row.fonte ?? "TACO — origem declarada no arquivo recebido").trim(),
    license: (row.licenca ?? "Não informada no arquivo — manter como rascunho").trim() || "Não informada no arquivo — manter como rascunho",
    validation_status: "draft",
    nutrition_missing: missing,
    import_notes: row.observacoes_importacao || null,
  };
}
