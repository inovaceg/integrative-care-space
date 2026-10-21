export type SexParameter = "female" | "male";
export type EnergyInputs = { weightKg: number | null; heightCm: number | null; ageYears: number | null; sex: SexParameter | null; activityFactor: number | null };
export type EnergyEstimate = { bmrKcal: number; totalKcal: number };

export function kgFromGrams(value: number): number { return value / 1000; }
export function cmFromMeters(value: number): number { return value * 100; }

export function calculateMifflinStJeor(inputs: EnergyInputs): EnergyEstimate | null {
  const { weightKg, heightCm, ageYears, sex, activityFactor } = inputs;
  if (weightKg === null || heightCm === null || ageYears === null || sex === null || activityFactor === null) return null;
  if (![weightKg, heightCm, ageYears, activityFactor].every(Number.isFinite) || weightKg < 20 || weightKg > 350 || heightCm < 100 || heightCm > 250 || ageYears < 18 || ageYears > 120 || activityFactor < 1 || activityFactor > 2.5) return null;
  const bmr = 10 * weightKg + 6.25 * heightCm - 5 * ageYears + (sex === "male" ? 5 : -161);
  return { bmrKcal: Math.round(bmr), totalKcal: Math.round(bmr * activityFactor) };
}

export function sumVerifiedMeal(items: Array<Record<string, unknown>>, nutrient: "calories_kcal" | "protein_g" | "carbohydrate_g" | "fat_g", source: "calories_source" | "protein_source" | "carbohydrate_source" | "fat_source"): number | null {
  if (!items.length || !items.every((item) => typeof item[nutrient] === "number" && Number.isFinite(item[nutrient]) && (item[nutrient] as number) >= 0 && typeof item[source] === "string" && Boolean((item[source] as string).trim()))) return null;
  return items.reduce((total, item) => total + (item[nutrient] as number), 0);
}

export function validateEnergyApproval(target: number | null, justification: string, reviewed: boolean): boolean {
  return target !== null && Number.isFinite(target) && target >= 500 && target <= 10000 && reviewed && Boolean(justification.trim());
}
