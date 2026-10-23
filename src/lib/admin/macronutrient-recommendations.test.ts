import { describe, expect, test } from "bun:test";
import { recommendMacronutrients } from "./macronutrient-recommendations";

const base = {
  ageYears: 40,
  weightKg: 70,
  heightCm: 170,
  referenceWeightKg: null,
  energyKcal: 2000,
  objective: "maintenance" as const,
  activityLevel: "Sedentário",
  activityDetails: "",
  weightLossHistoryPercent: null,
  bodyFatPercent: null,
  muscleMassKg: null,
  medications: "",
  conditions: "",
  anamnesis: "",
};

describe("recomendações automáticas de macronutrientes", () => {
  test("usa RDA adulta em manutenção e ponto médio da faixa AMDR para gorduras", () => {
    const result = recommendMacronutrients(base);
    expect(result.proteinFactorGPerKg).toBe(0.8);
    expect(result.referenceWeightKg).toBe(70);
    expect(result.fatPercent).toBe(30);
    expect(result.distribution?.proteinG).toBe(56);
    expect(result.distribution?.fatG).toBeCloseTo(2000 * 0.3 / 9);
    expect(result.distribution?.carbohydratePercent).toBeCloseTo(58.8);
    expect(result.references.some((reference) => reference.includes("10.17226/10490"))).toBe(true);
    expect(result.requiresClinicalDefinition).toBe(true);
    expect(result.rationale.join(" ")).toContain("não se presume normalidade");
  });

  test("adapta o protocolo para emagrecimento e treino de força", () => {
    const result = recommendMacronutrients({ ...base, objective: "weight_loss", activityDetails: "musculação 3 vezes por semana" });
    expect(result.proteinFactorGPerKg).toBe(1.6);
    expect(result.protocol).toContain("treino de força");
    expect(result.references.some((reference) => reference.includes("097608"))).toBe(true);
  });

  test("usa o peso de referência BMI 25 na obesidade quando nenhum peso de referência foi escolhido", () => {
    const result = recommendMacronutrients({ ...base, weightKg: 110, heightCm: 170, objective: "weight_loss" });
    expect(result.referenceWeightKg).toBeCloseTo(25 * 1.7 ** 2);
    expect(result.rationale.join(" ")).toContain("não o peso atual");
  });

  test("sinaliza idade avançada, medicação GLP-1 e função renal não documentada", () => {
    const result = recommendMacronutrients({ ...base, ageYears: 70, objective: "weight_loss", medications: "tirzepatida" });
    expect(result.proteinFactorGPerKg).toBe(1.2);
    expect(result.rationale.join(" ")).toContain("tirzepatida");
    expect(result.rationale.join(" ")).toContain("Função renal não documentada");
    expect(result.references.some((reference) => reference.includes("2014. Protein intake"))).toBe(true);
  });

  test("não sugere fator proteico na doença renal e sinaliza avaliação clínica", () => {
    const result = recommendMacronutrients({ ...base, conditions: "doença renal crônica" });
    expect(result.proteinFactorGPerKg).toBeNull();
    expect(result.requiresClinicalDefinition).toBe(true);
    expect(result.issues.join(" ")).toContain("doença renal");
  });

  test("não completa a distribuição quando faltam dados ou carboidratos ficam sem energia positiva", () => {
    const missing = recommendMacronutrients({ ...base, ageYears: null });
    expect(missing.distribution).toBeNull();
    const incompatible = recommendMacronutrients({ ...base, referenceWeightKg: 200, energyKcal: 500, activityDetails: "musculação" });
    expect(incompatible.distribution).toBeNull();
    expect(incompatible.issues.join(" ")).toContain("excedem a energia disponível");
  });
});

