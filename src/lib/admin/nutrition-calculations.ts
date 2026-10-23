export type SexParameter = "female" | "male";
export type EnergyInputs = { weightKg: number | null; heightCm: number | null; ageYears: number | null; sex: SexParameter | null; activityFactor: number | null };
export type EnergyEstimate = { bmrKcal: number; totalKcal: number };
export type NutritionValueKey = "calories_kcal" | "protein_g" | "carbohydrate_g" | "fat_g" | "fiber_g";
export type NutritionSourceKey = "calories_source" | "protein_source" | "carbohydrate_source" | "fat_source" | "fiber_source";
export type NutritionTotals = Record<NutritionValueKey, number | null>;
export type NutritionMealResult = { name: string; items: Record<string, unknown>[]; totals: NutritionTotals };
export type PlanNutritionResult = { meals: NutritionMealResult[]; totals: NutritionTotals; issues: string[] };

const activityFactors: Record<string, number> = { sedentario: 1.2, leve: 1.375, moderado: 1.55, intenso: 1.725, "muito intenso": 1.9 };
const nutrientFields: { key: NutritionValueKey; source: NutritionSourceKey; per100: string }[] = [
  { key: "calories_kcal", source: "calories_source", per100: "calories_kcal" },
  { key: "protein_g", source: "protein_source", per100: "protein_g" },
  { key: "carbohydrate_g", source: "carbohydrate_source", per100: "carbohydrate_g" },
  { key: "fat_g", source: "fat_source", per100: "fat_g" },
  { key: "fiber_g", source: "fiber_source", per100: "fiber_g" },
];
const emptyTotals = (): NutritionTotals => ({ calories_kcal: null, protein_g: null, carbohydrate_g: null, fat_g: null, fiber_g: null });

export function activityFactorForLevel(level: string | null | undefined): number | null {
  if (!level) return null;
  return activityFactors[level.trim().toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "")] ?? null;
}

