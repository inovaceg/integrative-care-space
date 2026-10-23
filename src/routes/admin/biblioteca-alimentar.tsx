import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Check, Database, Loader2, Search, ShieldCheck } from "lucide-react";
import { AdminLayout, PageIntro, SectionCard } from "@/components/admin/admin-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/biblioteca-alimentar")({ component: NutritionFoodLibraryPage });

type SearchFood = {
  source_code: string;
  name: string;
  category: string;
  energy_kcal_100g: number | null;
  proteins_g_100g: number | null;
  carbohydrates_g_100g: number | null;
  fats_g_100g: number | null;
  source: string;
  license: string;
};
type FoodRow = {
  id: string;
  source_code: string | null;
  name: string;
  category: string;
  energy_kcal_100g: number;
  proteins_g_100g: number;
  carbohydrates_g_100g: number;
  fats_g_100g: number | null;
  allergens: string[];
  allergen_info_known: boolean;
  gluten_status: "free" | "contains" | "unknown";
  lactose_status: "free" | "contains" | "unknown";
  source: string;
  license: string;
  import_notes: string | null;
  validation_status: "draft" | "verified";
};
const numberValue = (value: string) => value.trim() === "" ? null : Number(value.replace(",", "."));
const parseAllergens = (value: string) => value.split(/[,;\n]/).map((item) => item.trim()).filter(Boolean);

