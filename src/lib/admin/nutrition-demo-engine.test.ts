import { describe, expect, test } from "bun:test";
import { DemoGenerationError, demoFoods, generateDemoPlan, isDemoFoodAllowed, parseDemoFoodCsv, recalculateDemoPlan } from "./nutrition-demo-engine";

const safeInput = { days: 1, targetKcal: 1600, targetProtein: 90, allergies: [], restrictions: [], clinicalReviewConfirmed: true };

describe("motor local de demonstração nutricional", () => {
  for (const days of [1, 3, 7]) {
    test(`gera ${days} dia(s) somente como simulação fictícia`, () => {
      const plan = generateDemoPlan({ ...safeInput, days });
      expect(plan.days).toHaveLength(days);
      expect(plan.label).toContain("NÃO É PRESCRIÇÃO");
      expect(plan.days.every((day) => day.meals.length === 3 && day.totals.kcal > 0)).toBe(true);
    });
  }

  test("bloqueia metas ausentes e confirmação clínica não marcada", () => {
    expect(() => generateDemoPlan({ ...safeInput, targetKcal: null })).toThrow(DemoGenerationError);
    expect(() => generateDemoPlan({ ...safeInput, clinicalReviewConfirmed: false })).toThrow(/foram revisadas/);
  });

  test("bloqueia alergia ou restrição quando não há três refeições seguras", () => {
    expect(() => generateDemoPlan({ ...safeInput, allergies: ["leite"] })).toThrow(/suficientes compatíveis/);
    expect(() => generateDemoPlan({ ...safeInput, restrictions: ["sem glúten"] })).toThrow(/suficientes compatíveis/);
  });

  test("bloqueia metas fora dos limites e dados de alergênicos desconhecidos", () => {
    expect(() => generateDemoPlan({ ...safeInput, targetKcal: 10000 })).toThrow(/faixa de ajuste/);
    const unknownAllergens = demoFoods.map((food) => food.id === "demo-banana" ? { ...food, allergenInfoKnown: false } : food);
    expect(() => generateDemoPlan(safeInput, unknownAllergens)).toThrow(/suficientes compatíveis/);
  });

  test("não permite alimentos em rascunho, itens sem dados de alergênicos ou alergia correspondente", () => {
    const food = demoFoods.find((item) => item.id === "demo-fish");
    expect(food).toBeDefined();
    if (!food) return;
    expect(isDemoFoodAllowed({ ...food, status: "draft" }, [], [])).toBe(false);
    expect(isDemoFoodAllowed({ ...food, allergenInfoKnown: false }, [], [])).toBe(false);
    expect(isDemoFoodAllowed({ ...food, nutritionMissing: ["gorduras_g_100g"] }, [], [])).toBe(false);
    expect(isDemoFoodAllowed(food, ["peixe"], [])).toBe(false);
    expect(isDemoFoodAllowed(food, [], ["sem glúten"])).toBe(true);
  });

  test("varia combinações entre dias e recalcula totais após editar porções", () => {
    const plan = generateDemoPlan({ ...safeInput, days: 3 });
    const firstDayItem = plan.days[0]?.meals[1]?.items[2];
    const secondDayItem = plan.days[1]?.meals[1]?.items[2];
    expect(firstDayItem).toBeDefined();
    expect(secondDayItem).toBeDefined();
    expect(firstDayItem?.foodId).not.toBe(secondDayItem?.foodId);

    const changed = structuredClone(plan);
    const firstItem = changed.days[0]?.meals[0]?.items[0];
    if (!firstItem) throw new Error("A simulação não gerou o item esperado.");
    firstItem.grams += 20;
    const recalculated = recalculateDemoPlan(changed, demoFoods);
    expect(recalculated.days[0]?.totals.kcal).toBeGreaterThan(plan.days[0]?.totals.kcal ?? 0);

    const lunchItem = changed.days[0]?.meals[1]?.items[2];
    const fish = demoFoods.find((food) => food.id === "demo-fish");
    expect(fish).toBeDefined();
    expect(isDemoFoodAllowed(fish!, [], [])).toBe(true);
    if (lunchItem && fish) lunchItem.foodId = fish.id;
    const afterSubstitution = recalculateDemoPlan(changed, demoFoods);
    expect(afterSubstitution.days[0]?.totals.kcal).not.toBe(recalculated.days[0]?.totals.kcal);
    expect(fish && isDemoFoodAllowed(fish, ["peixe"], [])).toBe(false);
  });

  test("valida cabeçalhos, valores e duplicatas de CSV", () => {
    const csv = "nome,categoria,calorias_kcal_100g,proteina_g_100g,carboidrato_g_100g,gordura_g_100g,alergenicos,fonte,licenca\nItem,Cereais,100,5,20,2,,Fonte fictícia,Demo\nitem,Cereais,100,5,20,2,,Fonte fictícia,Demo";
    const parsed = parseDemoFoodCsv(csv);
    expect(parsed.rows).toHaveLength(2);
    expect(parsed.duplicates).toHaveLength(1);
    expect(parsed.errors).toHaveLength(0);
    expect(parseDemoFoodCsv("nome,categoria\nItem,Cereais").errors[0]).toContain("Colunas obrigatórias ausentes");
    const invalidCsv = csv.replace(",100,5,20,2,", ",-10,5,20,2,");
    expect(parseDemoFoodCsv(invalidCsv).errors.some((error) => error.includes("não negativo"))).toBe(true);
  });

  test("importa o formato TACO com separador ponto e vírgula e preserva valores ausentes", () => {
    const taco = "codigo_taco;nome;categoria;energia_kcal_100g;proteinas_g_100g;carboidratos_g_100g;gorduras_g_100g;fibras_g_100g;calcio_mg_100g;ferro_mg_100g;sodio_mg_100g;potassio_mg_100g;medidas_caseiras;alergenicos;status_alergenicos;contem_gluten;contem_lactose;fonte;licenca;status_validacao;observacoes_importacao\n1;Item TACO;;100;5;20;;3;4;0.5;8;90;;;desconhecido;desconhecido;desconhecido;TACO; ;rascunho;gorduras_g_100g: Tr";
    const parsed = parseDemoFoodCsv(taco);
    expect(parsed.errors).toHaveLength(0);
    expect(parsed.rows[0]?.nome).toBe("Item TACO");
    expect(parsed.rows[0]?.categoria).toBe("TACO importado");
    expect(parsed.rows[0]?.calorias_kcal_100g).toBe("100");
    expect(parsed.rows[0]?.fibras_g_100g).toBe("3");
    expect(parsed.rows[0]?.nutrition_missing).toContain("gorduras_g_100g");
  });
});
