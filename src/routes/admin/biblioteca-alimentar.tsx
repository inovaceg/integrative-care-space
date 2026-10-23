import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Database, Search } from "lucide-react";
import { AdminLayout, PageIntro, SectionCard } from "@/components/admin/admin-ui";
import { Input } from "@/components/ui/input";
import { TacoXlsxImporter } from "@/components/admin/taco-xlsx-importer";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/biblioteca-alimentar")({ component: TacoFoodLibraryPage });

type TacoFood = {
  id: string;
  source_code: string;
  name: string;
  energy_kcal_100g: number;
  proteins_g_100g: number;
  carbohydrates_g_100g: number;
  fats_g_100g: number | null;
  fibers_g_100g: number | null;
  sodium_mg_100g: number | null;
  validation_status: string;
};
const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
const amount = (value: number | null, unit: string) => value === null ? "—" : `${value.toLocaleString("pt-BR")} ${unit}`;

function TacoFoodLibraryPage() {
  const [foods, setFoods] = useState<TacoFood[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void supabase.from("nutrition_food_library")
      .select("id,source_code,name,energy_kcal_100g,proteins_g_100g,carbohydrates_g_100g,fats_g_100g,fibers_g_100g,sodium_mg_100g,validation_status")
      .eq("source", "TACO")
      .order("name")
      .limit(1000)
      .then(({ data, error: queryError }) => {
        if (!active) return;
        if (queryError) setError("Não foi possível consultar o banco TACO.");
        else setFoods((data as TacoFood[] | null) ?? []);
        setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const visibleFoods = useMemo(() => {
    const term = normalize(search.trim());
    return term ? foods.filter((food) => normalize(food.name).includes(term)) : foods;
  }, [foods, search]);

  return <AdminLayout>
    <PageIntro eyebrow="Nutrição" title="Banco Nutricional TACO" description="Importe e consulte a composição dos alimentos da TACO por 100 g. A aba ‘Composição completa’ não é importada neste fluxo." />
    <div className="space-y-6">
      <TacoXlsxImporter />
      <SectionCard title={`Alimentos cadastrados na TACO (${foods.length})`}>
        {error && <p role="alert" className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <div className="mb-4 flex items-center gap-3"><div className="relative w-full max-w-md"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Pesquisar alimento TACO" className="pl-9" /></div><span className="whitespace-nowrap text-xs text-slate-500">{visibleFoods.length} resultado(s)</span></div>
        {loading ? <p className="p-6 text-center text-sm text-slate-500">Carregando alimentos TACO...</p> : visibleFoods.length === 0 ? <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center"><Database className="mx-auto size-7 text-slate-400" /><p className="mt-2 text-sm text-slate-600">{foods.length ? "Nenhum alimento corresponde à busca." : "A base TACO ainda não foi importada. Selecione a planilha acima para começar."}</p></div> : <div className="max-h-[36rem] overflow-auto rounded-xl border border-slate-200"><table className="min-w-full text-left text-sm"><thead className="sticky top-0 bg-slate-50 text-xs text-slate-500"><tr>{["Código TACO", "Alimento", "Energia", "Proteínas", "Carboidratos", "Gorduras", "Fibras", "Sódio"].map((label) => <th key={label} className="whitespace-nowrap px-3 py-2">{label}</th>)}</tr></thead><tbody>{visibleFoods.map((food) => <tr key={food.id} className="border-t border-slate-100"><td className="whitespace-nowrap px-3 py-2">{food.source_code.replace(/^TACO-/, "")}</td><td className="min-w-64 px-3 py-2">{food.name}</td><td className="whitespace-nowrap px-3 py-2">{amount(food.energy_kcal_100g, "kcal")}</td><td className="whitespace-nowrap px-3 py-2">{amount(food.proteins_g_100g, "g")}</td><td className="whitespace-nowrap px-3 py-2">{amount(food.carbohydrates_g_100g, "g")}</td><td className="whitespace-nowrap px-3 py-2">{amount(food.fats_g_100g, "g")}</td><td className="whitespace-nowrap px-3 py-2">{amount(food.fibers_g_100g, "g")}</td><td className="whitespace-nowrap px-3 py-2">{amount(food.sodium_mg_100g, "mg")}</td></tr>)}</tbody></table></div>}
        <p className="mt-3 text-xs text-slate-500">Nutrientes ausentes aparecem como “—”, nunca como zero. Dados salvos na tabela nutricional compartilhada; este painel mostra exclusivamente registros com fonte TACO.</p>
      </SectionCard>
    </div>
  </AdminLayout>;
}
