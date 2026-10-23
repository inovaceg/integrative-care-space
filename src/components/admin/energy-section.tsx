import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Flame, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { activityFactorForLevel, calculateMifflinStJeor, type SexParameter } from "@/lib/admin/nutrition-calculations";

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

export function EnergySection({ value, onChange, weightKg, weightDate, weightSource, heightCm, patientAge, activityLevel, activityContext, heightSource, onSave, saving, canSave }: {
  value: EnergyPlan; onChange: (next: EnergyPlan) => void; weightKg: number | null; weightDate: string | null; weightSource: string | null; heightCm: number | null; patientAge: number | null; activityLevel: string; activityContext: string; heightSource: string; onSave: () => void; saving: boolean; canSave: boolean;
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
  const target = estimate?.totalKcal ?? null;
  const targetValid = target !== null && target >= 500 && target <= 10000;
  const justificationRequired = target !== null && !value.observations.trim();
  useEffect(() => {
    if (value.adjusted_daily_kcal !== target || (target === null && value.professional_reviewed)) {
      onChange({ ...value, adjusted_daily_kcal: target, professional_reviewed: false, reviewed_at: null });
    }
  }, [target, value, onChange]);
  const set = <K extends keyof EnergyPlan>(key: K, field: EnergyPlan[K]) => onChange({ ...value, [key]: field, professional_reviewed: false, reviewed_at: null });
  const updateParam = (key: "weight_kg" | "height_cm" | "age_years", raw: string, setter: (s: string) => void) => {
    setter(raw);
    const parsed = raw.trim() ? parseNumber(raw) : null;
    const sourceKey = key === "weight_kg" ? "weight_source" : key === "height_cm" ? "height_source" : "age_source";
    const currentSource = value[sourceKey];
    const originalSource = typeof currentSource === "string" ? currentSource.match(/^Correção manual \(origem: (.*)\)$/)?.[1] ?? currentSource : currentSource;
    onChange({ ...value, [key]: parsed, [sourceKey]: raw.trim() ? `Correção manual (origem: ${originalSource ?? "não informada"})` : null, professional_reviewed: false, reviewed_at: null });
  };
  const confirm = () => onChange({ ...value, adjusted_daily_kcal: target, bmr_kcal: estimate?.bmrKcal ?? null, estimated_daily_kcal: estimate?.totalKcal ?? null, activity_factor: factor, activity_level: activityKey, professional_reviewed: !value.professional_reviewed, reviewed_at: value.professional_reviewed ? null : new Date().toISOString() });

  return <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
    <header className="flex items-center gap-2 border-b border-slate-100 px-5 py-4"><Flame className="size-5 text-[#2f8f82]" /><h2 className="font-display text-base font-semibold text-slate-800">Necessidade Calórica Diária</h2></header>
    <div className="space-y-5 p-5">
      <p className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-950">Meta estimada automaticamente pelo gasto energético diário. É uma estimativa de referência, não uma prescrição; objetivos de emagrecimento ou ganho de peso não aplicam déficit ou excedente automaticamente. A nutricionista deve revisar e aprovar.</p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div><Label>Objetivo</Label><Select value={value.objective ?? "none"} onValueChange={(v) => set("objective", v === "none" ? null : v as EnergyPlan["objective"])}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Selecione</SelectItem><SelectItem value="maintenance">Manutenção de peso</SelectItem><SelectItem value="weight_loss">Emagrecimento</SelectItem><SelectItem value="weight_gain">Ganho de peso</SelectItem></SelectContent></Select></div>
        <div><Label>Parâmetro da equação — confirmação profissional</Label><Select value={value.sex_parameter ?? "none"} onValueChange={(v) => set("sex_parameter", v === "none" ? null : v as SexParameter)}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Não confirmado</SelectItem><SelectItem value="female">Feminino</SelectItem><SelectItem value="male">Masculino</SelectItem></SelectContent></Select><p className="mt-1 text-xs text-slate-500">Não inferimos este parâmetro do cadastro.</p></div>
        <div><Label>Fator único de atividade</Label><Select value={activityOption} onValueChange={(v) => set("activity_level", v === "none" ? "Não informado" : v)}><SelectTrigger className="mt-1"><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent><SelectItem value="none">Não informado</SelectItem>{Object.keys(activityFactors).map((label) => <SelectItem key={label} value={label}>{label} · {activityFactors[label]}</SelectItem>)}</SelectContent></Select><p className="mt-1 text-xs text-slate-500">Rotina de trabalho e exercícios são contexto para escolher este fator, não parcelas adicionais.</p></div>
        {[["weight_kg", "Peso (kg)", weightInput, setWeightInput, weight, value.weight_source ?? weightSource ?? "Entrada manual", value.weight_date ?? weightDate], ["height_cm", "Altura (cm)", heightInput, setHeightInput, height, value.height_source ?? heightSource, null], ["age_years", "Idade (anos)", ageInput, setAgeInput, age, "Data de nascimento", null]].map(([key, label, input, setter, current, source, date]) => <div key={key as string}><Label>{label as string}</Label><Input className="mt-1" inputMode="decimal" value={input as string} onChange={(e) => updateParam(key as "weight_kg" | "height_cm" | "age_years", e.target.value, setter as (s: string) => void)} /><p className="mt-1 text-xs text-slate-500">{input === "" ? `Atual: ${fmt(current as number | null)} · ${source}${date ? ` · ${date}` : ""}` : "Ajuste temporário; não altera o registro original."}</p></div>)}
      </div>
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm"><p className="font-semibold">Método: Mifflin–St Jeor</p><p>Fórmula feminina: 10 × peso (kg) + 6,25 × altura (cm) − 5 × idade − 161.</p><p>Fórmula masculina: 10 × peso (kg) + 6,25 × altura (cm) − 5 × idade + 5.</p><p className="mt-2">Contexto de atividade (sem fator adicional): {activityContext || "não informado"}</p>{estimate ? <div className="mt-3 grid gap-2 sm:grid-cols-2"><p>Metabolismo basal estimado: <strong>{fmt(estimate.bmrKcal)} kcal/dia</strong></p><p>Gasto total estimado: <strong>{fmt(estimate.totalKcal)} kcal/dia</strong> ({factor} × basal)</p></div> : <p role="alert" className="mt-2 flex items-center gap-2 text-amber-900"><AlertTriangle className="size-4" />Estimativa indisponível. Confira peso (20–350 kg), altura (100–250 cm), idade adulta, atividade e confirmação do parâmetro sexual pela nutricionista.</p>}<p className="mt-2 text-xs text-slate-500">Metabolismo basal gravado nas avaliações não é utilizado. Data do cálculo: {new Date().toLocaleDateString("pt-BR")}.</p></div>
      <div className="grid gap-4 sm:grid-cols-2"><div><Label>Meta calórica estimada automaticamente</Label><div className="mt-1 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-lg font-semibold">{target === null ? "Não disponível" : `${fmt(target)} kcal/dia`}</div><p className="mt-1 text-xs text-slate-500">Calculada pelo gasto energético diário. Será incluída no plano somente após revisão profissional.</p></div><div><Label htmlFor="energy-observations">Justificativa profissional</Label><Textarea id="energy-observations" className="mt-1" value={value.observations} onChange={(e) => set("observations", e.target.value)} /></div></div>
      {!targetValid && <p className="text-sm text-red-700" role="alert">Meta indisponível ou fora do intervalo permitido.</p>}{justificationRequired && <p className="text-sm text-amber-800" role="alert">A meta estimada exige justificativa profissional para aprovação.</p>}
      <div className="flex flex-wrap gap-3"><Button type="button" disabled={!estimate || !targetValid || justificationRequired} variant={value.professional_reviewed ? "outline" : "default"} onClick={confirm}>{value.professional_reviewed ? <><CheckCircle2 className="mr-2 size-4" />Revisão confirmada</> : "Revisar e aprovar meta estimada"}</Button><Button type="button" variant="outline" onClick={() => onChange({ ...value, professional_reviewed: false, reviewed_at: null })}><RotateCcw className="mr-2 size-4" />Remover aprovação</Button><Button type="button" variant="outline" onClick={onSave} disabled={saving || !canSave || !targetValid || justificationRequired}>{saving ? "Salvando..." : "Salvar no planejamento"}</Button></div>
      {!value.professional_reviewed && <p className="text-xs text-amber-800">A estimativa automática só será integrada ao plano e PDF após justificativa e aprovação da nutricionista.</p>}
    </div>
  </section>;
}
