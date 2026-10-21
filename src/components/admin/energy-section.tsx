import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Flame, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type EnergyPlan = {
  method: "Mifflin-St Jeor";
  bmr_kcal: number | null;
  activity_factor: number | null;
  estimated_daily_kcal: number | null;
  adjusted_daily_kcal: number | null;
  observations: string;
  professional_reviewed: boolean;
};

const activityFactors: Record<string, number> = {
  "Sedentário": 1.2,
  "Leve": 1.375,
  "Moderado": 1.55,
  "Intenso": 1.725,
  "Muito intenso": 1.9,
};

function parseKcal(raw: string): number | null {
  const normalized = raw.trim().replace(/\s/g, "").replace(",", ".");
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function calculateEnergyEstimate(weightKg: number | null, heightCm: number | null, patientAge: number | null, gender: string | null, activityLevel: string) {
  const sexTerm = gender?.trim().toLocaleLowerCase("pt-BR") ?? "";
  const sexConstant = ["feminino", "mulher", "female"].includes(sexTerm) ? -161 : ["masculino", "homem", "male"].includes(sexTerm) ? 5 : null;
  const activityFactor = activityFactors[activityLevel] ?? null;
  if (weightKg === null || weightKg <= 0 || heightCm === null || heightCm <= 0 || patientAge === null || patientAge < 18 || sexConstant === null || activityFactor === null) return null;
  const bmr = 10 * weightKg + 6.25 * heightCm - 5 * patientAge + sexConstant;
  return { bmr_kcal: Math.round(bmr), activity_factor: activityFactor, estimated_daily_kcal: Math.round(bmr * activityFactor) };
}

export function EnergySection({ value, onChange, weightKg, heightCm, patientAge, gender, activityLevel, onSave, saving, canSave }: {
  value: EnergyPlan;
  onChange: (next: EnergyPlan) => void;
  weightKg: number | null;
  heightCm: number | null;
  patientAge: number | null;
  gender: string | null;
  activityLevel: string;
  onSave: () => void;
  saving: boolean;
  canSave: boolean;
}) {
  const [manualInput, setManualInput] = useState(value.adjusted_daily_kcal === null ? "" : String(value.adjusted_daily_kcal));
  useEffect(() => {
    if (value.adjusted_daily_kcal === null) setManualInput("");
    else if (Number.isFinite(value.adjusted_daily_kcal)) setManualInput(String(value.adjusted_daily_kcal));
  }, [value.adjusted_daily_kcal]);

  const calculation = calculateEnergyEstimate(weightKg, heightCm, patientAge, gender, activityLevel);
  const activityFactor = calculation?.activity_factor ?? null;
  const bmr = calculation?.bmr_kcal ?? null;
  const estimate = calculation?.estimated_daily_kcal ?? null;
  const manualEntered = manualInput.trim().length > 0;
  const manualValue = parseKcal(manualInput);
  const manualValid = !manualEntered || (manualValue !== null && manualValue >= 500 && manualValue <= 10000);
  const manualNeedsJustification = manualEntered && manualValid && !value.observations.trim();
  const set = <K extends keyof EnergyPlan>(key: K, fieldValue: EnergyPlan[K]) => onChange({ ...value, [key]: fieldValue, professional_reviewed: false });

  return <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
    <header className="flex items-center gap-2 border-b border-slate-100 px-5 py-4"><Flame className="size-5 text-[#2f8f82]" /><h2 className="font-display text-base font-semibold text-slate-800">Avaliação Energética</h2></header>
    <div className="space-y-4 p-5">
      <p className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-950">Estimativa pelo método Mifflin–St Jeor × fator de atividade. Não aplica déficit calórico nem constitui prescrição. A avaliação e a meta final são responsabilidade da nutricionista.</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm"><div><p className="text-slate-500">Peso mais recente</p><p className="font-medium">{weightKg === null ? "Não informado" : `${weightKg} kg`}</p></div><div><p className="text-slate-500">Altura utilizada</p><p className="font-medium">{heightCm === null ? "Não informada" : `${heightCm} cm`}</p></div><div><p className="text-slate-500">Idade</p><p className="font-medium">{patientAge === null ? "Não informada" : `${patientAge} anos`}</p></div><div><p className="text-slate-500">Atividade registrada</p><p className="font-medium">{activityLevel || "Não informada"}</p></div></div>
      {estimate !== null ? <div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><h3 className="font-semibold text-slate-900">Estimativa de manutenção</h3><p className="mt-2 text-2xl font-semibold text-[#21655f]">{estimate.toLocaleString("pt-BR")} kcal/dia</p><p className="mt-2 text-sm text-slate-600">Metabolismo basal estimado: {bmr!.toLocaleString("pt-BR")} kcal/dia × fator de atividade {activityFactor}.</p><p className="mt-1 text-xs text-slate-500">Método: Mifflin–St Jeor. O metabolismo basal registrado na avaliação não é usado no cálculo.</p></div> : <div className="flex gap-2 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900" role="alert"><AlertTriangle className="size-5 shrink-0" /><p>Não é possível estimar sem peso, altura, idade adulta, gênero compatível com a equação e nível de atividade reconhecido. Complete os dados no perfil do paciente e confira a avaliação profissional.</p></div>}
      <div><Label htmlFor="energy-target">Ajuste profissional da meta diária (kcal)</Label><Input id="energy-target" className="mt-1" type="text" inputMode="decimal" value={manualInput} onChange={(event) => { const raw = event.target.value; setManualInput(raw); const parsed = parseKcal(raw); set("adjusted_daily_kcal", raw.trim() ? parsed ?? Number.NaN : null); }} placeholder="Opcional; vazio usa a estimativa" /><p className="mt-1 text-xs text-slate-500">Meta manual entre 500 e 10.000 kcal/dia; ajuste exige justificativa.</p></div>
      {manualEntered && !manualValid && <p className="text-sm text-red-700" role="alert">Informe uma meta válida entre 500 e 10.000 kcal/dia.</p>}
      {manualNeedsJustification && <p className="text-sm text-amber-800" role="alert">Registre a justificativa profissional para a meta manual.</p>}
      {manualValue !== null && manualValid && <Button type="button" variant="outline" size="sm" onClick={() => { setManualInput(""); set("adjusted_daily_kcal", null); }}><RotateCcw className="mr-2 size-4" />Usar estimativa automática</Button>}
      <div><Label htmlFor="energy-observations">Justificativa/observações profissionais{manualEntered ? " (obrigatória para ajuste manual)" : ""}</Label><Textarea id="energy-observations" className="mt-1" value={value.observations} onChange={(event) => set("observations", event.target.value)} placeholder="Registre o raciocínio e os parâmetros revisados" /></div>
      <div className="flex flex-wrap items-center gap-3"><Button type="button" disabled={estimate === null || !manualValid || manualNeedsJustification} variant={value.professional_reviewed ? "outline" : "default"} onClick={() => onChange({ ...value, professional_reviewed: !value.professional_reviewed })}>{value.professional_reviewed ? <><CheckCircle2 className="mr-2 size-4" />Revisão confirmada</> : "Confirmar revisão profissional"}</Button><Button type="button" variant="outline" onClick={onSave} disabled={saving || !canSave || !manualValid || manualNeedsJustification}>{saving ? "Salvando..." : "Salvar no planejamento"}</Button></div>
      {!value.professional_reviewed && <p className="text-xs text-amber-800">A estimativa energética só será adicionada ao PDF após revisão profissional e aprovação do planejamento.</p>}
    </div>
  </section>;
}
