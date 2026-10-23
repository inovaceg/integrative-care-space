import { describe, expect, test } from "bun:test";
import { buildNutritionPdfDocument, nutritionObjectiveLabel, nutritionPdfDocumentPages } from "./nutrition-pdf";

const source = "TACO · fonte cadastrada";
const food = (name, kcal, grams = 100, protein = 0, carbs = 0, fat = 0, fiber = 0, alternatives = []) => ({
  food: name,
  portion: `${grams} g`,
  quantity_g: grams,
  calories_kcal: kcal,
  calories_source: source,
  protein_g: protein,
  protein_source: source,
  carbohydrate_g: carbs,
  carbohydrate_source: source,
  fat_g: fat,
  fat_source: source,
  fiber_g: fiber,
  fiber_source: source,
  alternatives,
});

describe("layout do PDF nutricional", () => {
  test("traduz objetivos internos para rótulos legíveis", () => {
    expect(nutritionObjectiveLabel("weight_loss")).toBe("Emagrecimento");
    expect(nutritionObjectiveLabel("maintenance")).toBe("Manutenção do peso");
    expect(nutritionObjectiveLabel("custom goal")).toBe("custom goal");
  });

  test("mantém almoço completo em uma página e preserva os totais do sistema", () => {
    const meals = [
      { name: "Café da manhã", items: [food("Café da manhã", 249.6)] },
      { name: "Almoço", items: [food("Arroz integral cozido", 124, 100, 2.6, 25.8, 1, 2.7), food("Abadejo filé congelado grelhado", 156, 120, 33.12, 0, 1.56, null), food("Brócolis cozido", 20, 80, 1.68, 3.52, 0.4, 2.72)] },
      { name: "Lanche da manhã", items: [food("Lanche", 144)] },
      { name: "Lanche da tarde", items: [food("Lanche da tarde", 188.2)] },
      { name: "Jantar", items: [food("Jantar", 294.5)] },
      { name: "Ceia", items: [food("Ceia", 71)] },
    ];
    const document = buildNutritionPdfDocument({
      patient: "Franciane Martins Parreira",
      evaluationDate: "15/10/2025",
      objective: "Planejamento alimentar",
      emissionDate: "01/01/2026",
      draft: true,
      status: "Em elaboração",
      observations: [],
      warnings: [],
      sources: ["TACO-1", "TACO-276", "TACO-100"],
      reviewer: null,
      meals,
    });
    const lunchParts = document.pages.flatMap((page) => page.meals.filter((part) => part.name === "Almoço"));
    expect(lunchParts).toHaveLength(1);
    expect(lunchParts[0].continued).toBe(false);
    expect(lunchParts[0].items.map((item) => item.food)).toEqual(["Arroz integral cozido", "Abadejo filé congelado grelhado", "Brócolis cozido"]);
    expect(lunchParts[0].totals.calories).toBe(300);
    expect(document.dailyTotals.calories).toBe(1247.3);
    expect(document.pages).toHaveLength(2);
    expect(document.pages.map((page) => page.meals.length)).toEqual([3, 3]);
    const pdfText = nutritionPdfDocumentPages(document).flat().map((line) => line.text).join("\n");
    expect(pdfText).toContain("PROPOSTA ALIMENTAR");
    expect(pdfText).toContain("SITUAÇÃO: EM ELABORAÇÃO");
    expect(pdfText).toContain("Proposta alimentar em elaboração — não utilizar como prescrição.");
    expect(pdfText).not.toContain("RASCUNHO — NÃO É PRESCRIÇÃO");
    expect(pdfText).toContain("Total da refeição: 300 kcal");
    expect(pdfText).toContain("Proteínas 37,4 g");
    expect(pdfText).toContain("1.247,3 kcal");
    expect(pdfText).toContain("TACO-276");
  });

  test("inclui a tabela de metas e consumo de macronutrientes confirmados no PDF", () => {
    const document = buildNutritionPdfDocument({
      patient: "Paciente de teste", evaluationDate: null, objective: "Manutenção", emissionDate: "01/01/2026", draft: true, status: "Em elaboração", observations: [], warnings: [], sources: [], reviewer: null,
      energy: { bmr_kcal: 1400, estimated_daily_kcal: 2000, adjusted_daily_kcal: 1800, professional_reviewed: true, activity_factor: 1.4, activity_level: "Leve", objective: "maintenance", carbohydrate_percent: 50, protein_percent: 20, fat_percent: 30, macro_reviewed: true, macro_calculated_for_kcal: 1800 },
      meals: [{ name: "Almoço", items: [food("Refeição", 1800, 100, 80, 200, 50)] }],
    });
    const text = nutritionPdfDocumentPages(document).flat().map((line) => line.text).join("\n");
    expect(text).toContain("MACRONUTRIENTES · META PROFISSIONAL E CARDÁPIO");
    expect(text).toContain("225");
    expect(text).toContain("90");
    expect(text).toContain("60");
    expect(text).toContain("Cardápio (g)");
  });

  test("mantém aguardando revisão como documento não aprovado e não marca PDF aprovado como proposta", () => {
    const common = {
      patient: "Paciente de teste",
      evaluationDate: null,
      objective: "Manutenção",
      emissionDate: "01/01/2026",
      observations: [],
      warnings: [],
      sources: [],
      reviewer: null,
      energy: null,
      meals: [{ name: "Almoço", items: [food("Arroz", 150)] }],
    };
    const reviewText = nutritionPdfDocumentPages(buildNutritionPdfDocument({ ...common, draft: true, status: "Aguardando revisão" })).flat().map((line) => line.text).join("\n");
    expect(reviewText).toContain("SITUAÇÃO: AGUARDANDO REVISÃO");
    expect(reviewText).toContain("Proposta alimentar para revisão profissional — não constitui prescrição dietética.");
    const approvedText = nutritionPdfDocumentPages(buildNutritionPdfDocument({ ...common, draft: false, status: "Aprovado", reviewer: "Aprovado por Nutricionista · CRN 00000" })).flat().map((line) => line.text).join("\n");
    expect(approvedText).toContain("SITUAÇÃO: APROVADO");
    expect(approvedText).not.toContain("não constitui prescrição dietética");
  });
});
