import { sumVerifiedMeal } from "@/lib/admin/nutrition-calculations";

type Item = {
  food: string;
  portion: string;
  alternatives?: string[];
  calories_kcal?: number;
  calories_source?: string;
  protein_g?: number;
  protein_source?: string;
  carbohydrate_g?: number;
  carbohydrate_source?: string;
  fat_g?: number;
  fat_source?: string;
};
type Meal = { name: string; items: Item[]; notes?: string };
type PlanContent = { summary?: string; objective?: string; warnings?: string[]; meals?: Meal[]; observations?: string[]; professional_confirmations?: string[] };

const nutritionFields = [
  ["Energia", "calories_kcal", "calories_source", "kcal"],
  ["Proteínas", "protein_g", "protein_source", "g"],
  ["Carboidratos", "carbohydrate_g", "carbohydrate_source", "g"],
  ["Gorduras", "fat_g", "fat_source", "g"],
] as const;
const formatAmount = (value: number, unit: string) => `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} ${unit}`;

export function NutritionPlanPreview({ raw }: { raw: string }) {
  let plan: PlanContent;
  try { plan = JSON.parse(raw) as PlanContent; } catch { return <p className="mt-4 text-sm text-amber-700">A prévia estruturada será exibida quando o JSON estiver válido.</p>; }
  const meals = plan.meals ?? [];
  const itemRecords = (items: Item[]) => items as unknown as Array<Record<string, unknown>>;
  const mealTotals = (meal: Meal) => nutritionFields.map(([label, nutrient, source, unit]) => ({ label, unit, total: sumVerifiedMeal(itemRecords(meal.items ?? []), nutrient, source) }));
  const dailyTotals = nutritionFields.map(([label, nutrient, source, unit]) => {
    const totals = meals.map((meal) => sumVerifiedMeal(itemRecords(meal.items ?? []), nutrient, source));
    return { label, unit, total: totals.length > 0 && totals.every((value): value is number => value !== null) ? totals.reduce((sum, value) => sum + value, 0) : null };
  });

  return <div className="mt-5 space-y-4">
    <div className="rounded-xl bg-[#f3f8f7] p-4"><h3 className="font-semibold text-slate-900">Resumo da proposta</h3><p className="mt-2 text-sm leading-6 text-slate-600">{plan.summary || "Sem resumo."}</p><p className="mt-2 text-sm"><strong>Objetivo: </strong>{plan.objective || "A confirmar"}</p></div>
    {(plan.warnings ?? []).length > 0 && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4"><h3 className="font-semibold text-amber-900">Alertas</h3><ul className="mt-2 list-inside list-disc text-sm text-amber-800">{plan.warnings?.map((warning, index) => <li key={index}>{warning}</li>)}</ul></div>}
    <div className="grid gap-3 md:grid-cols-2">{meals.map((meal, index) => <section key={`${meal.name}-${index}`} className="rounded-xl border border-slate-200 bg-white p-4"><h3 className="font-display font-semibold text-[#21655f]">{meal.name}</h3><ul className="mt-3 space-y-3">{meal.items?.map((item, itemIndex) => <li key={`${item.food}-${itemIndex}`} className="text-sm"><p className="font-medium text-slate-800">{item.food}</p><p className="mt-0.5 text-slate-600">Porção: {item.portion}</p>{item.alternatives?.length ? <p className="mt-1 text-xs text-slate-500">Alternativas: {item.alternatives.join(", ")}</p> : null}</li>)}</ul><div className="mt-3 border-t pt-3"><p className="text-xs font-semibold text-slate-600">Totais da refeição (somente com valores e fontes completos)</p><div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">{mealTotals(meal).map(({ label, unit, total }) => <span key={label}>{label}: {total === null ? "Não calculado" : formatAmount(total, unit)}</span>)}</div></div>{meal.notes && <p className="mt-3 border-t pt-3 text-sm text-slate-500">{meal.notes}</p>}</section>)}</div>
    {meals.length > 0 && <section className="rounded-xl border border-[#b9ded6] bg-[#f3f8f7] p-4"><h3 className="font-semibold text-slate-900">Totais diários</h3><div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-sm">{dailyTotals.map(({ label, unit, total }) => <span key={label}><strong>{label}: </strong>{total === null ? "Não calculado — composição/fonte incompleta" : formatAmount(total, unit)}</span>)}</div><p className="mt-2 text-xs text-slate-500">Os totais usam somente itens com valores numéricos e fonte nutricional identificada.</p></section>}
    {(plan.observations ?? []).length > 0 && <section className="rounded-xl border border-slate-200 p-4"><h3 className="font-semibold">Observações</h3><ul className="mt-2 list-inside list-disc text-sm text-slate-600">{plan.observations?.map((value, index) => <li key={index}>{value}</li>)}</ul></section>}
    {(plan.professional_confirmations ?? []).length > 0 && <section className="rounded-xl border border-slate-200 p-4"><h3 className="font-semibold">Confirmação profissional necessária</h3><ul className="mt-2 list-inside list-disc text-sm text-slate-600">{plan.professional_confirmations?.map((value, index) => <li key={index}>{value}</li>)}</ul></section>}
  </div>;
}
