import { useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { EnergyPlan } from "@/components/admin/energy-section";
import { calculateMacroDistribution, isMacroDistributionStale } from "@/lib/admin/macronutrient-distribution";
import { macroRecommendationKey, recommendMacronutrients, type MacroRecommendationInput } from "@/lib/admin/macronutrient-recommendations";

const show = (value: number | null | undefined) => value == null ? "—" : value.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
const parse = (raw: string) => { const value = Number(raw.trim().replace(",", ".")); return raw.trim() && Number.isFinite(value) ? value : null; };

export function MacroDistributionSection({ value, target, energyApproved, fallbackWeight, clinicalReviewFlags, recommendationInput, onChange }: { value: EnergyPlan; target: number | null; energyApproved: boolean; fallbackWeight: number | null; clinicalReviewFlags: string[]; recommendationInput: MacroRecommendationInput; onChange: (next: EnergyPlan) => void }) {
  const effectiveInput = { ...recommendationInput, energyKcal: energyApproved ? target : null, referenceWeightKg: value.macro_auto_generated ? recommendationInput.referenceWeightKg : value.macro_reference_weight_kg ?? recommendationInput.referenceWeightKg };
  const inputKey = macroRecommendationKey(effectiveInput);
  const recommendation = useMemo(() => recommendMacronutrients(effectiveInput), [inputKey]);
  const stale = isMacroDistributionStale(value.macro_calculated_for_kcal, target) || Boolean(value.macro_reviewed && value.macro_context_key !== inputKey);
  const percentValues = [value.carbohydrate_percent, value.protein_percent, value.fat_percent];
  const calc = useMemo(() => {
    if (stale || target === null || percentValues.some((percent) => percent === null || !Number.isFinite(percent) || percent! < 0 || percent! > 100) || Math.abs(percentValues.reduce<number>((sum, percent) => sum + (percent ?? 0), 0) - 100) > 0.01) return null;
    return calculateMacroDistribution({ energyKcal: target, referenceWeightKg: value.macro_reference_weight_kg ?? recommendation.referenceWeightKg, proteinFactorGPerKg: value.macro_protein_factor_g_per_kg, fatPercent: value.macro_fat_percent }).distribution;
  }, [inputKey, stale, target, value.macro_reference_weight_kg, value.macro_protein_factor_g_per_kg, value.macro_fat_percent, value.carbohydrate_percent, value.protein_percent, value.fat_percent, recommendation.referenceWeightKg]);

  const applyRecommendation = () => {
    if (!recommendation.distribution) return;
    const distribution = recommendation.distribution;
    onChange({
      ...value,
      macro_reference_weight_kg: recommendation.referenceWeightKg,
      macro_protein_factor_g_per_kg: recommendation.proteinFactorGPerKg,
      macro_fat_percent: recommendation.fatPercent,
      carbohydrate_percent: distribution.carbohydratePercent,
      protein_percent: distribution.proteinPercent,
      fat_percent: distribution.fatPercent,
      macro_calculated_for_kcal: target,
      macro_reviewed: false,
      macro_auto_generated: true,
      macro_context_key: inputKey,
      macro_protocol: recommendation.protocol,
      macro_rationale: recommendation.rationale,
      macro_references: recommendation.references,
      macro_observations: [...recommendation.rationale, ...recommendation.references].join(" "),
    });
  };

  useEffect(() => {
    if (!energyApproved || !recommendation.distribution) return;
    if ((value.macro_reviewed || value.macro_renal_reviewed) && value.macro_context_key !== inputKey) {
      onChange({ ...value, macro_reviewed: false, macro_renal_reviewed: false });
      return;
    }
    const noExistingParameters = value.macro_protein_factor_g_per_kg === null && value.macro_fat_percent === null && value.carbohydrate_percent === null && value.protein_percent === null && value.fat_percent === null;
    if ((value.macro_auto_generated && value.macro_context_key !== inputKey) || (!value.macro_reviewed && noExistingParameters)) applyRecommendation();
  }, [energyApproved, inputKey, recommendation, value, onChange]);

  const update = <K extends keyof EnergyPlan>(key: K, field: EnergyPlan[K]) => onChange({ ...value, [key]: field, macro_reviewed: false, macro_auto_generated: false });
  const manualSuggestion = () => {
    if (value.macro_reviewed && !window.confirm("Substituir a distribuição de macronutrientes já confirmada por uma nova sugestão?")) return;
    applyRecommendation();
  };
  const confirm = () => {
    if (!calc || target === null || !energyApproved || !value.macro_observations.trim() || (recommendation.requiresClinicalDefinition && !value.macro_renal_reviewed)) return;
    onChange({ ...value, macro_calculated_for_kcal: target, macro_reviewed: true, macro_auto_generated: false, macro_context_key: inputKey });
  };
  const blockers = [
    !energyApproved && "Aprove primeiro a meta energética.",
    (value.macro_reference_weight_kg ?? recommendation.referenceWeightKg ?? fallbackWeight) === null && "Informe um peso de referência.",
    value.macro_protein_factor_g_per_kg === null && "Fator proteico não pode ser sugerido com os dados clínicos disponíveis.",
    value.macro_fat_percent === null && "Percentual de gorduras não pode ser sugerido com os dados disponíveis.",
    value.macro_observations.trim().length < 20 && "Registre a justificativa dos parâmetros (mínimo 20 caracteres).",
    recommendation.requiresClinicalDefinition && !value.macro_renal_reviewed && "Confirme a revisão da função renal antes de validar qualquer sugestão proteica.",
    stale && "Os dados clínicos ou a meta mudaram; revise e recalcule antes de confirmar.",
  ].filter(Boolean) as string[];
  const suggestionIssues = recommendation.issues;
  const confirmed = value.macro_reviewed && !stale;

  return <section className="rounded-xl border border-slate-200 p-4">
    <h3 className="font-semibold text-slate-900">Distribuição de macronutrientes individualizada</h3>
    <p className="mt-1 text-xs text-slate-600">Sugestões determinísticas baseadas nos dados clínicos disponíveis e em referências documentadas. São sugestões pendentes de validação; não substituem decisão clínica. Proteínas = peso de referência × fator; gorduras = meta × percentual ÷ 9; carboidratos = energia restante ÷ 4.</p>
    {value.macro_auto_generated && !confirmed && <p role="status" className="mt-3 rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">Sugestão automática — pendente de validação profissional · {value.macro_protocol || recommendation.protocol}</p>}
    <div className="mt-3 grid gap-3 sm:grid-cols-3">
      <div><Label htmlFor="macro-reference-weight">Peso de referência (kg)</Label><Input id="macro-reference-weight" className="mt-1" type="number" min="20" max="350" step="0.1" value={value.macro_reference_weight_kg ?? recommendation.referenceWeightKg ?? fallbackWeight ?? ""} onChange={(event) => update("macro_reference_weight_kg", parse(event.target.value))} /><p className="mt-1 text-xs text-slate-500">{recommendation.referenceWeightKg !== null && recommendation.referenceWeightKg !== fallbackWeight ? "Referência ajustada automaticamente pela composição disponível; confirme ou altere." : "Peso atual/recente ou referência escolhida; pode ser ajustado profissionalmente."}</p></div>
      <div><Label htmlFor="macro-protein-factor">Fator proteico sugerido (g/kg/dia)</Label><Input id="macro-protein-factor" className="mt-1" type="number" min="0.1" max="10" step="0.1" value={value.macro_protein_factor_g_per_kg ?? ""} onChange={(event) => update("macro_protein_factor_g_per_kg", parse(event.target.value))} placeholder="Aguardando dados/revisão" /></div>
      <div><Label htmlFor="macro-fat-percent">Gorduras sugeridas (% kcal)</Label><Input id="macro-fat-percent" className="mt-1" type="number" min="0.1" max="99.9" step="0.1" value={value.macro_fat_percent ?? ""} onChange={(event) => update("macro_fat_percent", parse(event.target.value))} placeholder="Aguardando dados/revisão" /></div>
    </div>
    <div className="mt-3"><Label htmlFor="macro-observations">Justificativa e revisão profissional</Label><Textarea id="macro-observations" className="mt-1" value={value.macro_observations} onChange={(event) => update("macro_observations", event.target.value)} placeholder="Revise e complemente a justificativa da sugestão automática." /><p className="text-xs text-slate-500">{value.macro_observations.trim().length}/20 caracteres</p></div>
    {recommendation.requiresClinicalDefinition && recommendation.distribution && <label className="mt-3 flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950"><input type="checkbox" className="mt-1" checked={Boolean(value.macro_renal_reviewed)} onChange={(event) => onChange({ ...value, macro_renal_reviewed: event.target.checked, macro_reviewed: false })} /><span>Revisei a função renal e confirmei que a sugestão proteica é apropriada; função renal ausente nos registros não foi presumida normal.</span></label>}
    {clinicalReviewFlags.length > 0 && <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"><strong>Contexto clínico para revisão:</strong><ul className="mt-1 list-inside list-disc">{clinicalReviewFlags.map((flag) => <li key={flag}>{flag}</li>)}</ul></div>}
    <Button type="button" className="mt-3" variant="outline" onClick={manualSuggestion} disabled={!recommendation.distribution}>Calcular/atualizar sugestão automática</Button>
    {suggestionIssues.length > 0 && <ul className="mt-2 list-inside list-disc text-sm text-amber-800">{suggestionIssues.map((issue) => <li key={issue}>{issue}</li>)}</ul>}
    {recommendation.rationale.length > 0 && <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm"><strong>Protocolo e justificativa</strong><p className="mt-1 font-medium">{recommendation.protocol}</p><ul className="mt-1 list-inside list-disc text-slate-700">{recommendation.rationale.map((item) => <li key={item}>{item}</li>)}</ul><strong className="mt-2 block">Referências</strong><ul className="mt-1 list-inside list-disc text-xs text-slate-600">{recommendation.references.map((item) => <li key={item}>{item}</li>)}</ul></div>}
    {recommendation.distribution && <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[480px] text-left text-sm"><thead><tr className="border-b text-slate-500"><th className="py-2">Macronutriente</th><th className="py-2">Percentual</th><th className="py-2">Meta diária</th></tr></thead><tbody>{[["Carboidratos", recommendation.distribution.carbohydratePercent, recommendation.distribution.carbohydrateG], ["Proteínas", recommendation.distribution.proteinPercent, recommendation.distribution.proteinG], ["Gorduras", recommendation.distribution.fatPercent, recommendation.distribution.fatG]].map(([name, percent, grams]) => <tr key={String(name)} className="border-b last:border-0"><td className="py-2">{name}</td><td className="py-2">{show(percent as number)}%</td><td className="py-2">{show(grams as number)} g/dia</td></tr>)}</tbody></table></div>}
    {recommendation.requiresClinicalDefinition && <p role="alert" className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">{recommendation.distribution ? "Valores calculados apenas como sugestão preliminar. A função renal não está documentada como preservada; valide os dados clínicos antes de confirmar." : "Sugestão indisponível: existe condição clínica especial ou faltam dados essenciais. O profissional deve definir os parâmetros."}</p>}
    {(!recommendation.requiresClinicalDefinition || value.macro_renal_reviewed) && !value.macro_reviewed && <Button type="button" className="mt-3" disabled={!calc || blockers.length > 0 || !energyApproved} onClick={confirm}>Confirmar distribuição profissional</Button>}
    {confirmed && <p role="status" className="mt-3 text-sm text-emerald-800">Distribuição profissional revisada e confirmada para {show(target)} kcal/dia.</p>}
    {blockers.length > 0 && <ul className="mt-2 list-inside list-disc text-xs text-amber-800">{blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}</ul>}
  </section>;
}