function NutritionFoodLibraryPage() {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [importing, setImporting] = useState("");
  const [saving, setSaving] = useState("");
  const [results, setResults] = useState<SearchFood[]>([]);
  const [foods, setFoods] = useState<FoodRow[]>([]);
  const [allergenDrafts, setAllergenDrafts] = useState<Record<string, string>>({});
  const [nameDrafts, setNameDrafts] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadFoods() {
    const { data, error: loadError } = await supabase.from("nutrition_food_library")
      .select("id,source_code,name,category,energy_kcal_100g,proteins_g_100g,carbohydrates_g_100g,fats_g_100g,allergens,allergen_info_known,gluten_status,lactose_status,source,license,import_notes,validation_status")
      .order("validation_status").order("name").limit(500);
    if (loadError) { setError("Não foi possível carregar a biblioteca alimentar."); return; }
    const rows = (data as FoodRow[] | null) ?? [];
    setFoods(rows);
    setAllergenDrafts(Object.fromEntries(rows.map((food) => [food.id, food.allergens.join(", ")])));
    setNameDrafts(Object.fromEntries(rows.map((food) => [food.id, food.name])));
  }

  useEffect(() => { void loadFoods(); }, []);

  async function searchFoods(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (query.trim().length < 2) { setError("Digite pelo menos 2 caracteres para pesquisar."); return; }
    setSearching(true); setError(""); setMessage(""); setResults([]);
    const { data: translatedQuery, error: translationError } = await supabase.functions.invoke("nutrition-food-translate", { body: { food_name: query.trim(), target_language: "en" } });
    const searchTerm = !translationError && typeof translatedQuery?.translated_name === "string" ? translatedQuery.translated_name : query.trim();
    const { data, error: searchError } = await supabase.functions.invoke("nutrition-food-search", { body: { query: searchTerm } });
    setSearching(false);
    if (searchError) {
      const context = "context" in searchError ? searchError.context : null;
      let detail = searchError.message;
      if (context instanceof Response) {
        const body = await context.clone().json().catch(() => null) as { error?: unknown } | null;
        if (typeof body?.error === "string") detail = body.error;
      }
      setError(detail || "Falha ao pesquisar na USDA FoodData Central.");
      return;
    }
    if (data?.error) { setError(typeof data.error === "string" ? data.error : "Falha ao pesquisar na USDA FoodData Central."); return; }
    setResults((data?.foods as SearchFood[] | undefined) ?? []);
    if (!data?.foods?.length) setMessage(`Nenhum alimento Foundation ou SR Legacy foi encontrado para “${searchTerm}”.${translationError ? " A tradução da busca falhou; tente novamente ou pesquise em inglês." : ""}`);
  }

  async function importDraft(food: SearchFood) {
    if (food.energy_kcal_100g === null || food.proteins_g_100g === null || food.carbohydrates_g_100g === null) {
      setError("Este resultado não tem todos os nutrientes básicos para importação. Não foi adicionado.");
      return;
    }
    setImporting(food.source_code); setError(""); setMessage("");
    const { data: existing, error: lookupError } = await supabase.from("nutrition_food_library")
      .select("id,validation_status").eq("source_code", food.source_code).maybeSingle();
    if (lookupError) { setImporting(""); setError("Não foi possível conferir se o alimento já foi importado."); return; }
    if (existing) { setImporting(""); setMessage(`Este alimento já está cadastrado como ${existing.validation_status === "verified" ? "verificado" : "rascunho"}.`); return; }
    const { data: translation, error: translationError } = await supabase.functions.invoke("nutrition-food-translate", { body: { food_name: food.name } });
    const translatedName = !translationError && typeof translation?.translated_name === "string" ? translation.translated_name : food.name;
    const { error: insertError } = await supabase.from("nutrition_food_library").insert({
      source_code: food.source_code,
      name: translatedName,
      category: `USDA ${food.category}`,
      energy_kcal_100g: food.energy_kcal_100g,
      proteins_g_100g: food.proteins_g_100g,
      carbohydrates_g_100g: food.carbohydrates_g_100g,
      fats_g_100g: food.fats_g_100g,
      source: food.source,
      license: food.license,
      validation_status: "draft",
      allergens: [],
      allergen_info_known: false,
      gluten_status: "unknown",
      lactose_status: "unknown",
      import_notes: `Nome oficial da fonte: ${food.name}. Importado da USDA FoodData Central. A tradução é uma sugestão automática; confira identidade, preparo e alergênicos antes de validar.`,
    });
    setImporting("");
    if (insertError) { setError("Não foi possível salvar o rascunho. Confira as permissões e tente novamente."); return; }
    setMessage(translatedName !== food.name ? `${translatedName} foi importado como rascunho traduzido. Confira a tradução, os dados e os alergênicos antes de validar.` : `${food.name} foi importado como rascunho, mantendo o nome original. Confira os dados antes de validar.${translationError ? " A tradução automática não respondeu." : ""}`);
    await loadFoods();
  }

  function editFood(id: string, field: keyof FoodRow, value: unknown) {
    setFoods((current) => current.map((food) => food.id === id ? { ...food, [field]: value } : food));
  }

  async function saveFood(food: FoodRow, validate: boolean) {
    const calories = food.energy_kcal_100g == null ? null : Number(food.energy_kcal_100g);
    const protein = food.proteins_g_100g == null ? null : Number(food.proteins_g_100g);
    const carbs = food.carbohydrates_g_100g == null ? null : Number(food.carbohydrates_g_100g);
    const fat = food.fats_g_100g == null ? null : Number(food.fats_g_100g);
    const name = (nameDrafts[food.id] ?? food.name).trim();
    const allergens = parseAllergens(allergenDrafts[food.id] ?? "");
    if (!name || calories === null || protein === null || carbs === null || ![calories, protein, carbs].every((value) => Number.isFinite(value) && value >= 0) || (fat !== null && (!Number.isFinite(fat) || fat < 0))) {
      setError("Revise nome e valores nutricionais por 100 g. Os campos básicos precisam ser números válidos não negativos."); return;
    }
    if (validate && (!food.source_code || !food.source.trim() || !food.license.trim() || !food.allergen_info_known)) {
      setError("Para validar, mantenha a referência/licença e confirme que os alergênicos foram revisados em fonte confiável. Se não houver alergênicos, deixe a lista vazia e marque a confirmação."); return;
    }
    setSaving(food.id); setError(""); setMessage("");
    const { error: saveError } = await supabase.from("nutrition_food_library").update({
      name,
      energy_kcal_100g: calories,
      proteins_g_100g: protein,
      carbohydrates_g_100g: carbs,
      fats_g_100g: fat,
      allergens,
      allergen_info_known: food.allergen_info_known,
      gluten_status: food.gluten_status,
      lactose_status: food.lactose_status,
      validation_status: validate ? "verified" : "draft",
      updated_at: new Date().toISOString(),
    }).eq("id", food.id).eq("validation_status", "draft");
    setSaving("");
    if (saveError) { setError("Não foi possível salvar o alimento. Confira as permissões e tente novamente."); return; }
    setFoods((current) => current.map((item) => item.id === food.id ? { ...item, name, energy_kcal_100g: calories, proteins_g_100g: protein, carbohydrates_g_100g: carbs, fats_g_100g: fat, allergens, validation_status: validate ? "verified" : "draft" } : item));
    setNameDrafts((current) => ({ ...current, [food.id]: name }));
    setMessage(validate ? `${name} foi validado e já pode ser considerado pelo planejador.` : `Rascunho de ${name} salvo.`);
  }

  const drafts = foods.filter((food) => food.validation_status === "draft");
  const verified = foods.filter((food) => food.validation_status === "verified");

  return <AdminLayout>
    <PageIntro eyebrow="Nutrição" title="Biblioteca alimentar" description="Pesquise dados oficiais da USDA, importe-os como rascunhos e revise antes de disponibilizá-los ao planejamento alimentar." />
    <div className="space-y-6">
      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {message && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
      <SectionCard title="Buscar na USDA FoodData Central">
        <p className="text-sm text-slate-600">Você pode pesquisar em português: o termo é traduzido para inglês antes da consulta aos alimentos Foundation e SR Legacy. Ao importar, o nome recebe uma tradução automática para português, mantendo o nome oficial no registro de origem. Traduções são sugestões: revise-as junto com a identidade do alimento. Os dados continuam como rascunho; a USDA não fornece a confirmação de alergênicos usada pelo planejador.</p>
        <form onSubmit={(event) => void searchFoods(event)} className="mt-4 flex flex-col gap-3 sm:flex-row">
          <Input value={query} onChange={(event) => setQuery(event.target.value)} maxLength={100} placeholder="Ex.: banana, arroz integral, feijão" aria-label="Pesquisar alimento na USDA" />
          <Button type="submit" disabled={searching} className="bg-[#2f8f82] hover:bg-[#26786e]">{searching ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Search className="mr-2 size-4" />}Pesquisar</Button>
        </form>
        <p className="mt-2 text-xs text-slate-500">Fonte: USDA FoodData Central. Os resultados representam a descrição e os nutrientes publicados pela fonte; confira se correspondem à preparação desejada. Para uso frequente, configure uma chave própria `USDA_FDC_API_KEY` como secret da Edge Function.</p>
        {results.length > 0 && <div className="mt-4 space-y-3">{results.map((food) => {
          const existing = foods.find((item) => item.source_code === food.source_code);
          const complete = food.energy_kcal_100g !== null && food.proteins_g_100g !== null && food.carbohydrates_g_100g !== null;
          return <div key={food.source_code} className="flex flex-col justify-between gap-3 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center"><div><p className="font-medium text-slate-800">{food.name}</p><p className="mt-1 text-xs text-slate-500">{food.category} · FDC {food.source_code} · {complete ? `${food.energy_kcal_100g} kcal, P ${food.proteins_g_100g} g, C ${food.carbohydrates_g_100g} g por 100 g` : "Nutrientes básicos incompletos"}</p></div><Button type="button" variant="outline" disabled={!complete || Boolean(existing) || importing === food.source_code} onClick={() => void importDraft(food)}>{importing === food.source_code ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Database className="mr-2 size-4" />}{existing ? "Já importado" : "Importar rascunho"}</Button></div>;
        })}</div>}
      </SectionCard>

      <SectionCard title={`Rascunhos para revisão (${drafts.length})`}>
        <p className="mb-4 text-sm text-slate-600">Confira os valores por 100 g e a identidade do alimento. Para a confirmação de alergênicos, use informação confiável específica do alimento; não deduza ausência a partir de dados incompletos.</p>
        {drafts.length === 0 ? <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">Nenhum rascunho importado.</p> : <div className="space-y-4">{drafts.map((food) => <article key={food.id} className="rounded-xl border border-amber-200 bg-amber-50/40 p-4">
          <div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="font-semibold text-slate-800">{nameDrafts[food.id] || food.name}</h3><p className="text-xs text-slate-500">{food.source} · FDC {food.source_code} · {food.category}</p><p className="mt-1 text-xs text-slate-500">{food.import_notes}</p></div><span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800">Rascunho — não usado em planos</span></div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="sm:col-span-2 lg:col-span-4"><Label htmlFor={`${food.id}-name`}>Nome em português (revise a tradução)</Label><Input id={`${food.id}-name`} value={nameDrafts[food.id] ?? food.name} onChange={(event) => setNameDrafts((current) => ({ ...current, [food.id]: event.target.value }))} /></div>
            {[ ["energy_kcal_100g", "Energia (kcal/100 g)"], ["proteins_g_100g", "Proteína (g/100 g)"], ["carbohydrates_g_100g", "Carboidratos (g/100 g)"], ["fats_g_100g", "Gorduras (g/100 g)"] ].map(([key, label]) => <div key={key}><Label htmlFor={`${food.id}-${key}`}>{label}</Label><Input id={`${food.id}-${key}`} type="number" min="0" step="0.01" value={food[key as keyof FoodRow] == null ? "" : String(food[key as keyof FoodRow])} onChange={(event) => editFood(food.id, key as keyof FoodRow, event.target.value === "" && key === "fats_g_100g" ? null : numberValue(event.target.value))} /></div>)}
            <div className="sm:col-span-2"><Label htmlFor={`${food.id}-allergens`}>Alergênicos identificados (separados por vírgula)</Label><Textarea id={`${food.id}-allergens`} value={allergenDrafts[food.id] ?? ""} onChange={(event) => setAllergenDrafts((current) => ({ ...current, [food.id]: event.target.value }))} placeholder="Deixe vazio somente se confirmou que não há" /></div>
            <div><Label>Status do glúten</Label><Select value={food.gluten_status} onValueChange={(value) => editFood(food.id, "gluten_status", value as FoodRow["gluten_status"])}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="unknown">Não confirmado</SelectItem><SelectItem value="free">Livre — confirmado</SelectItem><SelectItem value="contains">Contém</SelectItem></SelectContent></Select></div>
            <div><Label>Status da lactose</Label><Select value={food.lactose_status} onValueChange={(value) => editFood(food.id, "lactose_status", value as FoodRow["lactose_status"])}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="unknown">Não confirmado</SelectItem><SelectItem value="free">Livre — confirmado</SelectItem><SelectItem value="contains">Contém</SelectItem></SelectContent></Select></div>
          </div>
          <label className="mt-4 flex items-start gap-2 text-sm text-slate-700"><input type="checkbox" checked={food.allergen_info_known} onChange={(event) => editFood(food.id, "allergen_info_known", event.target.checked)} className="mt-1" /><span>Revisei os alergênicos em uma fonte confiável específica deste alimento. Marque mesmo quando a lista estiver vazia, somente se a ausência foi confirmada.</span></label>
          <div className="mt-4 flex flex-wrap gap-2"><Button type="button" variant="outline" disabled={saving === food.id} onClick={() => void saveFood(food, false)}>{saving === food.id ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}Salvar rascunho</Button><Button type="button" disabled={saving === food.id || !food.allergen_info_known} onClick={() => void saveFood(food, true)} className="bg-[#2f8f82] hover:bg-[#26786e]">{saving === food.id ? <Loader2 className="mr-2 size-4 animate-spin" /> : <ShieldCheck className="mr-2 size-4" />}Validar alimento</Button></div>
        </article>)}</div>}
      </SectionCard>

      <SectionCard title={`Alimentos verificados (${verified.length})`}>
        {verified.length === 0 ? <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">Nenhum alimento verificado. Após revisar e validar um rascunho, ele ficará disponível no planejador.</p> : <div className="space-y-2">{verified.map((food) => <div key={food.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-emerald-200 bg-emerald-50/50 p-3"><span className="font-medium text-slate-800">{food.name}<span className="ml-2 text-xs font-normal text-slate-500">{food.source} · FDC {food.source_code}</span></span><span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-800"><Check className="size-4" />Verificado</span></div>)}</div>}
      </SectionCard>
    </div>
  </AdminLayout>;
}
