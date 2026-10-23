import { describe, expect, test } from "bun:test";
import { cleanStaleEnergyTexts, energyTargetMatches, mergeAnamnesisNutritionProfile, waterIntakeFromAnamnesis } from "./nutrition-context";

const profile = {
  allergies: "", intolerances: "", diagnosed_conditions: "", medications: "", supplements: "", avoided_foods: "", exercise_details: "",
};

describe("integração segura dos dados de anamnese", () => {
  test("preenche campos vazios sem sobrescrever dados já salvos no perfil", () => {
    const merged = mergeAnamnesisNutritionProfile({ ...profile, allergies: "Alergia já confirmada" }, {
      alimentacao: "2 litros por dia",
      atividade_fisica: "5x na semana",
      medicamentos_atuais: null,
      respostas: { alergias: "Não", medicamentos_detalhes: "Vit B12\nCoenzima Q10", suplementos: "Omega 3" },
    });
    expect(merged.allergies).toBe("Alergia já confirmada");
    expect(merged.medications).toBe("Vit B12\nCoenzima Q10");
    expect(merged.supplements).toBe("Omega 3");
    expect(merged.exercise_details).toBe("5x na semana");
  });

  test("classifica registro de hidratação sem exibi-lo como descrição alimentar", () => {
    const anamnesis = { alimentacao: "2 litros por dia", respostas: {} };
    expect(waterIntakeFromAnamnesis(anamnesis)).toBe("2 litros por dia");
    expect(mergeAnamnesisNutritionProfile({ ...profile }, anamnesis).allergies).toBe("");
  });

  test("não presume uso atual de tirzepatida a partir de um registro histórico", () => {
    const merged = mergeAnamnesisNutritionProfile({ ...profile }, { alimentacao: null, respostas: { tirzepatida: "Sim" } });
    expect(merged.medications).toBe("");
  });
});

describe("invalidação da meta e dos textos automáticos", () => {
  test("detecta mudança da meta e remove somente observação automática com kcal obsoletas", () => {
    const plan = {
      observations: ["As porções foram ajustadas para se aproximar da meta de 1.572,98 kcal.", "Priorizar refeições compatíveis com a rotina."],
      warnings: [],
      professional_confirmations: [],
    };
    expect(energyTargetMatches(1572.98, 1483.09)).toBe(false);
    expect(cleanStaleEnergyTexts(plan, 1483.09).observations).toEqual(["Priorizar refeições compatíveis com a rotina."]);
    expect(cleanStaleEnergyTexts({ ...plan, observations: ["Meta de 1.483,09 kcal."] }, 1483.09).observations).toEqual(["Meta de 1.483,09 kcal."]);
  });
});
