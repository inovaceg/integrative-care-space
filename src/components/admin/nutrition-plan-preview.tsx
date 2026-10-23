import { Input } from "@/components/ui/input";
import { calculatePlanNutrition } from "@/lib/admin/nutrition-calculations";

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
  fiber_g?: number;
  fiber_source?: string;
  quantity_g?: number;
  nutrition_per_100g?: { calories_kcal: number; protein_g: number; carbohydrate_g: number; fat_g: number | null; fiber_g?: number | null };
};
type Meal = { name: string; items: Item[]; notes?: string };
type PlanContent = { summary?: string; objective?: string; warnings?: string[]; meals?: Meal[]; observations?: string[]; professional_confirmations?: string[] };

const nutritionFields = [
  ["Energia", "calories_kcal", "calories_source", "kcal"],
  ["Proteínas", "protein_g", "protein_source", "g"],
  ["Carboidratos", "carbohydrate_g", "carbohydrate_source", "g"],
  ["Gorduras", "fat_g", "fat_source", "g"],
  ["Fibras", "fiber_g", "fiber_source", "g"],
] as const;
const formatAmount = (value: number, unit: string) => `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} ${unit}`;

export function NutritionPlanPreview({ raw, onQuantityChange, readOnly = false }: { raw: string; onQuantityChange?: (mealIndex: number, itemIndex: number, grams: number) => void; readOnly?: boolean }) {
  let plan: PlanContent;
  try { plan = JSON.parse(raw) as PlanContent; } catch { return <p className="mt-4 text-sm text-amber-700">A prévia estruturada será exibida quando o JSON estiver válido.</p>; }
  const calculated = calculatePlanNutrition((plan.meals ?? []) as unknown as Array<{ name?: string; items?: Array<Record<string, unknown>> }>);
  const meals = calculated.meals as unknown as Array<Meal & { totals: typeof calculated.totals }>;
  const mealTotals = (meal: typeof meals[number]) => nutritionFields.map(([label, nutrient, , unit]) => ({ label, unit, total: meal.totals[nutrient] }));
  const dailyTotals = nutritionFields.map(([label, nutrient, , unit]) => ({ label, unit, total: calculated.totals[nutrient] }));

  return <div className="mt-5 space-y-4">
    <div className="rounded-xl bg-[#f3f8f7] p-4"><h3 className="font-semibold text-slate-900">Resumo da proposta</h3><p className="mt-2 text-sm leading-6 text-slate-600">{plan.summary || "Sem resumo."}</p><p className="mt-2 text-sm"><strong>Objetivo: </strong>{plan.objective || "A confirmar"}</p></div>
    {(plan.warnings ?? []).length > 0 && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4"><h3 className="font-semibold text-amber-900">Alertas</h3><ul className="mt-2 list-inside list-disc text-sm text-amber-800">{plan.warnings?.map((warning, index) => <li key={index}>{warning}</li>)}</ul></div>}
    <div className="grid gap-3 md:grid-cols-2">{meals.map((meal, mealIndex) => <section key={`${meal.name}-${mealIndex}`} className="rounded-xl border border-slate-200 bg-white p-4"><h3 className="font-display font-semibold text-[#21655f]">{meal.name}</h3><ul className="mt-3 space-y-3">{meal.items?.map((item, itemIndex) => <li key={`${item.food}-${itemIndex}`} className="text-sm"><p className="font-medium text-slate-800">{item.food}</p>{item.quantity_g !== undefined && item.nutrition_per_100g && !readOnly && onQuantityChange ? <label className="mt-1 flex items-center gap-2 text-slate-600">Quantidade (g)<Input className="h-8 w-28" type="number" min="1" max="2000" value={item.quantity_g} onChange={(event) => onQuantityChange(mealIndex, itemIndex, Number(event.target.value))} /></label> : <p className="mt-0.5 text-slate-600">Porção: {item.portion}</p>}{item.alternatives?.length ? <p className="mt-1 text-xs text-slate-500">Substituições para avaliação: {item.alternatives.join(", ")}</p> : null}</li>)}</ul><div className="mt-3 border-t pt-3"><p className="text-xs font-semibold text-slate-600">Totais da refeição (somente com valores e fontes completos)</p><div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">{mealTotals(meal).map(({ label, unit, total }) => <span key={label}>{label}: {total === null ? "Não calculado" : formatAmount(total, unit)}</span>)}</div></div>{meal.notes && <p className="mt-3 border-t pt-3 text-sm text-slate-500">{meal.notes}</p>}</section>)}</div>
    {meals.length > 0 && <section className="rounded-xl border border-[#b9ded6] bg-[#f3f8f7] p-4"><h3 className="font-semibold text-slate-900">Totais diários</h3><div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-sm">{dailyTotals.map(({ label, unit, total }) => <span key={label}><strong>{label}: </strong>{total === null ? "Não calculado — composição/fonte incompleta" : formatAmount(total, unit)}</span>)}</div><p className="mt-2 text-xs text-slate-500">Os totais usam somente itens com valores numéricos e fonte nutricional identificada.</p></section>}
    {(plan.observations ?? []).length > 0 && <section className="rounded-xl border border-slate-200 p-4"><h3 className="font-semibold">Observações</h3><ul className="mt-2 list-inside list-disc text-sm text-slate-600">{plan.observations?.map((value, index) => <li key={index}>{value}</li>)}</ul></section>}
    {(plan.professional_confirmations ?? []).length > 0 && <section className="rounded-xl border border-slate-200 p-4"><h3 className="font-semibold">Confirmação profissional necessária</h3><ul className="mt-2 list-inside list-disc text-sm text-slate-600">{plan.professional_confirmations?.map((value, index) => <li key={index}>{value}</li>)}</ul></section>}
  </div>;
}
