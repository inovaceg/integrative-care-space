import { describe, expect, test } from "bun:test";
import { findFoodNameSuggestions, validateFoodSelections, type CatalogFoodReference } from "../_shared/nutrition-plan-catalog";

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
