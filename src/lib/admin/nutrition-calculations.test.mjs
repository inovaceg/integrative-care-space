import { describe, expect, test } from "bun:test";
import { activityFactorForLevel, calculateMifflinStJeor, clonePlanSnapshot, cmFromMeters, isTrustedNutritionSource, kgFromGrams, scaleNutritionPer100g, sumVerifiedMeal, validateEnergyApproval } from "./nutrition-calculations";

describe("cálculos nutricionais", () => {
  test("calcula Mifflin–St Jeor e o total com um só fator de atividade", () => {
    expect(calculateMifflinStJeor({ weightKg: 70, heightCm: 170, ageYears: 30, sex: "female", activityFactor: 1.2 })).toEqual({ bmrKcal: 1452, totalKcal: 1742 });
  });
  test("não presume sexo nem aceita parâmetros impossíveis", () => {
    expect(calculateMifflinStJeor({ weightKg: 70, heightCm: 170, ageYears: 30, sex: null, activityFactor: 1.2 })).toBeNull();
    expect(calculateMifflinStJeor({ weightKg: 70, heightCm: 170, ageYears: 17, sex: "male", activityFactor: 1.2 })).toBeNull();
    expect(calculateMifflinStJeor({ weightKg: 70, heightCm: 170, ageYears: 30, sex: "male", activityFactor: Number.NaN })).toBeNull();
    expect(calculateMifflinStJeor({ weightKg: 19, heightCm: 170, ageYears: 30, sex: "female", activityFactor: 1.2 })).toBeNull();
    expect(calculateMifflinStJeor({ weightKg: 70, heightCm: 170, ageYears: 30.5, sex: "female", activityFactor: 1.2 })).toBeNull();
    expect(calculateMifflinStJeor({ weightKg: 70, heightCm: 170, ageYears: 30, sex: "unknown", activityFactor: 1.2 })).toBeNull();
  });
  test("normaliza atividade registrada e seleciona um fator único", () => {
    expect(activityFactorForLevel("moderado")).toBe(1.55);
    expect(activityFactorForLevel("Muito intenso")).toBe(1.9);
    expect(activityFactorForLevel("exercícios intensos")).toBeNull();
  });
  test("converte unidades sem inferência", () => {
    expect(kgFromGrams(1250)).toBe(1.25);
    expect(cmFromMeters(1.7)).toBe(170);
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
