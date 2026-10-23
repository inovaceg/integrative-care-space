import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Flame, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { activityFactorForLevel, calculateEnergyTarget, calculateMifflinStJeor, type SexParameter } from "@/lib/admin/nutrition-calculations";

export type EnergyPlan = {
  method: "Mifflin-St Jeor";
  sex_parameter: SexParameter | null;
  weight_kg: number | null;
  height_cm: number | null;
  age_years: number | null;
  age_source: string | null;
  weight_source: string | null;
  weight_date: string | null;
  calculated_at: string | null;
  height_source: string | null;
  activity_level: string;
  activity_factor: number | null;
  activity_context: string;
  objective: "maintenance" | "weight_loss" | "weight_gain" | null;
  adjustment_mode: "percent" | "kcal" | null;
  adjustment_value: number | null;
  objective_confirmed: boolean;
  activity_confirmed: boolean;
  clinical_reviewed: boolean;
  reviewer_name: string;
  bmr_kcal: number | null;
  estimated_daily_kcal: number | null;
  adjusted_daily_kcal: number | null;
  observations: string;
  professional_reviewed: boolean;
  reviewed_at: string | null;
};

const activityFactors: Record<string, number> = { "Sedentário": 1.2, "Leve": 1.375, "Moderado": 1.55, "Intenso": 1.725, "Muito intenso": 1.9 };
const parseNumber = (raw: string): number | null => { const n = Number(raw.trim().replace(/\s/g, "").replace(",", ".")); return raw.trim() && Number.isFinite(n) ? n : null; };
const fmt = (value: number | null) => value === null ? "Não informado" : value.toLocaleString("pt-BR", { maximumFractionDigits: 2 });

