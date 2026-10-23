import { describe, expect, test } from "bun:test";
import { activityFactorForLevel, ageInYears, calculateEnergyTarget, calculateMifflinStJeor, calculatePlanNutrition, clonePlanSnapshot, cmFromMeters, identifyEnergyObjective, isTrustedNutritionSource, kgFromGrams, scaleNutritionPer100g, scalePlanPortionsToEnergyTarget, sumVerifiedMeal, validateEnergyApproval, validateNutritionTotals } from "./nutrition-calculations";

const source = "TACO · fonte verificada";
const item = (food, calories_kcal, grams = 100, protein_g = 0, carbohydrate_g = 0, fat_g = 0, fiber_g = 0) => ({
  food,
  portion: `${grams} g`,
  quantity_g: grams,
  calories_source: source,
  protein_source: source,
  carbohydrate_source: source,
  fat_source: source,
  fiber_source: source,
  nutrition_per_100g: { calories_kcal, protein_g, carbohydrate_g, fat_g, fiber_g },
});

describe("cálculos nutricionais", () => {
  test("calcula Mifflin–St Jeor e o total com um só fator de atividade", () => {
    expect(calculateMifflinStJeor({ weightKg: 70, heightCm: 170, ageYears: 30, sex: "female", activityFactor: 1.2 })).toEqual({ bmrKcal: 1451.5, totalKcal: 1741.8 });
    expect(calculateMifflinStJeor({ weightKg: 80, heightCm: 165, ageYears: 35, sex: "female", activityFactor: 1.55 })).toEqual({ bmrKcal: 1495.25, totalKcal: 2317.64 });
  });
  test("calcula TMB, GET e meta da Franciane com déficit confirmado de 34%", () => {
    const estimate = calculateMifflinStJeor({ weightKg: 79.45, heightCm: 165, ageYears: 43, sex: "female", activityFactor: 1.55 });
    expect(estimate).toEqual({ bmrKcal: 1449.75, totalKcal: 2247.11 });
    expect(calculateEnergyTarget(estimate.totalKcal, "weight_loss", "percent", 34)).toBe(1483.09);
  });
  test("calcula TMB sem presumir GET quando o fator de atividade ainda não foi confirmado", () => {
    expect(calculateMifflinStJeor({ weightKg: 70, heightCm: 170, ageYears: 30, sex: "female", activityFactor: null })).toEqual({ bmrKcal: 1451.5, totalKcal: null });
  });
  test("não presume sexo nem aceita parâmetros impossíveis", () => {
    expect(calculateMifflinStJeor({ weightKg: 70, heightCm: 170, ageYears: 30, sex: null, activityFactor: 1.2 })).toBeNull();
    expect(calculateMifflinStJeor({ weightKg: 70, heightCm: 170, ageYears: 17, sex: "male", activityFactor: 1.2 })).toBeNull();
    expect(calculateMifflinStJeor({ weightKg: 70, heightCm: 170, ageYears: 30, sex: "male", activityFactor: Number.NaN })).toBeNull();
    expect(calculateMifflinStJeor({ weightKg: 19, heightCm: 170, ageYears: 30, sex: "female", activityFactor: 1.2 })).toBeNull();
    expect(calculateMifflinStJeor({ weightKg: 70, heightCm: 170, ageYears: 30.5, sex: "female", activityFactor: 1.2 })).toBeNull();
    expect(calculateMifflinStJeor({ weightKg: 70, heightCm: 170, ageYears: 30, sex: "unknown", activityFactor: 1.2 })).toBeNull();
  });
  test("identifica objetivo na anamnese e aponta divergências entre registros", () => {
    expect(identifyEnergyObjective([{ source: "Queixa principal", value: "Emagrecimento" }, { source: "Objetivo", value: "Emagrecer e recuperar autoestima" }])).toMatchObject({ objective: "weight_loss", conflicting: false });
    expect(identifyEnergyObjective([{ source: "Anamnese", value: "Emagrecimento" }, { source: "Perfil", value: "Ganho de massa muscular" }])).toMatchObject({ objective: null, conflicting: true });
    expect(identifyEnergyObjective([{ source: "Anamnese", value: "Organizar rotina saudável" }])).toMatchObject({ objective: null, conflicting: false });
  });
  test("define meta de manutenção e ajustes individualizados sem extrapolar limites", () => {
    expect(calculateEnergyTarget(2317.64, "maintenance", null, null)).toBe(2317.64);
    expect(calculateEnergyTarget(2317.64, "weight_loss", "percent", 10)).toBe(2085.88);
    expect(calculateEnergyTarget(2317.64, "weight_gain", "percent", 5)).toBe(2433.52);
    expect(calculateEnergyTarget(2317.64, "weight_gain", "kcal", 250)).toBe(2567.64);
    expect(calculateEnergyTarget(2317.64, "weight_loss", "percent", 60)).toBeNull();
    expect(calculateEnergyTarget(2317.64, "weight_loss", null, 250)).toBeNull();
  });
  test("ajusta deterministicamente as porções à meta energética aprovada", () => {
    const result = scalePlanPortionsToEnergyTarget([{ name: "Almoço", items: [item("Prato", 250)] }], 500);
    expect(result.totals.calories_kcal).toBeCloseTo(500, 0);
    expect(result.meals[0].items[0].quantity_g).toBe(200);
    expect(() => scalePlanPortionsToEnergyTarget([{ items: [item("Prato", 250)] }], 499)).toThrow();
  });
  test("arredonda quantidades geradas a incrementos práticos dentro da tolerância", () => {
    const result = scalePlanPortionsToEnergyTarget([{ name: "Refeição", items: [item("Aveia", 250, 100)] }], 500);
    expect(result.meals[0].items[0].quantity_g).toBe(200);
    expect(Math.abs(result.totals.calories_kcal - 500) / 500).toBeLessThanOrEqual(0.05);
  });
  test("corrige discrepância entre cardápio gerado e meta aprovada da paciente", () => {
    const result = scalePlanPortionsToEnergyTarget([{ name: "Cardápio", items: [item("Composição verificada", 147.77, 1000)] }], 1797.7);
    expect(Math.abs(result.totals.calories_kcal - 1797.7) / 1797.7).toBeLessThanOrEqual(0.05);
  });
  test("normaliza atividade registrada e seleciona um fator único", () => {
    expect(activityFactorForLevel("moderado")).toBe(1.55);
    expect(activityFactorForLevel("Muito intenso")).toBe(1.9);
    expect(activityFactorForLevel("exercícios intensos")).toBeNull();
  });
  test("calcula idade na data correta e rejeita datas ausentes ou impossíveis", () => {
    expect(ageInYears("1990-02-28", new Date("2025-03-01T00:00:00Z"))).toBe(35);
    expect(ageInYears("1990-03-02", new Date("2025-03-01T00:00:00Z"))).toBe(34);
    expect(ageInYears("1990-02-30", new Date("2025-03-01T00:00:00Z"))).toBeNull();
    expect(ageInYears(null, new Date("2025-03-01T00:00:00Z"))).toBeNull();
  });
  test("converte unidades sem inferência", () => {
    expect(kgFromGrams(1250)).toBe(1.25);
    expect(cmFromMeters(1.7)).toBe(170);
  });
  test("escala nutrientes da base por 100 g sem arredondamento intermediário", () => {
    expect(scaleNutritionPer100g(250, 40)).toBe(100);
    expect(scaleNutritionPer100g(3.33, 150)).toBe(4.995);
    expect(scaleNutritionPer100g(null, 100)).toBeNull();
    expect(scaleNutritionPer100g(10, 0)).toBeNull();
    expect(scaleNutritionPer100g(-1, 100)).toBeNull();
  });
  test("calcula os nutrientes da Franciane antes da paginação e inclui cada item uma vez", () => {
    const meals = [
      { name: "Café da manhã", items: [item("Café", 249.6, 100, 8, 30, 5, 3)] },
      { name: "Lanche da manhã", items: [item("Iogurte", 144, 100, 6, 20, 3, 0)] },
      { name: "Almoço", items: [item("Arroz integral cozido", 124, 100, 2.6, 25.8, 1, 2.7), item("Abadejo filé congelado grelhado", 130, 120, 27.6, 0, 1.3, null), item("Brócolis cozido", 25, 80, 2.1, 4.4, 0.5, 3.4)] },
      { name: "Lanche da tarde", items: [item("Fruta", 188.2, 100, 2, 35, 3, 5)] },
      { name: "Jantar", items: [item("Jantar", 294.5, 100, 20, 28, 9, 4)] },
      { name: "Ceia", items: [item("Ceia", 71, 100, 4, 10, 2, 1)] },
    ];
    const result = calculatePlanNutrition(meals);
    expect(result.meals[2].totals.calories_kcal).toBe(300);
    expect(result.meals[2].totals.protein_g).toBe(37.4);
    expect(result.meals[2].totals.carbohydrate_g).toBe(29.32);
    expect(result.meals[2].totals.fat_g).toBe(2.96);
    expect(result.meals[2].totals.fiber_g).toBeNull();
    expect(result.totals.calories_kcal).toBe(1247.3);
    expect(result.totals.fiber_g).toBeNull();
    expect(validateNutritionTotals(result).length).toBeGreaterThan(0);
  });
  test("não transforma nutrientes ausentes em zero e marca o plano incompleto", () => {
    const result = calculatePlanNutrition([{ name: "Almoço", items: [item("Alimento sem fibra", 100, 100, 5, 10, 2, null)] }]);
    expect(result.meals[0].totals.fiber_g).toBeNull();
    expect(result.totals.fiber_g).toBeNull();
    expect(result.issues.some((issue) => issue.includes("fiber_g ausente"))).toBe(true);
    expect(validateNutritionTotals(result).length).toBeGreaterThan(0);
  });
  test("mantém zero de fibra confirmado e informa soma parcial quando outro alimento não tem dado", () => {
    const result = calculatePlanNutrition([{ name: "Refeição", items: [item("Peixe", 100, 100, 20, 0, 1, null), item("Verdura", 20, 100, 2, 4, 0, 0)] }]);
    expect(result.meals[0].totals.fiber_g).toBeNull();
    expect(result.meals[0].knownTotals.fiber_g).toBe(0);
    expect(result.totals.fiber_g).toBeNull();
    expect(result.knownTotals.fiber_g).toBe(0);
  });
  test("só soma nutrientes com valor e fonte em cada item", () => {
    const verified = [{ calories_kcal: 100, calories_source: "TBCA" }, { calories_kcal: 50, calories_source: "Rótulo" }];
    expect(sumVerifiedMeal(verified, "calories_kcal", "calories_source")).toBe(150);
    expect(sumVerifiedMeal([...verified, { calories_kcal: 10 }], "calories_kcal", "calories_source")).toBeNull();
    expect(isTrustedNutritionSource("fonte desconhecida")).toBe(false);
    expect(isTrustedNutritionSource("TBCA - item 123" )).toBe(true);
  });
  test("snapshot JSON preserva parâmetros, fontes e composição da versão sem compartilhar referência mutável", () => {
    const original = { energy: { method: "Mifflin-St Jeor", adjusted_daily_kcal: 2000, professional_reviewed: true }, meals: [{ items: [{ carbohydrate_g: 30, carbohydrate_source: "TBCA" }] }] };
    const snapshot = clonePlanSnapshot(original);
    original.energy.adjusted_daily_kcal = 1800;
    expect(snapshot.energy.adjusted_daily_kcal).toBe(2000);
    expect(snapshot.meals[0].items[0].carbohydrate_source).toBe("TBCA");
  });
  test("aprovação energética requer meta, justificativa e revisão", () => {
    expect(validateEnergyApproval(2000, "Ajuste individual", true)).toBe(true);
    expect(validateEnergyApproval(2000, "", true)).toBe(false);
    expect(validateEnergyApproval(null, "Ajuste individual", true)).toBe(false);
    expect(validateEnergyApproval(2000, "Ajuste individual", false)).toBe(false);
  });
});
