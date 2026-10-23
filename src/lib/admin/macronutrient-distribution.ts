export type MacroDistributionInput = {
  energyKcal: number | null;
  referenceWeightKg: number | null;
  proteinFactorGPerKg: number | null;
  fatPercent: number | null;
};

export type MacroDistribution = {
  carbohydrateG: number;
  proteinG: number;
  fatG: number;
  carbohydratePercent: number;
  proteinPercent: number;
  fatPercent: number;
};

export function calculateMacroDistribution(input: MacroDistributionInput): { distribution: MacroDistribution | null; issues: string[] } {
  const issues: string[] = [];
  const { energyKcal, referenceWeightKg, proteinFactorGPerKg, fatPercent } = input;
  if (energyKcal === null || !Number.isFinite(energyKcal) || energyKcal < 500 || energyKcal > 10000) issues.push("Meta calórica validada entre 500 e 10.000 kcal/dia.");
  if (referenceWeightKg === null || !Number.isFinite(referenceWeightKg) || referenceWeightKg < 20 || referenceWeightKg > 350) issues.push("Peso de referência válido entre 20 e 350 kg.");
  if (proteinFactorGPerKg === null || !Number.isFinite(proteinFactorGPerKg) || proteinFactorGPerKg <= 0 || proteinFactorGPerKg > 10) issues.push("Fator proteico individual válido, maior que 0 e até 10 g/kg/dia.");
  if (fatPercent === null || !Number.isFinite(fatPercent) || fatPercent <= 0 || fatPercent >= 100) issues.push("Percentual energético de gorduras entre 0% e 100%.");
  if (issues.length) return { distribution: null, issues };

  const proteinG = referenceWeightKg! * proteinFactorGPerKg!;
  const fatG = energyKcal! * fatPercent! / 100 / 9;
  const carbohydrateG = (energyKcal! - proteinG * 4 - fatG * 9) / 4;
  if (!Number.isFinite(carbohydrateG) || carbohydrateG <= 0) return { distribution: null, issues: ["As metas de proteínas e gorduras excedem a energia disponível ou deixam carboidratos sem energia positiva. Revise os parâmetros; os valores não foram ajustados automaticamente."] };

  const proteinKcal = proteinG * 4;
  const fatKcal = fatG * 9;
  const carbohydrateKcal = carbohydrateG * 4;
  return {
    distribution: {
      carbohydrateG,
      proteinG,
      fatG,
      carbohydratePercent: carbohydrateKcal / energyKcal! * 100,
      proteinPercent: proteinKcal / energyKcal! * 100,
      fatPercent: fatKcal / energyKcal! * 100,
    },
    issues: [],
  };
}