export function EnergySection({ value, onChange, weightKg, weightDate, weightSource, heightCm, patientAge, activityLevel, activityContext, heightSource, activityEvidenceSufficient = true, objectiveSources = [], objectiveConflict = false, clinicalReviewFlags = [], onSave, saving, canSave }: {
  value: EnergyPlan; onChange: (next: EnergyPlan) => void; weightKg: number | null; weightDate: string | null; weightSource: string | null; heightCm: number | null; patientAge: number | null; activityLevel: string; activityContext: string; heightSource: string; activityEvidenceSufficient?: boolean; objectiveSources?: string[]; objectiveConflict?: boolean; clinicalReviewFlags?: string[]; onSave: () => void; saving: boolean; canSave: boolean;
}) {
  const [weightInput, setWeightInput] = useState("");
  const [heightInput, setHeightInput] = useState("");
  const [ageInput, setAgeInput] = useState("");
  const weight = value.weight_kg ?? weightKg;
  const height = value.height_cm ?? heightCm;
  const age = value.age_years ?? patientAge;
  useEffect(() => { setWeightInput(weight === null ? "" : String(weight).replace(".", ",")); }, [weight]);
  useEffect(() => { setHeightInput(height === null ? "" : String(height).replace(".", ",")); }, [height]);
  useEffect(() => { setAgeInput(age === null ? "" : String(age)); }, [age]);
  const activityKey = value.activity_level || activityLevel;
  const factor = activityFactorForLevel(activityKey);
  const activityOption = Object.keys(activityFactors).find((label) => activityFactors[label] === factor) ?? "none";
  const estimate = useMemo(() => calculateMifflinStJeor({ weightKg: weight, heightCm: height, ageYears: age, sex: value.sex_parameter, activityFactor: factor }), [weight, height, age, value.sex_parameter, factor]);
  const adjustment = value.adjustment_value ?? 0;
  const adjustmentMode = value.adjustment_mode ?? "percent";
  const target = estimate?.totalKcal != null && value.objective ? calculateEnergyTarget(estimate.totalKcal, value.objective, adjustmentMode, value.adjustment_value) : null;
  const targetValid = target !== null && target >= 500 && target <= 10000;
  const approvalBlockers = [
    !estimate && "Preencha peso, altura, idade, nível de atividade e parâmetro da equação.",
    !value.objective && "Selecione o objetivo energético.",
    !targetValid && "A meta calculada precisa estar entre 500 e 10.000 kcal/dia.",
    value.objective !== null && value.objective !== "maintenance" && (adjustment <= 0 || adjustment > (value.adjustment_mode === "kcal" ? 1000 : 50)) && "Defina um ajuste individual válido para o objetivo.",
    value.observations.trim().length < 40 && "Escreva uma justificativa clínica com pelo menos 40 caracteres.",
    !value.reviewer_name.trim() && "Informe o profissional responsável.",
    !value.activity_confirmed && "Confirme o fator de atividade.",
    !value.clinical_reviewed && "Marque a revisão clínica.",
  ].filter((reason): reason is string => Boolean(reason));
  const justificationRequired = approvalBlockers.length > 0;
  useEffect(() => {
    if (value.adjusted_daily_kcal !== target || (target === null && value.professional_reviewed)) onChange({ ...value, adjusted_daily_kcal: target, bmr_kcal: estimate?.bmrKcal ?? null, estimated_daily_kcal: estimate?.totalKcal ?? null, activity_factor: factor, professional_reviewed: false, reviewed_at: null });
  }, [target, value, onChange, estimate, factor]);
  const set = <K extends keyof EnergyPlan>(key: K, field: EnergyPlan[K]) => onChange({ ...value, [key]: field, ...(key === "objective" && field !== "maintenance" && !value.adjustment_mode ? { adjustment_mode: "percent" as const } : {}), ...(key === "objective" ? { objective_confirmed: false } : {}), ...(key === "activity_level" ? { activity_confirmed: false } : {}), professional_reviewed: false, reviewed_at: null });
  const updateParam = (key: "weight_kg" | "height_cm" | "age_years", raw: string, setter: (s: string) => void) => {
    setter(raw);
    const parsed = raw.trim() ? parseNumber(raw) : null;
    const sourceKey = key === "weight_kg" ? "weight_source" : key === "height_cm" ? "height_source" : "age_source";
    const currentSource = value[sourceKey];
    const originalSource = typeof currentSource === "string" ? currentSource.match(/^Correção manual \(origem: (.*)\)$/)?.[1] ?? currentSource : currentSource;
    onChange({ ...value, [key]: parsed, [sourceKey]: raw.trim() ? `Correção manual (origem: ${originalSource ?? "não informada"})` : null, professional_reviewed: false, reviewed_at: null });
  };
  const confirm = () => onChange({ ...value, objective_confirmed: true, adjusted_daily_kcal: target, bmr_kcal: estimate?.bmrKcal ?? null, estimated_daily_kcal: estimate?.totalKcal ?? null, activity_factor: factor, activity_level: activityKey, professional_reviewed: !value.professional_reviewed, reviewed_at: value.professional_reviewed ? null : new Date().toISOString() });
  const adjustmentLabel = value.objective === "weight_loss" ? "Déficit" : "Superávit";

  return <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
    <header className="flex items-center gap-2 border-b border-slate-100 px-5 py-4"><Flame className="size-5 text-[#2f8f82]" /><h2 className="font-display text-base font-semibold text-slate-800">NECESSIDADES ENERGÉTICAS</h2></header>
    <div className="space-y-5 p-5">
      <p className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-950">Estimativas de referência, não prescrição. A equação não deve ser aplicada automaticamente a menores, gestantes ou situações clínicas especiais. Déficit/superávit e meta exigem avaliação individual e confirmação profissional.</p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div><Label>Objetivo</Label><Select value={value.objective ?? "none"} onValueChange={(v) => set("objective", v === "none" ? null : v as EnergyPlan["objective"])}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Selecione/ confirme</SelectItem><SelectItem value="maintenance">Manutenção do peso</SelectItem><SelectItem value="weight_loss">Emagrecimento</SelectItem><SelectItem value="weight_gain">Ganho de peso/massa muscular</SelectItem></SelectContent></Select><p className="mt-1 text-xs text-slate-500">Identificação automática pela anamnese e perfil; confirme o objetivo antes de aprovar.</p></div>
        <div><Label>Parâmetro da equação — confirmação profissional</Label><Select value={value.sex_parameter ?? "none"} onValueChange={(v) => set("sex_parameter", v === "none" ? null : v as SexParameter)}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Não confirmado</SelectItem><SelectItem value="female">Feminino</SelectItem><SelectItem value="male">Masculino</SelectItem></SelectContent></Select><p className="mt-1 text-xs text-slate-500">Não inferido do gênero cadastrado.</p></div>
        <div><Label>Nível de atividade</Label><Select value={activityOption} onValueChange={(v) => set("activity_level", v === "none" ? "Não informado" : v)}><SelectTrigger className="mt-1"><SelectValue placeholder="Selecione/ confirme" /></SelectTrigger><SelectContent><SelectItem value="none">Não informado</SelectItem>{Object.keys(activityFactors).map((label) => <SelectItem key={label} value={label}>{label} · {activityFactors[label]}</SelectItem>)}</SelectContent></Select><p className="mt-1 text-xs text-slate-500">Considere duração/intensidade, trabalho e movimentação diária; frequência isolada não define o fator.</p></div>
        {[["weight_kg", "Peso (kg)", weightInput, setWeightInput, weight, value.weight_source ?? weightSource ?? "Entrada manual", value.weight_date ?? weightDate], ["height_cm", "Altura (cm)", heightInput, setHeightInput, height, value.height_source ?? heightSource, null], ["age_years", "Idade (anos)", ageInput, setAgeInput, age, value.age_source ?? "Data de nascimento", null]].map(([key, label, input, setter, current, source, date]) => <div key={key as string}><Label>{label as string}</Label><Input className="mt-1" inputMode="decimal" value={input as string} onChange={(e) => updateParam(key as "weight_kg" | "height_cm" | "age_years", e.target.value, setter as (s: string) => void)} /><p className="mt-1 text-xs text-slate-500">{input === "" ? `Atual: ${fmt(current as number | null)} · ${source}${date ? ` · ${date}` : ""}` : "Ajuste temporário; não altera o registro original."}</p></div>)}
      </div>
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm"><p className="font-semibold">Método: Mifflin–St Jeor</p><p>Feminino: 10 × peso (kg) + 6,25 × altura (cm) − 5 × idade − 161.</p><p>Masculino: 10 × peso (kg) + 6,25 × altura (cm) − 5 × idade + 5.</p><p className="mt-2">Contexto para confirmar o fator: {activityContext || "não informado"}</p>{estimate ? <div className="mt-3 grid gap-2 sm:grid-cols-2"><p>TMB estimada: <strong>{fmt(estimate.bmrKcal)} kcal/dia</strong></p><p>GET estimado: <strong>{fmt(estimate.totalKcal)} kcal/dia</strong> ({factor} × TMB)</p></div> : <p role="alert" className="mt-2 flex items-center gap-2 text-amber-900"><AlertTriangle className="size-4" />Estimativa indisponível. Confira dados adultos plausíveis, fator confirmado e parâmetro fisiológico profissional.</p>}</div>
      {value.objective !== null && value.objective !== "maintenance" && <div className="grid gap-4 sm:grid-cols-2"><div><Label>{adjustmentLabel} individualizado</Label><div className="mt-1 flex gap-2"><Select value={value.adjustment_mode ?? "percent"} onValueChange={(v) => set("adjustment_mode", v as "percent" | "kcal")}><SelectTrigger className="w-36"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="percent">Percentual</SelectItem><SelectItem value="kcal">kcal/dia</SelectItem></SelectContent></Select><Input type="number" min="0" max={value.adjustment_mode === "kcal" ? 1000 : 50} value={value.adjustment_value ?? ""} onChange={(e) => set("adjustment_value", e.target.value === "" ? null : Number(e.target.value))} placeholder={value.adjustment_mode === "kcal" ? "kcal" : "%"} /></div><p className="mt-1 text-xs text-slate-500">Defina individualmente; nenhum déficit/superávit padrão é aplicado.</p></div></div>}
      <div className="grid gap-4 sm:grid-cols-2"><div><Label className="text-xs uppercase tracking-wide">Meta calórica diária</Label><div className={`mt-1 rounded-md border px-3 py-3 text-xl font-bold ${targetValid ? "border-emerald-300 bg-emerald-50 text-emerald-950" : "border-amber-300 bg-amber-50 text-amber-950"}`}>{target === null ? value.objective === "weight_loss" ? "Meta calórica pendente de definição" : value.objective === "weight_gain" ? "Meta calórica pendente de definição" : "Meta pendente" : `${fmt(target)} kcal/dia`}</div><p className="mt-1 text-xs text-slate-500">GET é a referência estimada para manutenção; não é meta de emagrecimento ou ganho sem ajuste profissional.</p><p className="mt-2 text-xs text-slate-600">Origem do peso: {value.weight_source ?? weightSource ?? "Não informada"} · Data: {value.weight_date ?? weightDate ?? "Não informada"} · Altura: {value.height_source ?? heightSource ?? "Não informada"} · Idade: {value.age_source ?? "Data de nascimento"}.</p><p className="mt-1 text-xs text-slate-600">Parâmetro da fórmula: {value.sex_parameter ?? "não confirmado"} · Objetivo identificado: {value.objective ?? "não identificado"}.</p></div><div className="space-y-3"><div><Label htmlFor="energy-observations">Justificativa clínica (mínimo 40 caracteres)</Label><Textarea id="energy-observations" className="mt-1" value={value.observations} onChange={(e) => set("observations", e.target.value)} placeholder="Registre objetivo, critério do déficit/superávit, motivo do fator de atividade e contexto clínico relevante." /><p className="text-xs text-slate-500">{value.observations.trim().length}/40 caracteres</p></div><div><Label htmlFor="energy-reviewer">Profissional responsável pela revisão</Label><Input id="energy-reviewer" className="mt-1" value={value.reviewer_name} onChange={(e) => set("reviewer_name", e.target.value)} placeholder="Nome do profissional" /></div></div></div>
      <div className="grid gap-3 sm:grid-cols-2"><label className="flex items-start gap-2 rounded-lg border p-3 text-sm"><input type="checkbox" className="mt-1" checked={value.activity_confirmed} onChange={(e) => set("activity_confirmed", e.target.checked)} /><span>Confirmei o fator de atividade após considerar exercício, duração/intensidade, ocupação e movimentação diária; frequência semanal isolada não determina o nível.</span></label><label className="flex items-start gap-2 rounded-lg border p-3 text-sm"><input type="checkbox" className="mt-1" checked={value.clinical_reviewed} onChange={(e) => set("clinical_reviewed", e.target.checked)} /><span>Revisei evolução corporal, medicamentos, anamnese, exames disponíveis e alertas clínicos antes de validar a meta.</span></label></div>
      {!activityEvidenceSufficient && <p role="alert" className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">Os registros não detalham tipo e duração/intensidade do exercício. A confirmação manual depende da sua avaliação profissional; registre esse contexto na justificativa clínica.</p>}
      {objectiveConflict && <p role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-900">Existem objetivos divergentes nos registros. Escolha e confirme com a paciente qual é o objetivo vigente; a sugestão automática foi suspensa.</p>}
      {objectiveSources.length > 0 && <p className="text-xs text-slate-500">Registros que indicam o objetivo: {objectiveSources.join(" · ")}</p>}
      {clinicalReviewFlags.length > 0 && <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"><strong>Revisão clínica necessária</strong><ul className="mt-1 list-inside list-disc">{clinicalReviewFlags.map((flag) => <li key={flag}>{flag}</li>)}</ul></div>}
      {justificationRequired && <div role="alert" className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"><p className="font-medium">A aprovação está bloqueada até concluir:</p><ul className="mt-1 list-inside list-disc">{approvalBlockers.map((reason) => <li key={reason}>{reason}</li>)}</ul></div>}
      <div className="flex flex-wrap gap-3"><Button type="button" disabled={justificationRequired} title={justificationRequired ? approvalBlockers.join(" ") : undefined} variant={value.professional_reviewed ? "outline" : "default"} onClick={confirm}>{value.professional_reviewed ? <><CheckCircle2 className="mr-2 size-4" />Meta revisada</> : "Revisar e aprovar meta"}</Button><Button type="button" variant="outline" onClick={() => onChange({ ...value, professional_reviewed: false, reviewed_at: null })}><RotateCcw className="mr-2 size-4" />Remover aprovação</Button><Button type="button" variant="outline" onClick={onSave} disabled={saving || !canSave || !targetValid || justificationRequired || !value.professional_reviewed}>{saving ? "Salvando..." : "Salvar no planejamento"}</Button></div>
      {!value.professional_reviewed && <p className="text-xs text-amber-800">A meta só será integrada à geração após revisão e aprovação profissional.</p>}
    </div>
  </section>;
}
