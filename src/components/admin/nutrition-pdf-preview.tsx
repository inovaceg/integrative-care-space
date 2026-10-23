import { formatNutritionAmount, type NutritionPdfDocument, type NutritionPdfTotals } from "@/lib/admin/nutrition-pdf";
import { calculatePlanNutrition } from "@/lib/admin/nutrition-calculations";

const totalLine = (totals: NutritionPdfTotals) => [
  `Proteínas: ${formatNutritionAmount(totals.protein, "g")}`,
  `Carboidratos: ${formatNutritionAmount(totals.carbohydrate, "g")}`,
  `Gorduras: ${formatNutritionAmount(totals.fat, "g")}`,
];

export function NutritionPdfPreview({ document }: { document: NutritionPdfDocument }) {
  const daily = calculatePlanNutrition(document.pages.flatMap((page) => page.meals.map((meal) => ({ name: meal.name, items: meal.items as unknown as Array<Record<string, unknown>> }))));
  const dailyTotals: NutritionPdfTotals = {
    calories: daily.totals.calories_kcal,
    protein: daily.totals.protein_g,
    carbohydrate: daily.totals.carbohydrate_g,
    fat: daily.totals.fat_g,
    fiber: daily.totals.fiber_g,
  };
  return <div className="max-h-[72vh] space-y-5 overflow-y-auto bg-slate-100 p-3 sm:p-6">
    {document.pages.map((page) => <article key={page.number} className="mx-auto min-h-[900px] w-full max-w-[640px] bg-white px-8 py-10 shadow-md sm:px-12 sm:py-12" style={{ fontFamily: "Arial, sans-serif" }}>
      <header className="border-b border-[#d9e5e1] pb-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#72958a]">Dr. Frederick</p>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <h2 className="text-xl font-bold tracking-wide text-[#1f514b]">PLANEJAMENTO ALIMENTAR</h2>
          {document.draft && <span className="rounded border border-amber-300 bg-amber-50 px-2.5 py-1 text-[10px] font-bold tracking-wide text-amber-800">RASCUNHO — NÃO É PRESCRIÇÃO</span>}
        </div>
        {page.number === 1 && <div className="mt-4 grid gap-x-5 gap-y-2 text-xs text-slate-700 sm:grid-cols-2">
          <p><strong>Paciente:</strong> {document.patient}</p>
          <p><strong>Data da avaliação:</strong> {document.evaluationDate ?? "Não informada"}</p>
          <p><strong>Objetivo:</strong> {document.objective || "Não informado"}</p>
          <p><strong>Data de emissão:</strong> {document.emissionDate}</p>
          {document.reviewer && <p className="sm:col-span-2">{document.reviewer}</p>}
        </div>}
      </header>
      <div className="mt-5 space-y-5">
        {page.meals.map((meal, index) => <section key={`${meal.name}-${index}`} className="break-inside-avoid">
          <h3 className="mb-2 border-l-4 border-[#72958a] pl-2.5 text-sm font-bold uppercase tracking-wide text-[#1f514b]">{meal.name}{meal.continued ? " · continuação" : ""}</h3>
          <table className="w-full border-collapse text-xs">
            <thead><tr className="border-b border-[#d9e5e1] text-left text-[#72958a]"><th className="py-2 pr-2 font-semibold">Alimento</th><th className="w-24 py-2 text-right font-semibold">Quantidade</th><th className="w-24 py-2 text-right font-semibold">Calorias</th></tr></thead>
            <tbody>{meal.items.map((item, itemIndex) => <tr key={`${item.food}-${itemIndex}`} className="border-b border-slate-100 align-top"><td className="py-2 pr-2 font-medium text-slate-800">{item.food}{item.alternatives?.length ? <div className="mt-1 text-[10px] font-normal text-slate-500">Alternativas para avaliação profissional: {item.alternatives.join(" · ")}</div> : null}</td><td className="py-2 text-right text-slate-700">{item.quantity_g !== undefined ? formatNutritionAmount(item.quantity_g, "g") : item.portion || "—"}</td><td className="py-2 text-right text-slate-700">{formatNutritionAmount(item.calories_kcal ?? null, "kcal")}</td></tr>)}</tbody>
          </table>
          {meal.finalPart && <div className="mt-2 border-t border-[#d9e5e1] pt-2"><p className="text-xs font-bold text-[#1f514b]">Total da refeição: {formatNutritionAmount(meal.totals.calories, "kcal")}</p><p className="mt-1 text-[10px] text-slate-600">{totalLine(meal.totals).join("  |  ")}</p>{meal.totals.fiber !== null && <p className="mt-1 text-[10px] text-slate-600">Fibras: {formatNutritionAmount(meal.totals.fiber, "g")}</p>}</div>}
          {meal.notes && <p className="mt-2 text-[10px] leading-4 text-slate-600">{meal.notes}</p>}
        </section>)}
        {page.appendix && <>
          <section className="break-inside-avoid rounded-lg border border-[#d9e5e1] bg-[#f3f7f5] p-4">
            <h3 className="text-sm font-bold uppercase tracking-wide text-[#1f514b]">Resumo nutricional diário</h3>
            <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-slate-700 sm:grid-cols-3">
              <p><strong>Calorias</strong><br />{formatNutritionAmount(dailyTotals.calories, "kcal")}</p>
              <p><strong>Proteínas</strong><br />{formatNutritionAmount(dailyTotals.protein, "g")}</p>
              <p><strong>Carboidratos</strong><br />{formatNutritionAmount(dailyTotals.carbohydrate, "g")}</p>
              <p><strong>Gorduras</strong><br />{formatNutritionAmount(dailyTotals.fat, "g")}</p>
              {dailyTotals.fiber !== null && <p><strong>Fibras</strong><br />{formatNutritionAmount(dailyTotals.fiber, "g")}</p>}
            </div>
          </section>
          {document.observations.length > 0 && <section className="break-inside-avoid"><h3 className="text-xs font-bold uppercase tracking-wide text-[#1f514b]">Orientações</h3><div className="mt-2 space-y-1.5 text-xs leading-5 text-slate-700">{document.observations.map((item, itemIndex) => <p key={itemIndex}>{item}</p>)}</div></section>}
          {document.warnings.length > 0 && <section className="break-inside-avoid rounded-md border border-amber-200 bg-amber-50 p-3 text-[10px] leading-4 text-amber-900"><strong>Atenção</strong>{document.warnings.map((warning, itemIndex) => <p key={itemIndex} className="mt-1">{warning}</p>)}</section>}
          {document.sources.length > 0 && <section className="break-inside-avoid border-t border-[#d9e5e1] pt-3"><h3 className="text-[10px] font-bold uppercase tracking-wide text-[#1f514b]">Fontes dos dados nutricionais</h3><p className="mt-1 text-[10px] leading-4 text-slate-500">Referências de composição informadas no catálogo: {document.sources.join(" · ")}.</p></section>}
        </>}
      </div>
      <footer className="mt-8 border-t border-[#d9e5e1] pt-3 text-center text-[10px] text-slate-400">Página {page.number} de {page.count}</footer>
    </article>)}
  </div>;
}
