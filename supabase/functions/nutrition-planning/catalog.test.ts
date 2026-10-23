import { describe, expect, test } from "bun:test";
import { findFoodNameSuggestions, validateFoodSelections, type CatalogFoodReference } from "../_shared/nutrition-plan-catalog";
import { equivalentAlternative, type SubstitutionFood } from "../_shared/nutrition-substitutions";

const catalog: CatalogFoodReference[] = [
  { id: "a204ffd4-af72-4495-b440-eac372c147ef", source_code: "TACO-1", name: "Arroz integral cozido" },
  { id: "7a7b590a-0730-44b9-964d-9eef950cab57", source_code: "TACO-3", name: "Arroz tipo 1 cozido" },
  { id: "a8fdacac-469c-42f9-bdcb-df15904fb4df", source_code: "TACO-7", name: "Aveia flocos crua" },
];

describe("validação de seleções do catálogo TACO", () => {
  test("aceita IDs internos reais e porções válidas", () => {
    expect(validateFoodSelections([{ name: "Almoço", items: [{ food_id: catalog[0].id, portion_grams: 150, alternatives: [catalog[1].id] }] }], catalog)).toEqual([]);
  });

  test("rejeita ID ausente e sugere busca manual sem selecionar automaticamente", () => {
    const issues = validateFoodSelections([{ name: "Almoço", items: [{ food: "Arroz branco cozido", portion_grams: 150, alternatives: [] }] }], catalog);
    expect(issues[0]?.reason).toContain("nomes livres não são aceitos");
    expect(issues[0]?.suggestions?.map((food) => food.id)).toContain(catalog[1].id);
    expect(issues[0]?.suggestions?.map((food) => food.id)).not.toContain(catalog[0].id);
  });

  test("distingue um código TACO de um ID interno e rejeita alternativas desconhecidas", () => {
    const issues = validateFoodSelections([{ name: "Almoço", items: [{ food_id: "TACO-1", portion_grams: 150, alternatives: ["id-inexistente"] }] }], catalog);
    expect(issues[0]?.reason).toContain("não o ID interno");
    expect(issues[1]?.reason).toContain("não existe no catálogo verificado");
  });

  test("rejeita quantidades fora da faixa aceita", () => {
    const issues = validateFoodSelections([{ name: "Almoço", items: [{ food_id: catalog[0].id, portion_grams: 0, alternatives: [] }] }], catalog);
    expect(issues).toHaveLength(1);
    expect(issues[0]?.reason).toContain("entre 1 e 2.000 g");
  });

  test("a normalização ignora pontuação e mantém compatibilidade do preparo como sugestão", () => {
    const suggestions = findFoodNameSuggestions("Arroz branco cozido", catalog);
    expect(suggestions[0]?.id).toBe(catalog[1].id);
    expect(suggestions.some((food) => food.name.includes("integral"))).toBe(false);
  });
});

describe("equivalência de substituições nutricionais", () => {
  const oats: SubstitutionFood = { id: "oats", name: "Aveia flocos crua", energy_kcal_100g: 394, proteins_g_100g: 13.9, carbohydrates_g_100g: 66.6, fats_g_100g: 8.5, fibers_g_100g: 9.1 };

  test("não sugere aveia por arroz cru quando proteínas e gorduras divergem", () => {
    const rice: SubstitutionFood = { id: "rice", name: "Arroz integral cru", energy_kcal_100g: 360, proteins_g_100g: 7.3, carbohydrates_g_100g: 77.5, fats_g_100g: 2.3, fibers_g_100g: 4.8 };
    expect(equivalentAlternative(oats, rice)).toBeNull();
  });

  test("não equipara bebida láctea a polpa de açaí", () => {
    const drink: SubstitutionFood = { id: "drink", name: "Bebida láctea", energy_kcal_100g: 60, proteins_g_100g: 2, carbohydrates_g_100g: 10, fats_g_100g: 1, fibers_g_100g: null };
    const acai: SubstitutionFood = { id: "acai", name: "Açaí polpa congelada", energy_kcal_100g: 80, proteins_g_100g: 1, carbohydrates_g_100g: 20, fats_g_100g: 3, fibers_g_100g: 3 };
    expect(equivalentAlternative(drink, acai)).toBeNull();
  });

  test("calcula quantidade prática para alternativa nutricionalmente próxima", () => {
    const banana: SubstitutionFood = { id: "banana-2", name: "Banana prata crua", energy_kcal_100g: 98, proteins_g_100g: 1.3, carbohydrates_g_100g: 25.9, fats_g_100g: 0.1, fibers_g_100g: 2 };
    expect(equivalentAlternative({ ...oats, name: "Banana nanica crua", energy_kcal_100g: 92, proteins_g_100g: 1.4, carbohydrates_g_100g: 23.8, fats_g_100g: 0.1, fibers_g_100g: 1.9 }, banana)).toMatchObject({ food_library_id: "banana-2", quantity_g: 95 });
  });
});
