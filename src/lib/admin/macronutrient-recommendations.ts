import { calculateMacroDistribution } from "@/lib/admin/macronutrient-distribution";

export type MacroRecommendationInput = {
  ageYears: number | null;
  weightKg: number | null;
  heightCm: number | null;
  referenceWeightKg: number | null;
  energyKcal: number | null;
  objective: "maintenance" | "weight_loss" | "weight_gain" | null;
  activityLevel: string;
  activityDetails: string;
  weightLossHistoryPercent: number | null;
  bodyFatPercent: number | null;
  muscleMassKg: number | null;
  medications: string;
  conditions: string;
  anamnesis: string;
};

export function macroRecommendationKey(input: MacroRecommendationInput): string {
  return JSON.stringify(input);
}

export type MacroRecommendation = {
  referenceWeightKg: number | null;
  proteinFactorGPerKg: number | null;
  fatPercent: number | null;
  distribution: ReturnType<typeof calculateMacroDistribution>["distribution"];
  protocol: string;
  rationale: string[];
  references: string[];
  issues: string[];
  requiresClinicalDefinition: boolean;
};

const references = {
  adult: "National Academies (2005). Dietary Reference Intakes for Energy, Carbohydrate, Fiber, Fat, Fatty Acids, Cholesterol, Protein, and Amino Acids. doi:10.17226/10490.",
  sport: "Jäger et al. (2017). International Society of Sports Nutrition Position Stand: protein and exercise. JISSN 14:20. doi:10.1186/s12970-017-0177-8.",
  strength: "Morton et al. (2018). A systematic review, meta-analysis and meta-regression of protein supplementation and resistance training. Br J Sports Med 52:376–384. doi:10.1136/bjsports-2017-097608.",
  older: "Deutz et al. (2014). Protein intake and exercise for optimal muscle function with aging: recommendations from the ESPEN Expert Group. Clin Nutr 33:929–936. doi:10.1016/j.clnu.2014.04.007.",
  weightLoss: "Leidy et al. (2015). The role of protein in weight loss and maintenance. Am J Clin Nutr 101:1320S–1329S. doi:10.3945/ajcn.114.084038.",
} as const;

const normalized = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");

