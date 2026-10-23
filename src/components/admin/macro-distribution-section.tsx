import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { EnergyPlan } from "@/components/admin/energy-section";
import { calculateMacroDistribution } from "@/lib/admin/macronutrient-distribution";

const show = (value: number | null) => value === null ? "—" : value.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
const parse = (raw: string) => { const value = Number(raw.trim().replace(",", ".")); return raw.trim() && Number.isFinite(value) ? value : null; };

export function MacroDistributionSection({ value, target, energyApproved, fallbackWeight, clinicalReviewFlags, onChange }: { value: EnergyPlan; target: number | null; energyApproved: boolean; fallbackWeight: number | null; clinicalReviewFlags: string[]; onChange: (next: EnergyPlan) => void }) {
  const stale = value.macro_calculated_for_kcal !== null && (target === null || Math.abs(value.macro_calculated_for_kcal - target) > 0.02);
  const calc = useMemo(() => {
    const percents = [value.carbohydrate_percent, value.protein_percent, value.fat_percent];
    if (target === null || percents.some((percent) => percent === null || !Number.isFinite(percent) || percent! < 0 || percent! > 100) || Math.abs(percents.reduce<number>((sum, percent) => sum + (percent ?? 0), 0) - 100) > 0.01) return null;
    const proteinG = target * value.protein_percent! / 100 / 4;
    const fatG = target * value.fat_percent! / 100 / 9;
    const carbohydrateG = target * value.carbohydrate_percent! / 100 / 4;
    return carbohydrateG > 0 ? { carbohydrateG, proteinG, fatG } : null;
  }, [target, value.carbohydrate_percent, value.protein_percent, value.fat_percent]);
  const suggestion = () => calculateMacroDistribution({ energyKcal: energyApproved ? target : null, referenceWeightKg: value.macro_reference_weight_kg ?? fallbackWeight, proteinFactorGPerKg: value.macro_protein_factor_g_per_kg, fatPercent: value.macro_fat_percent });
  const update = <K extends keyof EnergyPlan>(key: K, field: EnergyPlan[K]) => onChange({ ...value, [key]: field, macro_reviewed: false });
  const suggest = () => {
    if (value.macro_reviewed && !window.confirm("Substituir a distribuição de macronutrientes já confirmada por uma nova sugestão?")) return;
    const result = suggestion();
    if (!result.distribution) return;
    const distribution = result.distribution;
    onChange({ ...value, macro_reference_weight_kg: value.macro_reference_weight_kg ?? fallbackWeight, carbohydrate_percent: distribution.carbohydratePercent, protein_percent: distribution.proteinPercent, fat_percent: distribution.fatPercent, macro_calculated_for_kcal: target, macro_reviewed: false });
  };
  const confirm = () => {
    if (!calc || target === null || !energyApproved || !value.macro_observations.trim()) return;
    onChange({ ...value, macro_calculated_for_kcal: target, macro_reviewed: true });
  };
  const blockers = [
    !energyApproved && "Aprove primeiro a meta energética.",
    (value.macro_reference_weight_kg ?? fallbackWeight) === null && "Informe um peso de referência.",
    value.macro_protein_factor_g_per_kg === null && "Informe o fator proteico individual (g/kg/dia).",
    value.macro_fat_percent === null && "Informe o percentual de gorduras sugerido e confirmado pelo profissional.",
    value.macro_observations.trim().length < 20 && "Registre a justificativa dos parâmetros (mínimo 20 caracteres).",
    stale && "Recalcule a distribuição para a meta energética atual antes de confirmar.",
  ].filter(Boolean) as string[];
  const suggestionIssues = suggestion().issues;
  return <section className="rounded-xl border border-slate-200 p-4">
    <h3 className="font-semibold text-slate-900">Distribuição de macronutrientes individualizada</h3>
    <p className="mt-1 text-xs text-slate-600">Configure o peso de referência, o fator proteico e uma sugestão de percentual de gorduras. Nenhum percentual universal é aplicado. Proteína: peso × fator; gorduras: kcal × percentual ÷ 9; carboidratos: energia restante ÷ 4.</p>
    <div className="mt-3 grid gap-3 sm:grid-cols-3">
      <div><Label htmlFor="macro-reference-weight">Peso de referência (kg)</Label><Input id="macro-reference-weight" className="mt-1" type="number" min="20" max="350" step="0.1" value={value.macro_reference_weight_kg ?? fallbackWeight ?? ""} onChange={(event) => update("macro_reference_weight_kg", parse(event.target.value))} /><p className="mt-1 text-xs text-slate-500">Atual/recente sugerido como ponto de partida; ajuste se não for adequado, por exemplo em obesidade.</p></div>
      <div><Label htmlFor="macro-protein-factor">Fator proteico (g/kg/dia)</Label><Input id="macro-protein-factor" className="mt-1" type="number" min="0.1" max="10" step="0.1" value={value.macro_protein_factor_g_per_kg ?? ""} onChange={(event) => update("macro_protein_factor_g_per_kg", parse(event.target.value))} placeholder="Definir individualmente" /></div>
      <div><Label htmlFor="macro-fat-percent">Gorduras sugeridas (% kcal)</Label><Input id="macro-fat-percent" className="mt-1" type="number" min="0.1" max="99.9" step="0.1" value={value.macro_fat_percent ?? ""} onChange={(event) => update("macro_fat_percent", parse(event.target.value))} placeholder="Definir individualmente" /></div>
    </div>
    <div className="mt-3"><Label htmlFor="macro-observations">Justificativa dos parâmetros (mínimo 20 caracteres)</Label><Textarea id="macro-observations" className="mt-1" value={value.macro_observations} onChange={(event) => update("macro_observations", event.target.value)} placeholder="Justifique peso de referência, fator proteico e sugestão de gorduras considerando objetivo e contexto clínico." /><p className="text-xs text-slate-500">{value.macro_observations.trim().length}/20 caracteres</p></div>
    {clinicalReviewFlags.length > 0 && <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"><strong>Contexto já registrado que requer revisão profissional:</strong><ul className="mt-1 list-inside list-disc">{clinicalReviewFlags.map((flag) => <li key={flag}>{flag}</li>)}</ul></div>}
    <Button type="button" className="mt-3" variant="outline" onClick={suggest}>CALCULAR DISTRIBUIÇÃO SUGERIDA</Button>
    {suggestionIssues.length > 0 && <ul className="mt-2 list-inside list-disc text-sm text-amber-800">{suggestionIssues.map((issue) => <li key={issue}>{issue}</li>)}</ul>}
    {stale && <p role="alert" className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">A meta energética mudou desde o cálculo desta distribuição. Os valores anteriores foram preservados; gere uma nova sugestão e confirme novamente.</p>}
    <div className="mt-4 grid gap-3 sm:grid-cols-3">{([["carbohydrate_percent", "Carboidratos (%)"], ["protein_percent", "Proteínas (%)"], ["fat_percent", "Gorduras (%)"]] as ["carbohydrate_percent" | "protein_percent" | "fat_percent", string][]).map(([key, label]) => <div key={key}><Label htmlFor={`energy-${key}`}>{label}</Label><Input id={`energy-${key}`} className="mt-1" type="number" min="0" max="100" step="0.1" value={value[key] ?? ""} onChange={(event) => update(key, parse(event.target.value))} /></div>)}</div>
    <p className="mt-2 text-sm">Soma: {((value.carbohydrate_percent ?? 0) + (value.protein_percent ?? 0) + (value.fat_percent ?? 0)).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%</p>
    {calc && <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-700"><span>Carboidratos: {show(calc.carbohydrateG)} g/dia</span><span>Proteínas: {show(calc.proteinG)} g/dia</span><span>Gorduras: {show(calc.fatG)} g/dia</span></div>}
    {value.macro_reviewed && !stale ? <p role="status" className="mt-3 text-sm text-emerald-800">Distribuição revisada e confirmada para {show(target)} kcal/dia.</p> : <Button type="button" className="mt-3" disabled={!calc || blockers.length > 0 || !energyApproved} onClick={confirm}>Confirmar distribuição de macronutrientes</Button>}
    {blockers.length > 0 && <ul className="mt-2 list-inside list-disc text-xs text-amber-800">{blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}</ul>}
    {!calc && (value.carbohydrate_percent !== null || value.protein_percent !== null || value.fat_percent !== null) && <p role="alert" className="mt-2 text-sm text-amber-800">Os percentuais precisam estar entre 0 e 100, totalizar 100% e produzir uma quantidade positiva de carboidratos.</p>}
  </section>;
}
