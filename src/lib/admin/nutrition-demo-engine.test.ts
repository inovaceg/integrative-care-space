import { describe, expect, test } from "bun:test";
import { DemoGenerationError, demoFoods, generateDemoPlan, parseDemoFoodCsv, recalculateDemoPlan } from "./nutrition-demo-engine";

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

  test("bloqueia metas fora dos limites de porção demonstrativos", () => {
    expect(() => generateDemoPlan({ ...safeInput, targetKcal: 10000 })).toThrow(/faixa de ajuste/);
  });

  test("recalcula totais após editar uma porção", () => {
    const plan = generateDemoPlan(safeInput);
    const changed = structuredClone(plan);
    changed.days[0].meals[0].items[0].grams += 20;
    const recalculated = recalculateDemoPlan(changed, demoFoods);
    expect(recalculated.days[0].totals.kcal).toBeGreaterThan(plan.days[0].totals.kcal);
  });

  test("valida cabeçalhos, valores e duplicatas de CSV", () => {
    const csv = "nome,categoria,calorias_kcal_100g,proteina_g_100g,carboidrato_g_100g,gordura_g_100g,alergenicos,fonte,licenca\nItem,Cereais,100,5,20,2,,Fonte fictícia,Demo\nitem,Cereais,100,5,20,2,,Fonte fictícia,Demo";
    const parsed = parseDemoFoodCsv(csv);
    expect(parsed.rows).toHaveLength(2);
    expect(parsed.duplicates).toHaveLength(1);
    expect(parsed.errors).toHaveLength(0);
    expect(parseDemoFoodCsv("nome,categoria\nItem,Cereais").errors[0]).toContain("Colunas obrigatórias ausentes");
  });
});
