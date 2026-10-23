type NutrientField = "calories_kcal" | "protein_g" | "carbohydrate_g" | "fat_g" | "fiber_g";
type CatalogFood = {
  id: string;
  name: string;
  source: string;
  validation_status: string;
  energy_kcal_100g: number | string;
  proteins_g_100g: number | string;
  carbohydrates_g_100g: number | string;
  fats_g_100g: number | string | null;
  fibers_g_100g: number | string | null;
};
const fields: { key: NutrientField; source: string; base: keyof CatalogFood }[] = [
  { key: "calories_kcal", source: "calories_source", base: "energy_kcal_100g" },
  { key: "protein_g", source: "protein_source", base: "proteins_g_100g" },
  { key: "carbohydrate_g", source: "carbohydrate_source", base: "carbohydrates_g_100g" },
  { key: "fat_g", source: "fat_source", base: "fats_g_100g" },
  { key: "fiber_g", source: "fiber_source", base: "fibers_g_100g" },
];
const trusted = (value: unknown) => typeof value === "string" && /\b(TBCA|TACO|r[oó]tulo|USDA)\b/i.test(value);
const close = (left: number, right: number) => Number.isFinite(left) && Number.isFinite(right) && Math.abs(left - right) <= 1e-8;

export function validateNutritionPlanForApproval(plan: unknown, catalog: CatalogFood[]) {
  const issues: string[] = [];
  if (!plan || typeof plan !== "object" || !Array.isArray((plan as { meals?: unknown }).meals)) return ["O plano não contém uma lista válida de refeições."];
  const planData = plan as { meals: Array<{ name?: unknown; items?: unknown }>; energy?: Record<string, unknown> };
  const meals = planData.meals;
  if (!meals.length) return ["O plano não contém refeições."];
  const energy = planData.energy;
  if (!energy || energy.professional_reviewed !== true || !energy.observations || typeof energy.observations !== "string" || !energy.observations.trim()) issues.push("A meta energética deve estar revisada e justificada por profissional antes da aprovação.");
  else {
    const weight = Number(energy.weight_kg), height = Number(energy.height_cm), age = Number(energy.age_years), factor = Number(energy.activity_factor);
    if (![weight, height, age, factor].every(Number.isFinite) || weight < 20 || weight > 350 || height < 100 || height > 250 || !Number.isInteger(age) || age < 18 || age > 120 || ![1.2, 1.375, 1.55, 1.725, 1.9].includes(factor) || !["female", "male"].includes(String(energy.sex_parameter))) issues.push("Os parâmetros usados para validar a meta energética estão incompletos ou fora do intervalo.");
    else {
      const basal = 10 * weight + 6.25 * height - 5 * age + (energy.sex_parameter === "male" ? 5 : -161);
      const get = basal * factor;
      const adjustment = Number(energy.adjustment_value);
      const objective = energy.objective;
      const mode = energy.adjustment_mode;
      const validAdjustment = objective === "maintenance" || (Number.isFinite(adjustment) && adjustment > 0 && (mode === "percent" ? adjustment <= 50 : mode === "kcal" && adjustment <= 1000));
      const target = objective === "maintenance" ? get : get + (objective === "weight_loss" ? -1 : 1) * (mode === "percent" ? get * adjustment / 100 : adjustment);
      if (!validAdjustment || ![energy.bmr_kcal, energy.estimated_daily_kcal, energy.adjusted_daily_kcal].every((value) => typeof value === "number" && Number.isFinite(value)) || Math.abs(Number(energy.bmr_kcal) - basal) > 0.02 || Math.abs(Number(energy.estimated_daily_kcal) - get) > 0.02 || Math.abs(Number(energy.adjusted_daily_kcal) - target) > 0.02 || Number(energy.adjusted_daily_kcal) < 500 || Number(energy.adjusted_daily_kcal) > 10000) issues.push("A meta energética não corresponde à TMB, ao GET e ao ajuste documentados.");
    }
  }
  const byId = new Map(catalog.map((food) => [food.id, food]));
  for (const [mealIndex, meal] of meals.entries()) {
    if (!Array.isArray(meal.items) || !meal.items.length) {
      issues.push(`Refeição ${mealIndex + 1}: nenhum alimento selecionado.`);
      continue;
    }
    for (const [itemIndex, rawItem] of meal.items.entries()) {
      const label = `${String(meal.name || `Refeição ${mealIndex + 1}`)}, alimento ${itemIndex + 1}`;
      if (!rawItem || typeof rawItem !== "object") { issues.push(`${label}: item inválido.`); continue; }
      const item = rawItem as Record<string, unknown>;
      const id = item.food_library_id;
      const food = typeof id === "string" ? byId.get(id) : undefined;
      if (!food || food.validation_status !== "verified" || !trusted(food.source)) {
        issues.push(`${label}: alimento sem referência validada na biblioteca.`);
        continue;
      }
      const grams = item.quantity_g;
      if (typeof grams !== "number" || !Number.isFinite(grams) || grams <= 0 || grams > 2000) {
        issues.push(`${label}: quantidade em gramas inválida.`);
        continue;
      }
      if (item.food !== food.name) issues.push(`${label}: o nome diverge do registro oficial da biblioteca.`);
      const snapshot = item.nutrition_per_100g;
      if (!snapshot || typeof snapshot !== "object") issues.push(`${label}: composição por 100 g ausente.`);
      for (const field of fields) {
        const catalogBase = food[field.base];
        const base = catalogBase === null ? null : Number(catalogBase);
        const shownBase = snapshot && typeof snapshot === "object" ? (snapshot as Record<string, unknown>)[field.key] : undefined;
        const shownPortion = item[field.key];
        if (base === null || !Number.isFinite(base) || base < 0) {
          issues.push(`${label}: ${field.key} ausente no catálogo; o plano não pode ser aprovado com esse dado incompleto.`);
          continue;
        }
        const expected = base * grams / 100;
        if (typeof shownBase !== "number" || !close(shownBase, base) || typeof shownPortion !== "number" || !close(shownPortion, expected)) {
          issues.push(`${label}: ${field.key} não corresponde ao valor cadastrado e à quantidade.`);
        }
        if (!trusted(item[field.source])) issues.push(`${label}: fonte de ${field.key} ausente ou não verificável.`);
      }
    }
  }
  return [...new Set(issues)];
}

export type { CatalogFood };
export { fields as nutritionApprovalFields };
export function portionValueFrom100g(value: number, grams: number) { return value * grams / 100; }
export function calculateApprovalTotals(plan: { meals: Array<{ items: Array<Record<string, unknown>> }> }) {
  return fields.map((field) => {
    const values = plan.meals.flatMap((meal) => meal.items.map((item) => item[field.key]));
    return { nutrient: field.key, total: values.length && values.every((value): value is number => typeof value === "number" && Number.isFinite(value)) ? values.reduce((sum, value) => sum + value, 0) : null };
  });
}
export function nutritionValueMatches(expected: number, actual: number) { return close(expected, actual); }
