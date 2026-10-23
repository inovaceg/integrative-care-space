import { Input } from "@/components/ui/input";
import { calculatePlanNutrition } from "@/lib/admin/nutrition-calculations";

type Item = {
  food: string;
  portion: string;
  alternatives?: string[];
  calories_kcal?: number | null;
  calories_source?: string;
  protein_g?: number | null;
  protein_source?: string;
  carbohydrate_g?: number | null;
  carbohydrate_source?: string;
  fat_g?: number | null;
  fat_source?: string;
  fiber_g?: number | null;
  fiber_source?: string;
  quantity_g?: number;
  nutrition_per_100g?: { calories_kcal: number; protein_g: number; carbohydrate_g: number; fat_g: number | null; fiber_g?: number | null };
};
type Meal = { name: string; items: Item[]; notes?: string };
type PlanContent = { summary?: string; objective?: string; warnings?: string[]; meals?: Meal[]; observations?: string[]; professional_confirmations?: string[] };

const nutrients = [
  ["Energia", "calories_kcal", "kcal"],
  ["Proteínas", "protein_g", "g"],
  ["Carboidratos", "carbohydrate_g", "g"],
  ["Gorduras", "fat_g", "g"],
  ["Fibras", "fiber_g", "g"],
] as const;
const formatAmount = (value: number | null, unit: string) => value === null ? "Não calculado" : `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} ${unit}`;

export function NutritionPlanPreview({ raw, onQuantityChange, readOnly = false }: { raw: string; onQuantityChange?: (mealIndex: number, itemIndex: number, grams: number) => void; readOnly?: boolean }) {
  let plan: PlanContent;
  try { plan = JSON.parse(raw) as PlanContent; } catch { return <p className="mt-4 text-sm text-amber-700">A prévia estruturada será exibida quando o JSON estiver válido.</p>; }
  const calculated = calculatePlanNutrition((plan.meals ?? []) as unknown as Array<{ name?: string; items?: Array<Record<string, unknown>> }>);
  const meals = calculated.meals as unknown as Array<Meal & { totals: typeof calculated.totals }>;
  return <div className="mt-5 space-y-4">
    <div className="rounded-xl bg-[#f3f8f7] p-4"><h3 className="font-semibold text-slate-900">Resumo da proposta</h3><p className="mt-2 text-sm leading-6 text-slate-600">{plan.summary || "Sem resumo."}</p><p className="mt-2 text-sm"><strong>Objetivo: </strong>{plan.objective || "A confirmar"}</p></div>
    {(plan.warnings ?? []).length > 0 && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4"><h3 className="font-semibold text-amber-900">Alertas</h3><ul className="mt-2 list-inside list-disc text-sm text-amber-800">{plan.warnings?.map((warning, index) => <li key={index}>{warning}</li>)}</ul></div>}
    {calculated.issues.length > 0 && <div className="rounded-xl border border-amber-300 bg-amber-50 p-4"><h3 className="font-semibold text-amber-900">Cálculo nutricional incompleto</h3><p className="mt-1 text-sm text-amber-800">Confira valores e fontes antes de encaminhar para aprovação.</p><ul className="mt-2 list-inside list-disc text-xs text-amber-800">{calculated.issues.slice(0, 8).map((issue, index) => <li key={index}>{issue}</li>)}</ul></div>}
    <div className="grid gap-3 md:grid-cols-2">{meals.map((meal, mealIndex) => <section key={`${meal.name}-${mealIndex}`} className="rounded-xl border border-slate-200 bg-white p-4"><h3 className="font-display font-semibold text-[#21655f]">{meal.name}</h3><ul className="mt-3 space-y-3">{meal.items.map((item, itemIndex) => <li key={`${item.food}-${itemIndex}`} className="text-sm"><p className="font-medium text-slate-800">{item.food}</p>{item.quantity_g !== undefined && item.nutrition_per_100g && !readOnly && onQuantityChange ? <label className="mt-1 flex items-center gap-2 text-slate-600">Quantidade (g)<Input className="h-8 w-28" type="number" min="1" max="2000" value={item.quantity_g} onChange={(event) => onQuantityChange(mealIndex, itemIndex, Number(event.target.value))} /></label> : <p className="mt-0.5 text-slate-600">Porção: {item.portion}</p>}<p className="mt-1 text-xs text-slate-500">{formatAmount(item.calories_kcal ?? null, "kcal")} · proteínas {formatAmount(item.protein_g ?? null, "g")} · carboidratos {formatAmount(item.carbohydrate_g ?? null, "g")} · gorduras {formatAmount(item.fat_g ?? null, "g")} · fibras {formatAmount(item.fiber_g ?? null, "g")}</p>{item.alternatives?.length ? <p className="mt-1 text-xs text-slate-500">Substituições para avaliação: {item.alternatives.join(", ")}</p> : null}</li>)}</ul><div className="mt-3 border-t pt-3"><p className="text-xs font-semibold text-slate-600">Totais da refeição</p><div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">{nutrients.map(([label, key, unit]) => <span key={key}>{label}: {formatAmount(meal.totals[key], unit)}</span>)}</div></div>{meal.notes && <p className="mt-3 border-t pt-3 text-sm text-slate-500">{meal.notes}</p>}</section>)}</div>
    {meals.length > 0 && <section className="rounded-xl border border-[#b9ded6] bg-[#f3f8f7] p-4"><h3 className="font-semibold text-slate-900">Totais diários</h3><div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-sm">{nutrients.map(([label, key, unit]) => <span key={key}><strong>{label}: </strong>{formatAmount(calculated.totals[key], unit)}</span>)}</div></section>}
    {(plan.observations ?? []).length > 0 && <section className="rounded-xl border border-slate-200 p-4"><h3 className="font-semibold">Observações</h3><ul className="mt-2 list-inside list-disc text-sm text-slate-600">{plan.observations?.map((value, index) => <li key={index}>{value}</li>)}</ul></section>}
    {(plan.professional_confirmations ?? []).length > 0 && <section className="rounded-xl border border-slate-200 p-4"><h3 className="font-semibold">Confirmação profissional necessária</h3><ul className="mt-2 list-inside list-disc text-sm text-slate-600">{plan.professional_confirmations?.map((value, index) => <li key={index}>{value}</li>)}</ul></section>}
  </div>;
}
