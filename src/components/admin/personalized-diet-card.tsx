import { useMemo } from "react";
import { CalendarClock, HeartPulse, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SectionCard } from "@/components/admin/admin-ui";

type Evaluation = {
  evaluation_date: string;
  weight_kg: number | null;
  height_cm: number | null;
  bmi: number | null;
  waist_cm: number | null;
  abdomen_cm: number | null;
  hip_cm: number | null;
  chest_cm: number | null;
  right_arm_cm: number | null;
  left_arm_cm: number | null;
  right_thigh_cm: number | null;
  left_thigh_cm: number | null;
  right_calf_cm: number | null;
  left_calf_cm: number | null;
};
type Profile = {
  reference_weight_kg: string;
  goal: string;
  desired_meals: string;
  preferred_foods: string;
  avoided_foods: string;
  allergies: string;
  intolerances: string;
  cultural_restrictions: string;
  food_budget: string;
  diagnosed_conditions: string;
  pregnancy_or_breastfeeding: string;
  eating_disorder_history: string;
};
const display = (value: number | null | undefined, unit = "") => value === null || value === undefined ? "Não informado" : `${value}${unit}`;
const dateLabel = (value: string) => new Date(`${value}T00:00:00`).toLocaleDateString("pt-BR");

export function PersonalizedDietCard({ patient, evaluations, profile, latestWeight, anamnesis, onProfileChange, onGenerate, loading, generating, error, message }: {
  patient: { nome: string; data_nascimento: string | null };
  evaluations: Evaluation[];
  profile: Profile;
  latestWeight: { weight_kg: number; weight_date: string; weight_source: string } | null;
  anamnesis: { alimentacao: string | null; atividade_fisica: string | null; doencas_fisicas: string | null } | null;
  onProfileChange: (key: keyof Profile, value: string) => void;
  onGenerate: () => void;
  loading: boolean;
  generating: boolean;
  error: string;
  message: string;
}) {
  const latest = useMemo(() => {
    const keys: (keyof Evaluation)[] = ["height_cm", "bmi", "waist_cm", "abdomen_cm", "hip_cm", "chest_cm", "right_arm_cm", "left_arm_cm", "right_thigh_cm", "left_thigh_cm", "right_calf_cm", "left_calf_cm"];
    return Object.fromEntries(keys.map((key) => [key, evaluations.find((row) => typeof row[key] === "number" && Number.isFinite(row[key]) && (row[key] as number) > 0) ?? null])) as Record<typeof keys[number], Evaluation | null>;
  }, [evaluations]);
  const age = patient.data_nascimento ? (() => {
    const birthDate = new Date(`${patient.data_nascimento}T00:00:00`);
    if (Number.isNaN(birthDate.getTime())) return null;
    const today = new Date();
    return today.getFullYear() - birthDate.getFullYear() - (today < new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate()) ? 1 : 0);
  })() : null;
  const measurements: [string, keyof Evaluation, string][] = [["Altura", "height_cm", " cm"], ["IMC registrado", "bmi", ""], ["Cintura", "waist_cm", " cm"], ["Abdômen", "abdomen_cm", " cm"], ["Quadril", "hip_cm", " cm"], ["Tórax", "chest_cm", " cm"], ["Braço direito", "right_arm_cm", " cm"], ["Braço esquerdo", "left_arm_cm", " cm"], ["Coxa direita", "right_thigh_cm", " cm"], ["Coxa esquerda", "left_thigh_cm", " cm"], ["Panturrilha direita", "right_calf_cm", " cm"], ["Panturrilha esquerda", "left_calf_cm", " cm"]];
  const fields: [keyof Profile, string][] = [["goal", "Objetivo do planejamento"], ["desired_meals", "Refeições por dia"], ["preferred_foods", "Preferências alimentares adicionais"], ["avoided_foods", "Alimentos a evitar"], ["allergies", "Alergias registradas"], ["intolerances", "Intolerâncias e restrições"], ["cultural_restrictions", "Restrições alimentares/culturais"], ["food_budget", "Orçamento aproximado"]];
  const currentWeight = latestWeight ?? (() => {
    const referenceWeight = Number(profile.reference_weight_kg);
    return Number.isFinite(referenceWeight) && referenceWeight >= 20 && referenceWeight <= 350 ? { weight_kg: referenceWeight, weight_date: "", weight_source: "Peso de referência do perfil nutricional" } : null;
  })();
  const evaluationWithCurrentWeight = currentWeight?.weight_source === "Avaliação corporal" ? evaluations.find((row) => row.evaluation_date === currentWeight.weight_date && row.weight_kg === currentWeight.weight_kg) : null;
  const calculatedBmi = evaluationWithCurrentWeight && latest.height_cm?.id === evaluationWithCurrentWeight.id && evaluationWithCurrentWeight.height_cm ? evaluationWithCurrentWeight.weight_kg! / (evaluationWithCurrentWeight.height_cm / 100) ** 2 : null;
  const needsSpecialistReview = (age !== null && age < 18) || Boolean(profile.pregnancy_or_breastfeeding.trim()) || Boolean(profile.diagnosed_conditions.trim()) || Boolean(profile.eating_disorder_history.trim()) || Boolean(anamnesis?.doencas_fisicas?.trim());

  return <SectionCard title="Gerar Dieta Personalizada">
    <p className="text-sm text-slate-600">Prepare uma proposta alimentar individualizada a partir dos dados da paciente.</p>
    <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1.3fr]">
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <h3 className="flex items-center gap-2 font-semibold text-slate-800"><HeartPulse className="size-4 text-[#2f8f82]" />Dados carregados do cadastro</h3>
        <p className="mt-3 text-sm"><strong>{patient.nome}</strong> · {age === null ? "Idade: Não informado" : `Idade: ${age} anos`}</p>
        <p className="mt-2 text-sm">Peso atual: {currentWeight ? `${currentWeight.weight_kg} kg` : "Não informado"}{currentWeight && <span className="text-slate-500"> · {currentWeight.weight_source} · {currentWeight.weight_date ? dateLabel(currentWeight.weight_date) : "data não informada"}</span>}</p>
        {measurements.map(([label, key, unit]) => {
          const evaluation = latest[key];
          const value = evaluation ? evaluation[key] as number : null;
          return <p key={key} className="mt-1 text-sm">{label}: {display(value, unit)}{evaluation && <span className="text-xs text-slate-500"> · {dateLabel(evaluation.evaluation_date)}</span>}</p>;
        })}
        <p className="mt-1 text-sm">IMC calculado (peso e altura da mesma avaliação): {calculatedBmi === null ? "Não informado" : calculatedBmi.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}{evaluationWithCurrentWeight && calculatedBmi !== null && <span className="text-xs text-slate-500"> · {dateLabel(evaluationWithCurrentWeight.evaluation_date)}</span>}</p>
        <div className="mt-3 border-t border-slate-200 pt-3 text-sm"><p className="flex items-center gap-2 font-medium"><CalendarClock className="size-4 text-[#2f8f82]" />Última avaliação: {evaluations[0]?.evaluation_date ? dateLabel(evaluations[0].evaluation_date) : "Não informada"}</p><p className="mt-2">Evolução do peso: {evaluations.length > 1 ? evaluations.filter((item) => item.weight_kg !== null).map((item) => `${dateLabel(item.evaluation_date)}: ${item.weight_kg} kg`).join(" · ") : "Não informado"}</p></div>
        <div className="mt-3 border-t border-slate-200 pt-3 text-sm"><p><strong>Anamnese alimentar: </strong>{anamnesis?.alimentacao || "Não informado"}</p><p className="mt-1"><strong>Atividade física: </strong>{anamnesis?.atividade_fisica || "Não informado"}</p><p className="mt-1"><strong>Condições clínicas registradas: </strong>{anamnesis?.doencas_fisicas || "Não informado"}</p></div>
      </div>
      <div>
        <h3 className="font-semibold text-slate-800">Configuração profissional</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">{fields.map(([key, label]) => <div key={key}><Label htmlFor={`diet-${key}`}>{label}</Label>{key === "goal" || key === "desired_meals" || key === "food_budget" ? <Input id={`diet-${key}`} className="mt-1" type={key === "desired_meals" ? "number" : "text"} value={profile[key]} onChange={(event) => onProfileChange(key, event.target.value)} /> : <Textarea id={`diet-${key}`} className="mt-1 min-h-20" value={profile[key]} onChange={(event) => onProfileChange(key, event.target.value)} />}</div>)}</div>
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">A IA recebe apenas uma categoria de objetivo, a quantidade de refeições e nomes de alimentos verificados já filtrados localmente. Nome, identificação, medidas, avaliações e anamnese não são enviados. Composição e nutrientes vêm exclusivamente da biblioteca validada e do cálculo proporcional determinístico.{needsSpecialistReview ? " Há condição que exige avaliação individualizada; a geração automática está bloqueada." : " Toda proposta será salva como rascunho para revisão profissional."}</p>
        <Button type="button" className="mt-4 w-full bg-[#2f8f82] hover:bg-[#26786e]" disabled={loading || generating || needsSpecialistReview} onClick={onGenerate}><Sparkles className="mr-2 size-4" />{generating ? "Gerando proposta..." : "Gerar proposta alimentar com IA"}</Button>
        {error && <p role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        {message && <p role="status" className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
      </div>
    </div>
  </SectionCard>;
}
