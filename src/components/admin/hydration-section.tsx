import { AlertTriangle, CheckCircle2, Droplets } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type HydrationPlan = {
  weight_kg: number | null;
  weight_date: string | null;
  weight_source: string | null;
  factor_ml_per_kg: number;
  estimated_total_water_ml: number | null;
  adjusted_pure_water_ml: number | null;
  activity: string;
  climate: string;
  pregnancy: boolean;
  breastfeeding: boolean;
  kidney_disease: boolean;
  cardiac_disease: boolean;
  fluid_restriction: boolean;
  observations: string;
  professional_reviewed: boolean;
};

export function HydrationSection({ value, onChange, patientAge, onSave, saving, canSave }: {
  value: HydrationPlan;
  onChange: (next: HydrationPlan) => void;
  patientAge: number | null;
  onSave: () => void;
  saving: boolean;
  canSave: boolean;
}) {
  const requiresIndividualAssessment = value.pregnancy || value.breastfeeding || value.kidney_disease || value.cardiac_disease || value.fluid_restriction;
  const adult = patientAge !== null && patientAge >= 18;
  const factor = Number(value.factor_ml_per_kg);
  const estimate = adult && !requiresIndividualAssessment && value.weight_kg !== null && value.weight_kg > 0 && Number.isFinite(factor) && factor > 0
    ? Math.round(value.weight_kg * factor)
    : null;
  const set = <K extends keyof HydrationPlan>(key: K, fieldValue: HydrationPlan[K]) => onChange({ ...value, [key]: fieldValue, professional_reviewed: false });
  const flags: [keyof HydrationPlan, string][] = [["pregnancy", "Gestação"], ["breastfeeding", "Amamentação"], ["kidney_disease", "Doença renal"], ["cardiac_disease", "Doença cardíaca"], ["fluid_restriction", "Restrição hídrica prescrita"]];

  return <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
    <header className="flex items-center gap-2 border-b border-slate-100 px-5 py-4"><Droplets className="size-5 text-[#2f8f82]" /><h2 className="font-display text-base font-semibold text-slate-800">Hidratação Diária</h2></header>
    <div className="space-y-5 p-5">
      <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-950">A referência de 30–35 mL/kg/dia é apenas uma estimativa inicial de <strong>água total diária</strong> (água, outras bebidas e água dos alimentos). Não equivale à quantidade de água pura a beber e não é prescrição definitiva.</div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="sm:col-span-2 lg:col-span-1"><Label>Peso usado no cálculo (kg)</Label>{value.weight_source && value.weight_source !== "Entrada manual" ? <Input className="mt-1" value={value.weight_kg ?? ""} readOnly aria-readonly="true" /> : <Input className="mt-1" type="number" min="1" step="0.1" value={value.weight_kg ?? ""} onChange={(event) => { const weight = event.target.value ? Number(event.target.value) : null; onChange({ ...value, weight_kg: weight, weight_date: weight === null ? null : value.weight_date ?? new Date().toISOString().slice(0, 10), weight_source: weight === null ? null : "Entrada manual", professional_reviewed: false }); }} placeholder="Informe o peso" />}</div>
        <div><Label>Data do peso</Label><Input className="mt-1" type="date" value={value.weight_date ?? ""} readOnly={Boolean(value.weight_source && value.weight_source !== "Entrada manual")} onChange={(event) => set("weight_date", event.target.value || null)} /></div>
        <div><Label>Origem do peso</Label><Input className="mt-1" value={value.weight_source ?? "Sem registro — entrada manual"} readOnly /></div>
        {(!value.weight_source || value.weight_source === "Entrada manual") && <p className="text-xs text-slate-500 sm:col-span-2 lg:col-span-3">Peso informado manualmente apenas para este planejamento; os registros originais não serão alterados.</p>}
        <div><Label>Fator de referência (mL/kg/dia)</Label><Input className="mt-1" type="number" min="1" step="0.5" value={value.factor_ml_per_kg} onChange={(event) => set("factor_ml_per_kg", event.target.value ? Number(event.target.value) : 0)} /><p className="mt-1 text-xs text-slate-500">Referência inicial: 30–35; o profissional pode ajustar.</p></div>
        <div><Label>Atividade física</Label><Input className="mt-1" value={value.activity} onChange={(event) => set("activity", event.target.value)} placeholder="Ex.: tipo, duração e intensidade" /></div>
        <div><Label>Clima/temperatura</Label><Input className="mt-1" value={value.climate} onChange={(event) => set("climate", event.target.value)} placeholder="Ex.: quente, seco, exposição ao calor" /></div>
        <div><Label>Ajuste profissional — água pura (mL/dia)</Label><Input className="mt-1" type="number" min="0" step="50" value={value.adjusted_pure_water_ml ?? ""} onChange={(event) => set("adjusted_pure_water_ml", event.target.value ? Number(event.target.value) : null)} placeholder="Opcional; definido pelo profissional" /><p className="mt-1 text-xs text-slate-500">Campo separado da estimativa de água total.</p></div>
      </div>
      <fieldset><legend className="mb-2 text-sm font-medium text-slate-800">Condições que exigem avaliação individual</legend><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{flags.map(([key, label]) => <label key={key} className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={Boolean(value[key])} onChange={(event) => set(key, event.target.checked as HydrationPlan[typeof key])} />{label}</label>)}</div></fieldset>
      {requiresIndividualAssessment ? <div className="flex gap-2 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900" role="alert"><AlertTriangle className="size-5 shrink-0" /><p>Não calculamos automaticamente uma meta individual: há uma condição que exige avaliação específica e orientação profissional.</p></div> : !adult ? <div className="flex gap-2 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900" role="alert"><AlertTriangle className="size-5 shrink-0" /><p>Esta referência é destinada a adultos. {patientAge === null ? "Confirme a idade antes de definir uma meta." : "Para menores de 18 anos, não calculamos automaticamente uma meta individual."}</p></div> : null}
      {estimate !== null && <div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><h3 className="font-semibold text-slate-900">Estimativa de água total diária</h3><p className="mt-2 text-2xl font-semibold text-[#21655f]">{estimate.toLocaleString("pt-BR")} mL/dia · {(estimate / 1000).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} L/dia</p><p className="mt-2 text-sm text-slate-600">Fórmula: {value.weight_kg} kg × {factor} mL/kg/dia = {estimate.toLocaleString("pt-BR")} mL/dia.</p><p className="mt-1 text-xs text-slate-500">Estimativa de água total, incluindo alimentos e bebidas; não define automaticamente água pura a beber.</p></div>}
      <div><Label htmlFor="hydration-observations">Observações profissionais</Label><Textarea id="hydration-observations" className="mt-1" value={value.observations} onChange={(event) => set("observations", event.target.value)} placeholder="Contexto, ajustes e orientação para revisão" /></div>
      <div className="flex flex-wrap items-center gap-3"><Button type="button" variant={value.professional_reviewed ? "outline" : "default"} onClick={() => onChange({ ...value, professional_reviewed: !value.professional_reviewed })}>{value.professional_reviewed ? <><CheckCircle2 className="mr-2 size-4" />Revisão confirmada</> : "Confirmar revisão profissional"}</Button><Button type="button" variant="outline" onClick={onSave} disabled={saving || !canSave}>{saving ? "Salvando..." : "Salvar no planejamento"}</Button></div>
      {!value.professional_reviewed && <p className="text-xs text-amber-800">A orientação só será incluída no PDF depois de revisada e confirmada pelo profissional. Salve uma nova versão do planejamento para preservar esta seção no histórico.</p>}
    </div>
  </section>;
}
