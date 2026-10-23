type ProfileFields = {
  allergies: string;
  intolerances: string;
  diagnosed_conditions: string;
  medications: string;
  supplements: string;
  avoided_foods: string;
  exercise_details: string;
};

type AnamnesisContext = {
  alimentacao?: string | null;
  atividade_fisica?: string | null;
  qualidade_sono?: string | null;
  doencas_fisicas?: string | null;
  medicamentos_atuais?: string | null;
  medicamentos_detalhes?: unknown;
  usa_medicamentos?: boolean | null;
  respostas?: Record<string, unknown> | null;
};

const nonEmpty = (value: unknown): string => typeof value === "string" ? value.trim() : "";
const responseText = (answers: Record<string, unknown>, key: string) => nonEmpty(answers[key]);

export function mergeAnamnesisNutritionProfile<T extends ProfileFields>(profile: T, anamnesis: AnamnesisContext | null): T {
  if (!anamnesis) return profile;
  const answers = anamnesis.respostas ?? {};
  const medicationDetails = nonEmpty(anamnesis.medicamentos_detalhes) || responseText(answers, "medicamentos_detalhes");
  const values: Partial<ProfileFields> = {
    allergies: responseText(answers, "alergias"),
    intolerances: responseText(answers, "intolerancias"),
    diagnosed_conditions: responseText(answers, "doencas") || nonEmpty(anamnesis.doencas_fisicas),
    medications: nonEmpty(anamnesis.medicamentos_atuais) || medicationDetails,
    supplements: responseText(answers, "suplementos") || medicationDetails,
    avoided_foods: responseText(answers, "restricoes_alimentares"),
    exercise_details: nonEmpty(anamnesis.atividade_fisica) || responseText(answers, "atividade_fisica_detalhes"),
  };
  return Object.fromEntries(Object.entries(profile).map(([key, value]) => [
    key,
    typeof value === "string" && value.trim() ? value : values[key as keyof ProfileFields] || value,
  ])) as T;
}

export function waterIntakeFromAnamnesis(anamnesis: AnamnesisContext | null): string | null {
  if (!anamnesis) return null;
  const answers = anamnesis.respostas ?? {};
  const candidates = [responseText(answers, "hidratacao"), responseText(answers, "consumo_agua"), nonEmpty(anamnesis.alimentacao)];
  return candidates.find((value) => /\b(?:agua|água|litros?|ml|hidrata)/i.test(value)) || null;
}

export function relevantAnamnesisReview(anamnesis: AnamnesisContext | null, profile: ProfileFields): string[] {
  if (!anamnesis) return [];
  const answers = anamnesis.respostas ?? {};
  const review: string[] = [];
  if (profile.medications.trim()) review.push("Revisar medicamentos registrados e confirmar quais permanecem em uso.");
  if (profile.supplements.trim()) review.push("Revisar suplementos registrados e confirmar uso atual.");
  if (profile.diagnosed_conditions.trim()) review.push("Revisar condições de saúde registradas antes de adequar o plano.");
  if (anamnesis.qualidade_sono?.trim()) review.push("Considerar a informação sobre sono na revisão profissional.");
  if (profile.allergies.trim() && !/^(nao|não|nenhum|nenhuma|sem alergias?)$/i.test(profile.allergies.trim())) review.push("Confirmar alergias e compatibilidade dos alimentos antes de qualquer uso clínico.");
  if (profile.intolerances.trim() || profile.avoided_foods.trim()) review.push("Conferir intolerâncias e restrições alimentares registradas.");
  if (profile.exercise_details.trim()) review.push("Confirmar tipo, duração e intensidade do exercício e considerar a movimentação diária antes de definir o fator de atividade.");
  if (responseText(answers, "exames")) review.push("Revisar exames laboratoriais informados na anamnese; anexos ou resultados não foram presumidos.");
  if (responseText(answers, "alimentacao") || anamnesis.alimentacao?.trim()) review.push("Revisar histórico alimentar registrado e confirmar se descreve alimentação ou consumo de água.");
  if (["sintomas", "compulsao", "restricoes_alimentares", "humor"].some((key) => responseText(answers, key))) review.push("Revisar o histórico alimentar e emocional relevante informado na anamnese.");
  if (/tirzepatida|mounjaro|monjaro/i.test(`${profile.medications} ${responseText(answers, "tirzepatida") === "Sim" ? "tirzepatida" : ""}`)) review.push("Há registro de tirzepatida na anamnese; tratar como informação clínica histórica e confirmar situação atual com a paciente, sem inferir dose ou continuidade.");
  return [...new Set(review)];
}

export function resolveWeightReference(
  current: { weight_kg: number; weight_date: string; weight_source: string } | null,
  evaluation: { weight_kg: number | null; evaluation_date: string } | null,
  savedReferenceKg: number | null,
) {
  const conflict = Boolean(current && evaluation?.weight_kg && current.weight_date === evaluation.evaluation_date && current.weight_kg !== evaluation.weight_kg);
  return { current, evaluation, savedReferenceKg, conflict };
}

export function isOldEnergyText(text: string, targetKcal: number | null): boolean {
  if (targetKcal === null) return /(?:meta|alvo|prescri[cç][aã]o).{0,50}\d+[,.]\d+\s*kcal/i.test(text);
  const values = [...text.matchAll(/\b(\d{3,5}(?:[,.]\d{1,2})?)\s*kcal\b/gi)].map((match) => Number(match[1].replace(",", ".")));
  return /(?:meta|alvo|prescri[cç][aã]o)/i.test(text) && values.some((value) => Math.abs(value - targetKcal) > 0.02);
}

export function cleanStaleEnergyTexts<T extends { observations?: string[]; warnings?: string[]; professional_confirmations?: string[] }>(plan: T, targetKcal: number | null): T {
  const clean = (items?: string[]) => items?.filter((text) => !isOldEnergyText(text, targetKcal));
  return { ...plan, observations: clean(plan.observations), warnings: clean(plan.warnings), professional_confirmations: clean(plan.professional_confirmations) };
}

export function energyTargetMatches(saved: number | null | undefined, current: number | null | undefined): boolean {
  if (saved == null || current == null) return saved == null && current == null;
  return Number.isFinite(saved) && Number.isFinite(current) && Math.abs(saved - current) <= 0.02;
}
