import { describe, expect, test } from "bun:test";
import { buildNutritionPdfDocument, nutritionPdfDocumentPages } from "./nutrition-pdf";

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

describe("PDF nutricional", () => {
  test("preserva os totais completos quando uma refeição é dividida entre páginas", () => {
    const breakfast = Array.from({ length: 14 }, (_, index) => food(`Alimento ${index + 1}`, 0));
    breakfast.push(food(`${"Cereal longo ".repeat(5)}`, 249.6, 100, 8, 30, 5, 3, ["substituto"]));
    const meals = [
      { name: "Café da manhã", items: breakfast },
      { name: "Almoço", items: [food("Arroz integral cozido", 124, 100, 2.6, 25.8, 1, 1.8), food("Filé de abadejo grelhado", 130, 120, 18.5, 0, 1, 0), food("Brócolis cozido", 25, 80, 2.1, 4.4, 0.5, 3.4)] },
      { name: "Lanche da manhã", items: [food("Lanche", 144)] },
      { name: "Lanche da tarde", items: [food("Lanche da tarde", 188.2)] },
      { name: "Jantar", items: [food("Jantar", 294.5)] },
      { name: "Ceia", items: [food("Ceia", 71)] },
    ];
    const document = buildNutritionPdfDocument({
      patient: "Franciane Martins Parreira",
      evaluationDate: null,
      objective: "",
      emissionDate: "01/01/2026",
      draft: true,
      status: "Rascunho",
      observations: [],
      warnings: [],
      sources: [],
      reviewer: null,
      meals,
    });
    const lunchParts = document.pages.flatMap((page) => page.meals.filter((part) => part.name === "Almoço"));
    expect(lunchParts.length).toBe(2);
    expect(lunchParts[0].continued).toBe(false);
    expect(lunchParts[1].continued).toBe(true);
    expect(lunchParts.flatMap((part) => part.items).map((item) => item.food)).toEqual(["Arroz integral cozido", "Filé de abadejo grelhado", "Brócolis cozido"]);
    expect(lunchParts.at(-1).totals.calories).toBe(300);
    const pdfText = nutritionPdfDocumentPages(document).flat().map((line) => line.text).join("\n");
    expect(pdfText).toContain("Total da refeição: 300 kcal");
    expect(pdfText).toContain("Calorias: 1.247,3 kcal");
  });
});
