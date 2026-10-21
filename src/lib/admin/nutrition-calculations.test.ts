import { describe, expect, test } from "bun:test";
import { calculateMifflinStJeor, cmFromMeters, kgFromGrams, sumVerifiedMeal, validateEnergyApproval } from "./nutrition-calculations";

describe("cálculos nutricionais", () => {
  test("calcula Mifflin–St Jeor e o total com um só fator de atividade", () => {
    expect(calculateMifflinStJeor({ weightKg: 70, heightCm: 170, ageYears: 30, sex: "female", activityFactor: 1.2 })).toEqual({ bmrKcal: 1452, totalKcal: 1742 });
  });
  test("não presume sexo nem aceita parâmetros impossíveis", () => {
    expect(calculateMifflinStJeor({ weightKg: 70, heightCm: 170, ageYears: 30, sex: null, activityFactor: 1.2 })).toBeNull();
    expect(calculateMifflinStJeor({ weightKg: 70, heightCm: 170, ageYears: 17, sex: "male", activityFactor: 1.2 })).toBeNull();
    expect(calculateMifflinStJeor({ weightKg: 70, heightCm: 170, ageYears: 30, sex: "male", activityFactor: Number.NaN })).toBeNull();
  });
  test("converte unidades sem inferência", () => {
    expect(kgFromGrams(1250)).toBe(1.25);
    expect(cmFromMeters(1.7)).toBe(170);
  });
  test("só soma nutrientes com valor e fonte em cada item", () => {
    const verified = [{ calories_kcal: 100, calories_source: "TBCA" }, { calories_kcal: 50, calories_source: "Rótulo" }];
    expect(sumVerifiedMeal(verified, "calories_kcal", "calories_source")).toBe(150);
    expect(sumVerifiedMeal([...verified, { calories_kcal: 10 }], "calories_kcal", "calories_source")).toBeNull();
  });
  test("aprovação energética requer meta, justificativa e revisão", () => {
    expect(validateEnergyApproval(2000, "Ajuste individual", true)).toBe(true);
    expect(validateEnergyApproval(2000, "", true)).toBe(false);
    expect(validateEnergyApproval(null, "Ajuste individual", true)).toBe(false);
    expect(validateEnergyApproval(2000, "Ajuste individual", false)).toBe(false);
  });
});
