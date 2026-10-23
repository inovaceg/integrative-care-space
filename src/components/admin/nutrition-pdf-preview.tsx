import { documentBrand } from "@/lib/admin/document-brand";
import { formatNutritionAmount, type NutritionPdfDocument, type NutritionPdfTotals } from "@/lib/admin/nutrition-pdf";

const summaries: { label: string; key: keyof NutritionPdfTotals; unit: string }[] = [
  { label: "Calorias", key: "calories", unit: "kcal" },
  { label: "Proteínas", key: "protein", unit: "g" },
  { label: "Carboidratos", key: "carbohydrate", unit: "g" },
  { label: "Gorduras", key: "fat", unit: "g" },
];
const amount = (value: number | null | undefined, unit: string) => formatNutritionAmount(value ?? null, unit);
const unapprovedNotice = (status: string) => status === "Em elaboração"
  ? "Proposta alimentar em elaboração — não utilizar como prescrição."
  : "Proposta alimentar para revisão profissional — não constitui prescrição dietética.";

function LogoMark() {
  return <svg aria-hidden="true" viewBox="0 0 64 64" className="size-8 shrink-0">
    <path d={documentBrand.backgroundPath} fill={documentBrand.color} />
    <path d={documentBrand.symbolPath} fill="none" stroke="white" strokeWidth={documentBrand.strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </svg>;
}

export function NutritionPdfPreview({ document }: { document: NutritionPdfDocument }) {
  const summary = [...summaries, ...(document.dailyTotals.fiber === null ? [] : [{ label: "Fibras", key: "fiber" as const, unit: "g" }])];
  return <div className="max-h-[72vh] space-y-5 overflow-y-auto bg-slate-100 p-3 sm:p-6">
    {document.pages.map((page) => <article key={page.number} className="mx-auto box-border min-h-[842px] w-full max-w-[595px] bg-white px-8 py-10 text-slate-800 shadow-sm sm:px-12 sm:py-12" style={{ fontFamily: "Arial, sans-serif" }}>
      {page.number === 1 ? <header className="border-b border-[#d8e2df] pb-4">
        <div className="flex items-center gap-3"><LogoMark /><h2 className="text-[22px] font-bold tracking-wide text-[#174b45]">{document.draft ? "PROPOSTA ALIMENTAR" : "PLANEJAMENTO ALIMENTAR"}</h2></div>
        <div className="mt-4 grid gap-x-5 gap-y-1.5 text-[12px] sm:grid-cols-2">
          <p className="sm:col-span-2"><strong>Paciente:</strong> {document.patient}</p>
          <p><strong>Objetivo:</strong> {document.objective || "Não informado"}</p>
          <p><strong>Elaboração:</strong> {document.emissionDate}</p>
          {document.evaluationDate && <p><strong>Data da avaliação:</strong> {document.evaluationDate}</p>}
          {document.reviewer && <p className="sm:col-span-2">{document.reviewer}</p>}
          <p className={`mt-1 font-bold tracking-wide ${document.draft ? "text-amber-800" : "text-[#21655f]"}`}>STATUS: {document.status.toLocaleUpperCase("pt-BR")}</p>
          {document.draft && <p className="sm:col-span-2 text-[11px] font-medium text-amber-800">{unapprovedNotice(document.status)}</p>}
        </div>
      </header> : <header className="flex items-center gap-3 border-b border-[#d8e2df] pb-3"><LogoMark /><div><h2 className="text-[18px] font-bold tracking-wide text-[#174b45]">PLANEJAMENTO ALIMENTAR · CONTINUAÇÃO</h2>{document.draft && <p className="mt-1 text-[11px] font-medium text-amber-800">{unapprovedNotice(document.status)}</p>}</div></header>}
      <div className="mt-4 space-y-4">
        {page.summary && <section className="border-b border-[#d8e2df] pb-4">
          <h3 className="text-[13px] font-bold uppercase tracking-wider text-[#174b45]">Resumo nutricional diário</h3>
          <div className={`mt-2 grid grid-cols-2 divide-x divide-y divide-[#e2e9e7] ${summary.length === 5 ? "sm:grid-cols-5" : "sm:grid-cols-4"}`}>
            {summary.map(({ label, key, unit }) => <div key={key} className="px-2 py-2 first:pl-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#6f817d]">{label}</p>
              <p className="mt-1 text-[17px] font-bold text-[#174b45]">{amount(document.dailyTotals[key], unit)}</p>
            </div>)}
          </div>
        </section>}
        {page.number === 1 && document.energy && <section className="rounded-lg border border-[#d8e2df] bg-[#f7faf9] p-3 text-xs"><h3 className="font-bold uppercase tracking-wide text-[#174b45]">Necessidades energéticas do paciente</h3><p className="mt-1">TMB estimada: {amount(document.energy.bmr_kcal, "kcal/dia")} · GET estimado: {amount(document.energy.estimated_daily_kcal, "kcal/dia")}</p><p className="mt-1 font-semibold">Meta {document.energy.professional_reviewed ? "validada" : "não aprovada"}: {amount(document.energy.professional_reviewed ? document.energy.adjusted_daily_kcal : null, "kcal/dia")} · Total energético do cardápio: {amount(document.dailyTotals.calories, "kcal/dia")}</p><p className="mt-1">Diferença entre cardápio e meta: {document.energy.professional_reviewed && document.energy.adjusted_daily_kcal && document.dailyTotals.calories !== null ? `${amount(document.dailyTotals.calories - document.energy.adjusted_daily_kcal, "kcal")} (${((document.dailyTotals.calories - document.energy.adjusted_daily_kcal) / document.energy.adjusted_daily_kcal * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%)` : "não calculada"}</p><p className="mt-1 text-slate-500">Fator {document.energy.activity_factor ?? "não confirmado"} · {document.energy.activity_level || "atividade não confirmada"}</p></section>}
        {page.meals.map((meal, index) => <section key={`${meal.name}-${index}`} className="break-inside-avoid">
          <h3 className="mb-2 border-l-[3px] border-[#6f9b90] pl-2.5 text-[17px] font-bold uppercase tracking-wide text-[#174b45]">{meal.name}{meal.continued ? " · continuação" : ""}</h3>
          <table className="w-full border-collapse text-xs">
            <thead><tr className="border-b border-[#d8e2df] text-left text-[#55776f]"><th className="py-1.5 pr-2 font-semibold">Alimento</th><th className="w-[84px] py-1.5 text-right font-semibold">Quantidade</th><th className="w-[82px] py-1.5 text-right font-semibold">Calorias</th></tr></thead>
            <tbody>{meal.items.map((item, itemIndex) => <tr key={`${item.food}-${itemIndex}`} className="border-b border-slate-100 align-top"><td className="py-1.5 pr-2"><p className="text-[14px] font-medium text-slate-800">{item.food}</p><p className="mt-0.5 text-xs leading-4 text-slate-600">Proteínas {amount(item.protein_g, "g")} · Carboidratos {amount(item.carbohydrate_g, "g")} · Gorduras {amount(item.fat_g, "g")}{item.fiber_g == null ? "" : ` · Fibras ${amount(item.fiber_g, "g")}`}</p>{item.alternatives?.length ? <p className="mt-1 border-l-2 border-[#c5d5d0] pl-2 text-xs leading-4 text-slate-500">Substituições para avaliação: {item.alternatives.join(" · ")}</p> : null}{item.notes && <p className="mt-1 text-xs leading-4 text-slate-500">{item.notes}</p>}</td><td className="py-1.5 text-right text-slate-700">{item.quantity_g !== undefined ? amount(item.quantity_g, "g") : item.portion || "—"}</td><td className="py-1.5 text-right font-medium text-slate-800">{amount(item.calories_kcal, "kcal")}</td></tr>)}</tbody>
          </table>
          {meal.finalPart && <div className="mt-2 border-t border-[#d8e2df] pt-2"><p className="text-[14px] font-bold text-[#174b45]">Total da refeição: {amount(meal.totals.calories, "kcal")}</p><p className="mt-1 text-xs text-slate-600">Proteínas {amount(meal.totals.protein, "g")} · Carboidratos {amount(meal.totals.carbohydrate, "g")} · Gorduras {amount(meal.totals.fat, "g")}{meal.totals.fiber === null ? "" : ` · Fibras ${amount(meal.totals.fiber, "g")}`}</p></div>}
          {meal.notes && <p className="mt-1 text-xs leading-4 text-slate-600">{meal.notes}</p>}
        </section>)}
        {page.sections.map((section, index) => <section key={`${section.title}-${index}`} className={`break-inside-avoid border-t pt-2.5 ${section.kind === "review" ? "border-amber-200" : "border-[#d8e2df]"}`}>
          <h3 className={`text-xs font-bold uppercase tracking-wide ${section.kind === "review" ? "text-amber-800" : "text-[#174b45]"}`}>{section.title}</h3>
          <ul className="mt-1.5 space-y-1 text-xs leading-4 text-slate-700">{section.lines.map((entry, entryIndex) => <li key={entryIndex}>{section.kind === "source" ? entry : `• ${entry}`}</li>)}</ul>
        </section>)}
      </div>
      <footer className="mt-6 border-t border-[#d8e2df] pt-2 text-center text-[11px] text-slate-500">Página {page.number} de {page.count} · Planejamento alimentar · Emissão: {document.emissionDate}</footer>
    </article>)}
  </div>;
}
