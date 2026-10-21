import { AlertTriangle, CheckCircle2, Dna } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type ProteinPlan = {
  weight_kg: number | null;
  weight_date: string | null;
  weight_source: string | null;
  factor_g_per_kg: number;
  calculated_target_g: number | null;
  adjusted_target_g: number | null;
  kidney_disease: boolean;
  special_clinical_condition: boolean;
  clinical_info_sufficient: boolean;
  observations: string;
  professional_reviewed: boolean;
};

type ProteinItem = { protein_g?: unknown; protein_source?: unknown };
type ProteinMeal = { name?: string; items?: ProteinItem[] };

function trustedMealProtein(meal: ProteinMeal): number | null {
  if (!Array.isArray(meal.items) || !meal.items.length) return null;
  if (meal.items.some((item) => typeof item.protein_g !== "number" || !Number.isFinite(item.protein_g) || item.protein_g < 0 || typeof item.protein_source !== "string" || !item.protein_source.trim())) return null;
  return meal.items.reduce((total, item) => total + (item.protein_g as number), 0);
}

export function ProteinSection({ value, onChange, patientAge, rawPlan, onSave, saving, canSave }: {
  value: ProteinPlan;
  onChange: (next: ProteinPlan) => void;
  patientAge: number | null;
  rawPlan: string;
  onSave: () => void;
  saving: boolean;
  canSave: boolean;
}) {
  const weightAvailable = value.weight_kg !== null && Number.isFinite(value.weight_kg) && value.weight_kg > 0;
  const adult = patientAge !== null && patientAge >= 18;
  const factorValid = Number.isFinite(value.factor_g_per_kg) && value.factor_g_per_kg > 0;
  const calculationBlocked = !weightAvailable || !adult || !value.clinical_info_sufficient || value.kidney_disease || value.special_clinical_condition;
  const estimate = !calculationBlocked && factorValid ? Math.round(value.weight_kg! * value.factor_g_per_kg * 10) / 10 : null;
  const target = value.adjusted_target_g ?? estimate;
  const set = <K extends keyof ProteinPlan>(key: K, fieldValue: ProteinPlan[K]) => onChange({ ...value, [key]: fieldValue, professional_reviewed: false });

  let planMeals: ProteinMeal[] = [];
  try {
    const parsed = JSON.parse(rawPlan) as { meals?: ProteinMeal[] };
    if (Array.isArray(parsed.meals)) planMeals = parsed.meals;
  } catch { /* The plan editor shows its own invalid JSON feedback. */ }
  const mealProtein = planMeals.map((meal) => ({ name: meal.name || "Refeição", grams: trustedMealProtein(meal) }));
  const dailyTotal = mealProtein.length && mealProtein.every((meal) => meal.grams !== null)
    ? mealProtein.reduce((sum, meal) => sum + (meal.grams ?? 0), 0)
    : null;
  const reviewedTarget = value.professional_reviewed ? target : null;

  return <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
    <header className="flex items-center gap-2 border-b border-slate-100 px-5 py-4"><Dna className="size-5 text-[#2f8f82]" /><h2 className="font-display text-base font-semibold text-slate-800">Necessidade Diária de Proteínas</h2></header>
    <div className="space-y-5 p-5">
      <p className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-950">O fator inicial de 1,2 g/kg/dia é uma referência indicada para revisão da nutricionista, não uma prescrição automática. A meta deve ser individualizada.</p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div><Label>Peso usado no cálculo (kg)</Label>{value.weight_source && value.weight_source !== "Entrada manual" ? <Input className="mt-1" value={value.weight_kg ?? ""} readOnly aria-readonly="true" /> : <Input className="mt-1" type="number" min="1" step="0.1" value={value.weight_kg ?? ""} onChange={(event) => { const weight = event.target.value ? Number(event.target.value) : null; onChange({ ...value, weight_kg: weight, weight_date: weight === null ? null : value.weight_date ?? new Date().toISOString().slice(0, 10), weight_source: weight === null ? null : "Entrada manual", professional_reviewed: false }); }} placeholder="Informe o peso" />}</div>
        <div><Label>Data da medição</Label><Input className="mt-1" type="date" value={value.weight_date ?? ""} readOnly={Boolean(value.weight_source && value.weight_source !== "Entrada manual")} onChange={(event) => set("weight_date", event.target.value || null)} /></div>
        <div><Label>Origem do peso</Label><Input className="mt-1" value={value.weight_source ?? "Sem registro — entrada manual"} readOnly /></div>
        <div><Label>Fator proteico (g/kg/dia)</Label><Input className="mt-1" type="number" min="0.1" step="0.1" value={value.factor_g_per_kg} onChange={(event) => set("factor_g_per_kg", event.target.value ? Number(event.target.value) : 0)} /></div>
        <div><Label>Ajuste manual da meta (g/dia)</Label><Input className="mt-1" type="number" min="0" step="0.1" value={value.adjusted_target_g ?? ""} onChange={(event) => set("adjusted_target_g", event.target.value ? Number(event.target.value) : null)} placeholder="Opcional; definido pela nutricionista" /></div>
      </div>
      <fieldset><legend className="mb-2 text-sm font-medium text-slate-800">Condições e suficiência de informações</legend><div className="grid gap-2 sm:grid-cols-2"><label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={value.kidney_disease} onChange={(event) => set("kidney_disease", event.target.checked)} />Doença renal</label><label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={value.special_clinical_condition} onChange={(event) => set("special_clinical_condition", event.target.checked)} />Condição clínica especial</label><label className="flex items-center gap-2 text-sm text-slate-700 sm:col-span-2"><input type="checkbox" checked={value.clinical_info_sufficient} onChange={(event) => set("clinical_info_sufficient", event.target.checked)} />Confirmo que as informações clínicas disponíveis são suficientes para esta referência inicial</label></div></fieldset>
      {calculationBlocked && <div className="flex gap-2 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900" role="alert"><AlertTriangle className="size-5 shrink-0" /><p>{value.kidney_disease || value.special_clinical_condition ? "Condição clínica especial: não definimos automaticamente uma meta individual. Avaliação profissional específica é necessária." : !adult ? patientAge === null ? "Idade não informada; não calculamos uma meta automática." : "A referência inicial destina-se a adultos; requer avaliação profissional para menores de 18 anos." : !weightAvailable ? "Peso não disponível; informe um peso de referência para calcular." : "Confirme que as informações clínicas são suficientes antes de calcular uma referência."}</p></div>}
      {estimate !== null && <div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><h3 className="font-semibold text-slate-900">Referência estimada</h3><p className="mt-2 text-2xl font-semibold text-[#21655f]">{estimate.toFixed(1).replace(".", ",")} g/dia</p><p className="mt-2 text-sm text-slate-600">Fórmula: {value.weight_kg} kg × {value.factor_g_per_kg} g/kg/dia = {estimate.toFixed(1).replace(".", ",")} g/dia.</p></div>}
      {target !== null && <p className="text-sm font-medium text-slate-700">Meta considerada: {target.toFixed(1).replace(".", ",")} g/dia{value.adjusted_target_g !== null ? " (ajuste manual)" : " (referência calculada)"}.</p>}
      <div><Label htmlFor="protein-observations">Justificativa/observações da nutricionista</Label><Textarea id="protein-observations" className="mt-1" value={value.observations} onChange={(event) => set("observations", event.target.value)} placeholder="Registre a justificativa de ajustes e pontos a considerar" /></div>
      <div className="rounded-xl border border-slate-200 p-4"><h3 className="font-semibold text-slate-900">Proteínas estimadas nas refeições</h3>{mealProtein.length ? <div className="mt-2 space-y-2 text-sm">{mealProtein.map((meal, index) => <p key={`${meal.name}-${index}`} className="flex justify-between gap-4"><span>{meal.name}</span><span>{meal.grams === null ? "Sem dados nutricionais confiáveis" : `${meal.grams.toFixed(1).replace(".", ",")} g`}</span></p>)}</div> : <p className="mt-2 text-sm text-slate-500">Gere ou edite as refeições para ver estimativas quando os dados nutricionais estiverem disponíveis.</p>}{dailyTotal !== null ? <div className="mt-3 border-t pt-3 text-sm"><p className="font-semibold">Total diário: {dailyTotal.toFixed(1).replace(".", ",")} g</p>{reviewedTarget !== null && <p className="mt-1">Diferença para a meta profissional: {(dailyTotal - reviewedTarget >= 0 ? "+" : "")}{(dailyTotal - reviewedTarget).toFixed(1).replace(".", ",")} g</p>}</div> : mealProtein.length > 0 && <p className="mt-3 text-xs text-amber-800">O total e a comparação só aparecem quando todos os itens de todas as refeições têm proteína por porção e uma fonte nutricional confiável preenchidas no JSON.</p>}</div>
      <p className="text-xs text-slate-500">Para informar um valor nutricional por item no JSON da proposta, use <code>protein_g</code> (gramas por porção descrita) e <code>protein_source</code> (por exemplo, rótulo ou tabela de composição confiável). Valores gerados pela IA não são considerados fonte confiável.</p>
      <div className="flex flex-wrap items-center gap-3"><Button type="button" variant={value.professional_reviewed ? "outline" : "default"} onClick={() => onChange({ ...value, professional_reviewed: !value.professional_reviewed })}>{value.professional_reviewed ? <><CheckCircle2 className="mr-2 size-4" />Revisão confirmada</> : "Revisar e aprovar meta"}</Button><Button type="button" variant="outline" onClick={onSave} disabled={saving || !canSave}>{saving ? "Salvando..." : "Salvar no planejamento"}</Button></div>
      {!value.professional_reviewed && <p className="text-xs text-amber-800">A meta só será incluída no PDF depois de revisada/aprovada. Salve uma nova versão do planejamento para preservar os valores no histórico.</p>}
    </div>
  </section>;
}
