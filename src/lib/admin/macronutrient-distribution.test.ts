import { describe, expect, test } from "bun:test";
import { calculateMacroDistribution, isMacroDistributionStale } from "./macronutrient-distribution";

describe("distribuição individualizada de macronutrientes", () => {
  test("calcula gramas e percentuais a partir dos parâmetros individualizados", () => {
    const { distribution, issues } = calculateMacroDistribution({ energyKcal: 2000, referenceWeightKg: 70, proteinFactorGPerKg: 1.6, fatPercent: 30 });
    expect(issues).toEqual([]);
    expect(distribution?.proteinG).toBe(112);
    expect(distribution?.fatG).toBeCloseTo(2000 * 0.3 / 9);
    expect(distribution?.carbohydrateG).toBeCloseTo((2000 - 112 * 4 - 2000 * 0.3) / 4);
    expect(distribution!.carbohydratePercent + distribution!.proteinPercent + distribution!.fatPercent).toBeCloseTo(100);
  });

  test("recalcula percentuais e gramas quando a meta calórica muda sem alterar o fator", () => {
    const first = calculateMacroDistribution({ energyKcal: 2000, referenceWeightKg: 70, proteinFactorGPerKg: 1.6, fatPercent: 30 }).distribution!;
    const next = calculateMacroDistribution({ energyKcal: 1800, referenceWeightKg: 70, proteinFactorGPerKg: 1.6, fatPercent: 30 }).distribution!;
    expect(first.proteinG).toBe(next.proteinG);
    expect(first.fatG).not.toBe(next.fatG);
    expect(first.carbohydrateG).not.toBe(next.carbohydrateG);
    expect(next.carbohydratePercent + next.proteinPercent + next.fatPercent).toBeCloseTo(100);
  });

  test("identifica cada parâmetro insuficiente sem presumir distribuição", () => {
    const result = calculateMacroDistribution({ energyKcal: null, referenceWeightKg: null, proteinFactorGPerKg: null, fatPercent: null });
    expect(result.distribution).toBeNull();
    expect(result.issues).toHaveLength(4);
  });

  test("não força distribuição quando proteínas e gorduras excedem a meta", () => {
    const result = calculateMacroDistribution({ energyKcal: 1000, referenceWeightKg: 100, proteinFactorGPerKg: 3, fatPercent: 40 });
    expect(result.distribution).toBeNull();
    expect(result.issues[0]).toContain("excedem a energia disponível");
  });

  test("recusa entradas fora dos limites de validade", () => {
    expect(calculateMacroDistribution({ energyKcal: 499, referenceWeightKg: 70, proteinFactorGPerKg: 1, fatPercent: 30 }).distribution).toBeNull();
    expect(calculateMacroDistribution({ energyKcal: 2000, referenceWeightKg: 0, proteinFactorGPerKg: 1, fatPercent: 30 }).issues).toContain("Peso de referência válido entre 20 e 350 kg.");
  });
});

describe("detecção de distribuição desatualizada", () => {
  test("retorna falso quando a meta calórica não mudou", () => {
    expect(isMacroDistributionStale(2000, 2000)).toBe(false);
  });

  test("retorna falso quando não há distribuição calculada", () => {
    expect(isMacroDistributionStale(null, 2000)).toBe(false);
  });

  test("retorna verdadeiro quando a meta calórica mudou", () => {
    expect(isMacroDistributionStale(2000, 1800)).toBe(true);
  });

  test("retorna verdadeiro quando não há meta calórica atual", () => {
    expect(isMacroDistributionStale(2000, null)).toBe(true);
  });

  test("considera diferença de 0,02 kcal como não desatualizada", () => {
    expect(isMacroDistributionStale(2000, 2000.01)).toBe(false);
  });
});