export function ageInYears(birthDate: string | null, at = new Date()): number | null {
  if (!birthDate || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return null;
  const birth = new Date(`${birthDate}T00:00:00Z`);
  if (!Number.isFinite(birth.getTime()) || birth.toISOString().slice(0, 10) !== birthDate) return null;
  return at.getUTCFullYear() - birth.getUTCFullYear() - (at.getUTCMonth() < birth.getUTCMonth() || (at.getUTCMonth() === birth.getUTCMonth() && at.getUTCDate() < birth.getUTCDate()) ? 1 : 0);
}

export function kgFromGrams(value: number): number { return value / 1000; }
export function cmFromMeters(value: number): number { return value * 100; }

export function calculateMifflinStJeor(inputs: EnergyInputs): EnergyEstimate | null {
  const { weightKg, heightCm, ageYears, sex, activityFactor } = inputs;
  if (weightKg === null || heightCm === null || ageYears === null || (sex !== "female" && sex !== "male") || activityFactor === null) return null;
  if (![weightKg, heightCm, ageYears, activityFactor].every(Number.isFinite) || weightKg < 20 || weightKg > 350 || heightCm < 100 || heightCm > 250 || !Number.isInteger(ageYears) || ageYears < 18 || ageYears > 120 || activityFactor < 1 || activityFactor > 2.5) return null;
  const bmr = 10 * weightKg + 6.25 * heightCm - 5 * ageYears + (sex === "male" ? 5 : -161);
  return { bmrKcal: Math.round(bmr * 100) / 100, totalKcal: Math.round(bmr * activityFactor * 100) / 100 };
}

export function calculateEnergyTarget(getKcal: number, objective: "maintenance" | "weight_loss" | "weight_gain", mode: "percent" | "kcal" | null, adjustment: number | null): number | null {
  if (!Number.isFinite(getKcal) || getKcal <= 0) return null;
  if (objective === "maintenance") return Math.round(getKcal * 100) / 100;
  if (adjustment === null || !Number.isFinite(adjustment) || adjustment <= 0 || !mode || (mode === "percent" && adjustment > 50) || (mode === "kcal" && adjustment > 1000)) return null;
  const amount = mode === "percent" ? getKcal * adjustment / 100 : adjustment;
  return Math.round((getKcal + (objective === "weight_loss" ? -amount : amount)) * 100) / 100;
}

export function scaleNutritionPer100g(value: number | null, grams: number): number | null {
  if (value === null || !Number.isFinite(value) || value < 0 || !Number.isFinite(grams) || grams <= 0) return null;
  return value * grams / 100;
}

export function isTrustedNutritionSource(value: unknown): boolean {
  return typeof value === "string" && /\b(TBCA|TACO|r[oó]tulo|USDA)\b/i.test(value.trim());
}

export function sumVerifiedMeal(items: Array<Record<string, unknown>>, nutrient: NutritionValueKey, source: NutritionSourceKey): number | null {
  if (!items.length || !items.every((item) => typeof item[nutrient] === "number" && Number.isFinite(item[nutrient]) && (item[nutrient] as number) >= 0 && isTrustedNutritionSource(item[source]))) return null;
  return items.reduce((total, item) => total + (item[nutrient] as number), 0);
}

export function calculatePlanNutrition(meals: Array<{ name?: string; items?: Array<Record<string, unknown>> }>): PlanNutritionResult {
  const issues: string[] = [];
  const calculatedMeals = meals.map((meal, mealIndex) => {
    const sourceItems = meal.items ?? [];
    const items = sourceItems.map((sourceItem, itemIndex) => {
      const item = { ...sourceItem };
      const grams = item.quantity_g;
      const per100 = item.nutrition_per_100g;
      const hasPer100 = per100 !== null && typeof per100 === "object";
      if (hasPer100 && (!Number.isFinite(grams) || Number(grams) <= 0)) issues.push(`${meal.name || `Refeição ${mealIndex + 1}`}: quantidade inválida para ${String(item.food ?? `alimento ${itemIndex + 1}`)}.`);
      for (const field of nutrientFields) {
        const source = item[field.source];
        const baseValue = hasPer100 ? (per100 as Record<string, unknown>)[field.per100] : item[field.key];
        const portionValue = hasPer100 && Number.isFinite(grams) && Number(grams) > 0 && typeof baseValue === "number" && Number.isFinite(baseValue) && baseValue >= 0
          ? scaleNutritionPer100g(baseValue, Number(grams))
          : hasPer100 ? null : typeof baseValue === "number" && Number.isFinite(baseValue) && baseValue >= 0 ? baseValue : null;
        item[field.key] = portionValue;
        if (portionValue === null) issues.push(`${meal.name || `Refeição ${mealIndex + 1}`}: ${field.key} ausente ou inválido em ${String(item.food ?? `alimento ${itemIndex + 1}`)}.`);
        if (!isTrustedNutritionSource(source)) issues.push(`${meal.name || `Refeição ${mealIndex + 1}`}: fonte de ${field.key} ausente ou não identificável em ${String(item.food ?? `alimento ${itemIndex + 1}`)}.`);
      }
      return item;
    });
    const totals = emptyTotals();
    if (items.length) for (const field of nutrientFields) totals[field.key] = sumVerifiedMeal(items, field.key, field.source);
    else issues.push(`${meal.name || `Refeição ${mealIndex + 1}`}: não há alimentos selecionados.`);
    return { name: meal.name ?? `Refeição ${mealIndex + 1}`, items, totals };
  });
  const totals = emptyTotals();
  if (calculatedMeals.length) for (const field of nutrientFields) {
    const values = calculatedMeals.map((meal) => meal.totals[field.key]);
    totals[field.key] = values.every((value): value is number => value !== null) ? values.reduce((sum, value) => sum + value, 0) : null;
  }
  return { meals: calculatedMeals, totals, issues: [...new Set(issues)] };
}

export function clonePlanSnapshot<T>(content: T): T {
  return JSON.parse(JSON.stringify(content)) as T;
}

export function validateEnergyApproval(target: number | null, justification: string, reviewed: boolean): boolean {
  return target !== null && Number.isFinite(target) && target >= 500 && target <= 10000 && reviewed && Boolean(justification.trim());
}

export function validateNutritionTotals(result: PlanNutritionResult): string[] {
  const missing = nutrientFields.filter((field) => result.totals[field.key] === null).map((field) => field.key);
  return missing.length ? [...new Set([...result.issues, `Totais diários não verificáveis para: ${missing.join(", ")}.`])] : result.issues;
}

export function roundNutritionForDisplay(value: number | null): number | null {
  return value === null ? null : Math.round((value + Number.EPSILON) * 10) / 10;
}

export function nutritionCalculationMatches(expected: number, actual: number, tolerance = 1e-8): boolean {
  return Number.isFinite(expected) && Number.isFinite(actual) && Math.abs(expected - actual) <= tolerance;
}

export function nutritionNutrientFields() { return nutrientFields; }
export function emptyNutritionTotals() { return emptyTotals(); }