export function recommendMacronutrients(input: MacroRecommendationInput): MacroRecommendation {
  const issues: string[] = [];
  const rationale: string[] = [];
  const text = normalized([input.medications, input.conditions, input.anamnesis].join(" "));
  const activity = normalized(`${input.activityLevel} ${input.activityDetails}`);
  const medicationOnWeightLoss = /tirzepatida|semaglutida|liraglutida|zepbound|mounjaro|wegovy|ozempic|saxenda/.test(text);
  const renalConcern = /doenca renal|insuficiencia renal|nefropatia|dialise|hemodialise|doenca renal cronica/.test(text);
  const renalStatusDocumented = /funcao renal preservada|sem (?:alteracao|doenca) renal|tfg (?:normal|preservada)|egrf (?:normal|preservada)/.test(text);
  const specialClinicalConcern = /gestante|gravidez|lactante|amamenta|transtorno alimentar|anorexia|bulimia|cancer|oncolog|hepatopatia|cirrose|pos operatorio|pos-operatorio/.test(text);
  const strengthTraining = /musculacao|treino de forca|resistance training|levantamento de peso/.test(activity);
  const active = /ativo|intenso|moderado|treina|exercicio|atividade fisica/.test(activity);
  const bmi = input.weightKg !== null && input.heightCm !== null && input.heightCm > 0
    ? input.weightKg / ((input.heightCm / 100) ** 2)
    : null;
  const referenceWeightKg = input.referenceWeightKg ?? (bmi !== null && bmi >= 30 && input.heightCm !== null
    ? 25 * (input.heightCm / 100) ** 2
    : input.weightKg);

  if (input.ageYears === null || input.ageYears < 18) issues.push("Idade adulta válida não disponível; não gerar sugestão automática de adulto.");
  if (input.energyKcal === null || !Number.isFinite(input.energyKcal) || input.energyKcal < 500 || input.energyKcal > 10000) issues.push("Meta calórica aprovada válida não disponível.");
  if (referenceWeightKg === null || !Number.isFinite(referenceWeightKg) || referenceWeightKg < 20 || referenceWeightKg > 350) issues.push("Peso de referência adequado precisa ser definido.");
  if (input.heightCm === null || !Number.isFinite(input.heightCm) || input.heightCm < 100 || input.heightCm > 250) issues.push("Altura válida não disponível para contextualizar o peso.");
  if (input.bodyFatPercent === null && input.muscleMassKg === null) rationale.push("Composição corporal não disponível; não foi inferida massa livre de gordura.");
  if (input.weightLossHistoryPercent !== null && input.weightLossHistoryPercent >= 5) rationale.push(`Perda de peso documentada de ${input.weightLossHistoryPercent.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% no período avaliado; preservar massa magra requer revisão do plano e evolução clínica.`);
  if (medicationOnWeightLoss) rationale.push("Medicamento associado ao tratamento da obesidade detectado; acompanhar ingestão, tolerância, adequação proteica e preservação de massa magra. A evidência não define um fator exclusivo do fármaco.");
  if (renalConcern) issues.push("Possível doença renal identificada; fator proteico e peso de cálculo devem ser definidos pelo profissional com dados clínicos e renais.");
  if (specialClinicalConcern) issues.push("Condição especial identificada; os parâmetros de macronutrientes exigem definição clínica individual.");
  if (!renalStatusDocumented && !renalConcern) rationale.push("Função renal não documentada como preservada nos dados consultados; não se presume normalidade e a sugestão requer validação profissional explícita.");

  let proteinFactorGPerKg: number | null = null;
  let proteinProtocol = "Definição profissional necessária";
  let proteinReference = references.adult;
  if (!issues.some((issue) => /Idade adulta|Peso de referência|doença renal|Condição especial/.test(issue))) {
    if (input.ageYears! >= 65) {
      proteinFactorGPerKg = 1.2;
      proteinProtocol = "Pessoa idosa — sugestão inicial 1,2 g/kg/dia";
      proteinReference = references.older;
      rationale.push("Idade ≥65 anos: sugestão inicial de 1,2 g/kg/dia dentro da faixa geriátrica de 1,0–1,2 g/kg/dia; deve ser individualizada.");
    } else if (input.objective === "weight_loss") {
      proteinFactorGPerKg = strengthTraining ? 1.6 : active ? 1.4 : 1.2;
      proteinProtocol = strengthTraining ? "Emagrecimento com treino de força — 1,6 g/kg/dia" : "Emagrecimento — sugestão inicial 1,2–1,6 g/kg/dia";
      proteinReference = strengthTraining ? references.strength : references.weightLoss;
      rationale.push(strengthTraining ? "Emagrecimento com treino de força: 1,6 g/kg/dia, dentro de faixas estudadas para preservar/ganhar massa magra; não equivale a prescrição." : `Emagrecimento: sugestão inicial de ${proteinFactorGPerKg} g/kg/dia, dentro de intervalos estudados em intervenções de perda de peso; atividade detectada ${active ? "e considerada" : "não detalhada"}.`);
    } else if (strengthTraining) {
      proteinFactorGPerKg = 1.6;
      proteinProtocol = "Treino de força — 1,6 g/kg/dia";
      proteinReference = references.strength;
      rationale.push("Treino de força explicitamente identificado: 1,6 g/kg/dia, próximo ao ponto de referência de meta-análise; ajustar conforme carga, ingestão e clínica.");
    } else if (active) {
      proteinFactorGPerKg = 1.4;
      proteinProtocol = "Pessoa fisicamente ativa — 1,4 g/kg/dia";
      proteinReference = references.sport;
      rationale.push("Atividade física identificada: 1,4 g/kg/dia, limite inferior da faixa ISSN para pessoas que se exercitam; o tipo/intensidade deve ser confirmado.");
    } else {
      proteinFactorGPerKg = 0.8;
      proteinProtocol = "Adulto em manutenção — referência RDA 0,8 g/kg/dia";
      rationale.push("Adulto em manutenção sem evidência de treino ou emagrecimento: referência RDA 0,8 g/kg/dia; não é meta terapêutica universal.");
    }
    if (medicationOnWeightLoss && input.objective === "weight_loss") proteinFactorGPerKg = Math.max(proteinFactorGPerKg, 1.2);
    if (bmi !== null && bmi >= 30 && input.referenceWeightKg === null) rationale.push(`IMC calculado ${bmi.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}: para a sugestão, foi usado peso de referência correspondente a IMC 25 (${referenceWeightKg?.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} kg), não o peso atual. O profissional deve confirmar a adequação.`);
    if (input.referenceWeightKg !== null) rationale.push("Foi mantido o peso de referência escolhido pelo profissional; o sistema não o substituiu pelo peso atual.");
  }

  const fatPercent = input.energyKcal !== null && input.energyKcal >= 500 && input.energyKcal <= 10000 && input.ageYears !== null && input.ageYears >= 18 && !renalConcern && !specialClinicalConcern
    ? 30
    : null;
  if (fatPercent !== null) rationale.push("Gorduras sugeridas em 30% da energia: ponto médio aritmético da faixa AMDR de 20–35% para adultos; regra determinística configurada, não escolha aleatória nem recomendação universal. Reavaliar contexto clínico e tolerância alimentar.");
  const distributionResult = calculateMacroDistribution({ energyKcal: input.energyKcal, referenceWeightKg, proteinFactorGPerKg, fatPercent });
  issues.push(...distributionResult.issues);
  if (distributionResult.distribution && (distributionResult.distribution.fatPercent < 20 || distributionResult.distribution.fatPercent > 35)) issues.push("Percentual de gorduras fora da faixa AMDR adulta de 20–35%; revisão profissional necessária.");
  if (distributionResult.distribution && distributionResult.distribution.carbohydratePercent <= 0) issues.push("Energia restante para carboidratos não é positiva; nenhuma distribuição foi forçada.");
  if (input.ageYears !== null && input.ageYears < 18) proteinFactorGPerKg = null;

  return {
    referenceWeightKg,
    proteinFactorGPerKg,
    fatPercent,
    distribution: distributionResult.distribution,
    protocol: proteinProtocol,
    rationale,
    references: [...new Set([proteinReference, references.adult])],
    issues: [...new Set(issues)],
    requiresClinicalDefinition: renalConcern || specialClinicalConcern || !renalStatusDocumented || input.ageYears === null || (input.ageYears ?? 0) < 18,
  };
}
