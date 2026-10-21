import { createFileRoute, Link } from "@tanstack/react-router";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Plus, Search, Sparkles, Utensils, X } from "lucide-react";
import { AdminLayout, PageIntro, SectionCard } from "@/components/admin/admin-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { demoFoods, demoMealTemplates, generateDemoPlan, isDemoFoodAllowed, parseDemoFoodCsv, recalculateDemoPlan, type DemoFood, type DemoGenerationInput, type DemoMealTemplate, type DemoPlan } from "@/lib/admin/nutrition-demo-engine";

export const Route = createFileRoute("/admin/biblioteca-nutricional-demo")({ component: NutritionLibraryDemoPage });

type DemoMealRecord = DemoMealTemplate & { status: "draft" | "demo_validated" };
type FoodForm = { name: string; category: string; kcal: string; protein: string; carbs: string; fat: string; measure: string; allergens: string; gluten: "free" | "contains" | "unknown"; lactose: "free" | "contains" | "unknown"; source: string; license: string };
const blankFood: FoodForm = { name: "", category: "", kcal: "", protein: "", carbs: "", fat: "", measure: "", allergens: "", gluten: "unknown", lactose: "unknown", source: "", license: "" };
const storeKey = "nutrition-library-demo:v1";
const normalized = (value: string) => value.trim().toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "");

function readDemoStore(): { foods: DemoFood[]; meals: DemoMealRecord[] } {
  try {
    const saved = JSON.parse(window.localStorage.getItem(storeKey) ?? "null");
    if (Array.isArray(saved?.foods) && Array.isArray(saved?.meals)) return saved;
  } catch { /* use isolated demo fixtures */ }
  return { foods: demoFoods.map((food) => ({ ...food, allergens: [...food.allergens], restrictions: [...food.restrictions] })), meals: demoMealTemplates.map((meal) => ({ ...meal, items: meal.items.map((item) => ({ ...item, alternatives: [...item.alternatives] })), status: "demo_validated" })) };
}

function NutritionLibraryDemoPage() {
  const [foods, setFoods] = useState<DemoFood[]>([]);
  const [meals, setMeals] = useState<DemoMealRecord[]>([]);
  const [foodForm, setFoodForm] = useState<FoodForm>(blankFood);
  const [editingFoodId, setEditingFoodId] = useState<string | null>(null);
  const [foodQuery, setFoodQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [csvFile, setCsvFile] = useState("");
  const [csvParsed, setCsvParsed] = useState<ReturnType<typeof parseDemoFoodCsv> | null>(null);
  const [mealName, setMealName] = useState("");
  const [editingMealId, setEditingMealId] = useState<string | null>(null);
  const [mealCategory, setMealCategory] = useState("Lanche");
  const [mealTime, setMealTime] = useState("16:00");
  const [mealFoodId, setMealFoodId] = useState("");
  const [mealGrams, setMealGrams] = useState("100");
  const [mealItems, setMealItems] = useState<DemoMealTemplate["items"]>([]);
  const [planDays, setPlanDays] = useState("1");
  const [targetKcal, setTargetKcal] = useState("1600");
  const [targetProtein, setTargetProtein] = useState("90");
  const [allergies, setAllergies] = useState<string[]>([]);
  const [restrictions, setRestrictions] = useState<string[]>([]);
  const [reviewConfirmed, setReviewConfirmed] = useState(false);
  const [plan, setPlan] = useState<DemoPlan | null>(null);
  const [generationError, setGenerationError] = useState("");

  useEffect(() => {
    const stored = readDemoStore();
    setFoods(stored.foods);
    setMeals(stored.meals);
  }, []);
  useEffect(() => {
    if (foods.length || meals.length) window.localStorage.setItem(storeKey, JSON.stringify({ foods, meals }));
  }, [foods, meals]);

  const categories = useMemo(() => [...new Set(foods.map((food) => food.category))].sort((a, b) => a.localeCompare(b, "pt-BR")), [foods]);
  const filteredFoods = foods.filter((food) => normalized(food.name).includes(normalized(foodQuery)) && (categoryFilter === "all" || food.category === categoryFilter));
  const uniqueNameDuplicate = (name: string, exceptId?: string) => foods.some((food) => food.id !== exceptId && normalized(food.name) === normalized(name));
  const existingCsvDuplicates = csvParsed?.rows.filter((row) => uniqueNameDuplicate(row.nome)).map((row) => row.nome) ?? [];

  function resetFoodForm() { setFoodForm(blankFood); setEditingFoodId(null); }
  function saveFood(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!foodForm.name.trim() || !foodForm.category.trim() || uniqueNameDuplicate(foodForm.name, editingFoodId)) return;
    const previous = foods.find((food) => food.id === editingFoodId);
    const next: DemoFood = {
      id: previous?.id ?? `local-${crypto.randomUUID()}`,
      name: foodForm.name.trim(), category: foodForm.category.trim(),
      kcal100g: Number(foodForm.kcal), protein100g: Number(foodForm.protein), carbs100g: Number(foodForm.carbs), fat100g: Number(foodForm.fat),
      householdMeasure: foodForm.measure.trim() || "Medida não cadastrada",
      allergens: foodForm.allergens.split(",").map((value) => value.trim().toLocaleLowerCase("pt-BR")).filter((value) => value && value !== "nenhum"), allergenInfoKnown: Boolean(foodForm.allergens.trim()), restrictions: [],
      gluten: foodForm.gluten, lactose: foodForm.lactose, source: foodForm.source.trim() || "DADO FICTÍCIO LOCAL", license: foodForm.license.trim() || "Não verificada — demonstração",
      status: "draft", demoOnly: true,
    };
    if (![next.kcal100g, next.protein100g, next.carbs100g, next.fat100g].every((value) => Number.isFinite(value) && value >= 0)) return;
    setFoods((current) => previous ? current.map((food) => food.id === previous.id ? next : food) : [...current, next]);
    resetFoodForm();
  }
  function editFood(food: DemoFood) {
    setEditingFoodId(food.id);
    setFoodForm({ name: food.name, category: food.category, kcal: String(food.kcal100g), protein: String(food.protein100g), carbs: String(food.carbs100g), fat: String(food.fat100g), measure: food.householdMeasure, allergens: food.allergens.join(", "), gluten: food.gluten, lactose: food.lactose, source: food.source, license: food.license });
  }

  function handleCsvFile(file?: File) {
    if (!file) return;
    setCsvFile(file.name);
    const reader = new FileReader();
    reader.onload = () => setCsvParsed(parseDemoFoodCsv(String(reader.result ?? "")));
    reader.readAsText(file);
  }
  function importCsvRows() {
    if (!csvParsed) return;
    const blockedLines = new Set(csvParsed.errors.map((error) => Number(error.match(/Linha (\d+)/)?.[1])).filter(Number.isFinite));
    const duplicatedNames = new Set(csvParsed.duplicates.map((item) => normalized(item.match(/“(.*)”/)?.[1] ?? "")));
    const toAdd: DemoFood[] = [];
    csvParsed.rows.forEach((row, index) => {
      const rowName = row.nome ?? "";
      if (blockedLines.has(index + 2) || duplicatedNames.has(normalized(rowName)) || uniqueNameDuplicate(rowName)) return;
      const numeric = (key: string) => Number((row[key] ?? "").replace(",", "."));
      toAdd.push({ id: `csv-${crypto.randomUUID()}`, name: (row.nome ?? "").trim(), category: (row.categoria ?? "").trim(), kcal100g: numeric("calorias_kcal_100g"), protein100g: numeric("proteina_g_100g"), carbs100g: numeric("carboidrato_g_100g"), fat100g: numeric("gordura_g_100g"), householdMeasure: row.medida_caseira || "Não informada", allergens: (row.alergenicos || "").split(/[|;]/).map((value) => value.trim().toLocaleLowerCase("pt-BR")).filter((value) => value && value !== "nenhum"), allergenInfoKnown: Boolean(row.alergenicos?.trim()), restrictions: [], gluten: (row.gluten_status as DemoFood["gluten"]) || "unknown", lactose: (row.lactose_status as DemoFood["lactose"]) || "unknown", source: (row.fonte ?? "").trim(), license: (row.licenca ?? "").trim(), status: "draft", demoOnly: true });
    });
    setFoods((current) => [...current, ...toAdd]);
    setCsvParsed(null);
    setCsvFile("");
  }

  function addMealItem() {
    const grams = Number(mealGrams);
    if (!foods.some((food) => food.id === mealFoodId) || !Number.isFinite(grams) || grams <= 0) return;
    setMealItems((current) => [...current, { foodId: mealFoodId, grams, alternatives: [] }]);
    setMealFoodId("");
    setMealGrams("100");
  }
  function saveMeal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!mealName.trim() || !mealItems.length) return;
    setMeals((current) => editingMealId
      ? current.map((meal) => meal.id === editingMealId ? { ...meal, name: mealName.trim(), category: mealCategory, time: mealTime, items: mealItems, status: "draft" } : meal)
      : [...current, { id: `local-meal-${crypto.randomUUID()}`, name: mealName.trim(), category: mealCategory, time: mealTime, items: mealItems, status: "draft" }]);
    setMealName("");
    setEditingMealId(null);
    setMealItems([]);
  }
  function editMeal(meal: DemoMealRecord) {
    setEditingMealId(meal.id);
    setMealName(meal.name);
    setMealCategory(meal.category);
    setMealTime(meal.time);
    setMealItems(meal.items.map((item) => ({ ...item, alternatives: [...item.alternatives] })));
  }
  function generateLocalPlan() {
    setGenerationError("");
    setPlan(null);
    try {
      const input: DemoGenerationInput = { days: Number(planDays), targetKcal: targetKcal ? Number(targetKcal) : null, targetProtein: targetProtein ? Number(targetProtein) : null, allergies, restrictions, clinicalReviewConfirmed: reviewConfirmed };
      const approvedDemoTemplates = meals.filter((meal) => meal.status === "demo_validated").map(({ status: _status, ...meal }) => meal);
      setPlan(generateDemoPlan(input, foods, approvedDemoTemplates));
    } catch (error) {
      setGenerationError(error instanceof Error ? error.message : "Não foi possível gerar a simulação.");
    }
  }
  function updatePlanItem(dayIndex: number, mealIndex: number, itemIndex: number, patch: { grams?: number; foodId?: string }) {
    setPlan((current) => {
      if (!current) return current;
      const changed = structuredClone(current);
      const item = changed.days[dayIndex]?.meals[mealIndex]?.items[itemIndex];
      if (!item) return current;
      if (patch.grams !== undefined && Number.isFinite(patch.grams) && patch.grams > 0) item.grams = patch.grams;
      if (patch.foodId) {
        const replacement = foods.find((food) => food.id === patch.foodId);
        if (!replacement || !isDemoFoodAllowed(replacement, allergies, restrictions)) return current;
        item.foodId = patch.foodId;
      }
      return recalculateDemoPlan(changed, foods);
    });
  }

  return <AdminLayout>
    <PageIntro eyebrow="Demonstração isolada" title="Biblioteca Nutricional" description="Protótipo local para cadastro, CSV e simulação determinística. Não usa nem salva dados de pacientes." />
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
      <p><strong>AMBIENTE DEMONSTRATIVO:</strong> catálogo e composições são fictícios, ficam somente neste navegador e não são dados verificados nem utilizáveis em planos reais.</p>
      <Link to="/admin/planejamento-alimentar" className="inline-flex items-center gap-2 font-medium underline"><ArrowLeft className="size-4" /> Voltar ao planejamento</Link>
    </div>
    <SectionCard title="Biblioteca local — sem banco de dados">
      <Tabs defaultValue="generator">
        <TabsList className="grid h-auto w-full grid-cols-3"><TabsTrigger value="foods">Alimentos ({foods.length})</TabsTrigger><TabsTrigger value="meals">Refeições ({meals.length})</TabsTrigger><TabsTrigger value="generator">Gerador demonstrativo</TabsTrigger></TabsList>
        <TabsContent value="foods" className="space-y-6 pt-4">
          <form onSubmit={saveFood} className="grid gap-3 rounded-xl border p-4 sm:grid-cols-2 lg:grid-cols-4">
            <h2 className="font-semibold sm:col-span-2 lg:col-span-4">{editingFoodId ? "Editar alimento local" : "Cadastrar alimento local"}</h2>
            <div><Label>Nome</Label><Input required value={foodForm.name} onChange={(event) => setFoodForm({ ...foodForm, name: event.target.value })} /></div>
            <div><Label>Categoria</Label><Input required value={foodForm.category} onChange={(event) => setFoodForm({ ...foodForm, category: event.target.value })} placeholder="Ex.: Cereais" /></div>
            {[["kcal", "Calorias kcal/100 g"], ["protein", "Proteínas g/100 g"], ["carbs", "Carboidratos g/100 g"], ["fat", "Gorduras g/100 g"]].map(([key, label]) => <div key={key}><Label>{label}</Label><Input required min="0" step="any" type="number" value={foodForm[key as keyof FoodForm]} onChange={(event) => setFoodForm({ ...foodForm, [key]: event.target.value })} /></div>)}
            <div><Label>Medida caseira e peso</Label><Input value={foodForm.measure} onChange={(event) => setFoodForm({ ...foodForm, measure: event.target.value })} placeholder="1 unidade = 100 g" /></div>
            <div><Label>Alergênicos (separados por vírgula)</Label><Input value={foodForm.allergens} onChange={(event) => setFoodForm({ ...foodForm, allergens: event.target.value })} /></div>
            <div><Label>Glúten</Label><select className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm" value={foodForm.gluten} onChange={(event) => setFoodForm({ ...foodForm, gluten: event.target.value as FoodForm["gluten"] })}><option value="unknown">Desconhecido</option><option value="free">Livre (demo)</option><option value="contains">Contém</option></select></div>
            <div><Label>Lactose</Label><select className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm" value={foodForm.lactose} onChange={(event) => setFoodForm({ ...foodForm, lactose: event.target.value as FoodForm["lactose"] })}><option value="unknown">Desconhecido</option><option value="free">Livre (demo)</option><option value="contains">Contém</option></select></div>
            <div><Label>Fonte (demo)</Label><Input value={foodForm.source} onChange={(event) => setFoodForm({ ...foodForm, source: event.target.value })} /></div>
            <div><Label>Licença/condição de uso (demo)</Label><Input value={foodForm.license} onChange={(event) => setFoodForm({ ...foodForm, license: event.target.value })} /></div>
            <div className="flex items-end gap-2"><Button type="submit"><Plus className="mr-2 size-4" />{editingFoodId ? "Salvar edição local" : "Adicionar rascunho"}</Button>{editingFoodId && <Button type="button" variant="outline" onClick={resetFoodForm}><X className="size-4" /></Button>}</div>
            {uniqueNameDuplicate(foodForm.name, editingFoodId) && <p className="text-sm text-red-700 sm:col-span-2 lg:col-span-4">Já existe um alimento local com esse nome.</p>}
          </form>
          <div className="grid gap-3 rounded-xl border p-4 md:grid-cols-[1fr_220px]">
            <div><Label>Importar CSV para pré-visualização</Label><Input className="mt-1" type="file" accept=".csv,text/csv" onChange={(event) => handleCsvFile(event.target.files?.[0])} /></div>
            <p className="self-end text-xs text-slate-500">Importação somente local; novas linhas entram como rascunho de demonstração.</p>
            {csvFile && <p className="text-sm md:col-span-2">Arquivo: {csvFile}</p>}
            {csvParsed && <div className="space-y-3 md:col-span-2">
              {csvParsed.errors.length > 0 && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{csvParsed.errors.map((error) => <p key={error}>{error}</p>)}</div>}
              {csvParsed.duplicates.length > 0 && <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Duplicidades no arquivo: {csvParsed.duplicates.map((item) => <p key={item}>{item}</p>)}</div>}
              {existingCsvDuplicates.length > 0 && <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Já existem no catálogo local (serão ignorados): {[...new Set(existingCsvDuplicates)].map((name) => <p key={name}>{name}</p>)}</div>}
              <div className="max-h-56 overflow-auto rounded-lg border"><table className="w-full text-left text-xs"><thead><tr>{Object.keys(csvParsed.rows[0] ?? {}).map((header) => <th className="p-2" key={header}>{header}</th>)}</tr></thead><tbody>{csvParsed.rows.map((row, index) => <tr className="border-t" key={index}>{Object.values(row).map((value, i) => <td className="p-2" key={i}>{value}</td>)}</tr>)}</tbody></table></div>
              <Button type="button" onClick={importCsvRows} disabled={!csvParsed.rows.length || csvParsed.errors.length > 0}>Importar linhas válidas como rascunho</Button>
            </div>}
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="relative min-w-56 flex-1"><Search className="absolute left-3 top-3 size-4 text-slate-400" /><Input className="pl-9" value={foodQuery} onChange={(event) => setFoodQuery(event.target.value)} placeholder="Pesquisar alimento" /></div>
            <select className="h-10 rounded-md border bg-background px-3 text-sm" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}><option value="all">Todas as categorias</option>{categories.map((category) => <option key={category}>{category}</option>)}</select>
          </div>
          <div className="space-y-3">{filteredFoods.map((food) => <article key={food.id} className="rounded-xl border p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold">{food.name}</h3><p className="text-xs text-slate-500">{food.category} · {food.status === "draft" ? "Rascunho demo" : "Validação demo — não verificada"}</p></div><div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => editFood(food)}>Editar</Button>{food.status === "draft" && <Button size="sm" variant="outline" onClick={() => setFoods((current) => current.map((item) => item.id === food.id ? { ...item, status: "demo_validated" } : item))}>Marcar validado (demo)</Button>}</div></div><div className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4"><span>{food.kcal100g} kcal/100 g</span><span>P {food.protein100g} g</span><span>C {food.carbs100g} g</span><span>G {food.fat100g} g</span></div><p className="mt-2 text-xs text-slate-500">Medida: {food.householdMeasure} · Alergênicos: {food.allergens.join(", ") || "não informados no dado demo"} · Glúten: {food.gluten} · Lactose: {food.lactose}</p><p className="mt-1 text-xs text-amber-700">{food.source} · {food.license} · Dado fictício; não usar clinicamente.</p></article>)}{!filteredFoods.length && <p className="text-sm text-slate-500">Nenhum alimento encontrado.</p>}</div>
        </TabsContent>
        <TabsContent value="meals" className="space-y-5 pt-4">
          <form onSubmit={saveMeal} className="grid gap-3 rounded-xl border p-4 md:grid-cols-2">
            <h2 className="font-semibold md:col-span-2">Cadastrar refeição local</h2>
            <div><Label>Nome da refeição</Label><Input required value={mealName} onChange={(event) => setMealName(event.target.value)} /></div>
            <div><Label>Categoria</Label><select className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm" value={mealCategory} onChange={(event) => setMealCategory(event.target.value)}>{["Desjejum", "Almoço", "Jantar", "Lanche"].map((item) => <option key={item}>{item}</option>)}</select></div>
            <div><Label>Horário demonstrativo</Label><Input type="time" value={mealTime} onChange={(event) => setMealTime(event.target.value)} /></div>
            <div className="grid grid-cols-[1fr_110px_auto] items-end gap-2"><div><Label>Alimento</Label><select className="mt-1 h-10 w-full rounded-md border bg-background px-2 text-sm" value={mealFoodId} onChange={(event) => setMealFoodId(event.target.value)}><option value="">Selecionar</option>{foods.map((food) => <option key={food.id} value={food.id}>{food.name}</option>)}</select></div><div><Label>Gramas</Label><Input type="number" min="1" value={mealGrams} onChange={(event) => setMealGrams(event.target.value)} /></div><Button type="button" variant="outline" onClick={addMealItem}>Adicionar</Button></div>
            {mealItems.length > 0 && <div className="space-y-2 md:col-span-2">{mealItems.map((item, index) => <div className="flex items-center justify-between rounded-md bg-slate-50 p-2 text-sm" key={`${item.foodId}-${index}`}>{foods.find((food) => food.id === item.foodId)?.name} · {item.grams} g<Button type="button" size="sm" variant="ghost" onClick={() => setMealItems((current) => current.filter((_, currentIndex) => currentIndex !== index))}>Remover</Button></div>)}</div>}
            <Button type="submit" disabled={!mealItems.length}><Utensils className="mr-2 size-4" />{editingMealId ? "Salvar edição como rascunho" : "Salvar refeição como rascunho"}</Button>{editingMealId && <Button type="button" variant="outline" onClick={() => { setEditingMealId(null); setMealName(""); setMealItems([]); }}>Cancelar edição</Button>}
          </form>
          <div className="space-y-3">{meals.map((meal) => <article key={meal.id} className="rounded-xl border p-4"><div className="flex flex-wrap justify-between gap-3"><div><h3 className="font-semibold">{meal.name}</h3><p className="text-sm text-slate-500">{meal.category} · {meal.time} · {meal.status === "draft" ? "Rascunho demo" : "Validada (demo; não verificada)"}</p></div><div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => editMeal(meal)}>Editar</Button>{meal.status === "draft" && <Button size="sm" variant="outline" onClick={() => setMeals((current) => current.map((item) => item.id === meal.id ? { ...item, status: "demo_validated" } : item))}>Marcar validada (demo)</Button>}</div></div><ul className="mt-3 list-inside list-disc text-sm">{meal.items.map((item) => <li key={`${item.foodId}-${item.grams}`}>{foods.find((food) => food.id === item.foodId)?.name ?? "Alimento removido"} — {item.grams} g</li>)}</ul></article>)}</div>
        </TabsContent>
        <TabsContent value="generator" className="space-y-5 pt-4">
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950"><strong>Gerador de teste local:</strong> usa apenas composições fictícias selecionadas como “validadas (demo)”. As metas e proporções abaixo são entradas de teste, não recomendações nem prescrição. O resultado nunca é salvo no perfil de paciente.</div>
          <div className="grid gap-4 rounded-xl border p-4 sm:grid-cols-2 lg:grid-cols-4">
            <div><Label>Duração</Label><select className="mt-1 h-10 w-full rounded-md border bg-background px-3" value={planDays} onChange={(event) => setPlanDays(event.target.value)}><option value="1">1 dia</option><option value="3">3 dias</option><option value="7">7 dias</option></select></div>
            <div><Label>Alvo demo kcal/dia</Label><Input type="number" min="500" value={targetKcal} onChange={(event) => setTargetKcal(event.target.value)} /></div>
            <div><Label>Alvo demo proteína g/dia</Label><Input type="number" min="1" value={targetProtein} onChange={(event) => setTargetProtein(event.target.value)} /></div>
            <div className="flex items-end"><Button className="w-full" onClick={generateLocalPlan}><Sparkles className="mr-2 size-4" />Gerar simulação local</Button></div>
            <fieldset className="space-y-2 sm:col-span-2"><legend className="text-sm font-medium">Alergênicos para testar</legend>{["glúten", "leite", "peixe"].map((item) => <label className="mr-4 inline-flex items-center gap-2 text-sm" key={item}><input type="checkbox" checked={allergies.includes(item)} onChange={(event) => setAllergies((current) => event.target.checked ? [...current, item] : current.filter((value) => value !== item))} />{item}</label>)}</fieldset>
            <fieldset className="space-y-2 sm:col-span-2"><legend className="text-sm font-medium">Restrições para teste</legend>{["sem glúten", "sem lactose"].map((item) => <label className="mr-4 inline-flex items-center gap-2 text-sm" key={item}><input type="checkbox" checked={restrictions.includes(item)} onChange={(event) => setRestrictions((current) => event.target.checked ? [...current, item] : current.filter((value) => value !== item))} />{item}</label>)}</fieldset>
            <label className="flex items-start gap-2 text-sm sm:col-span-2 lg:col-span-4"><input type="checkbox" checked={reviewConfirmed} onChange={(event) => setReviewConfirmed(event.target.checked)} /><span>Confirmo apenas para esta simulação fictícia que os itens acima foram revisados; isso não representa revisão clínica real.</span></label>
          </div>
          {generationError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{generationError}</p>}
          {plan && <div className="space-y-4"><p className="rounded-lg bg-amber-100 p-3 text-center text-sm font-bold text-amber-950">{plan.label}</p>{plan.days.map((day, dayIndex) => <section className="rounded-xl border p-4" key={day.day}><h2 className="text-lg font-semibold">Dia demonstrativo {day.day}</h2><div className="mt-3 space-y-4">{day.meals.map((meal, mealIndex) => <article className="rounded-lg bg-slate-50 p-4" key={`${day.day}-${meal.id}`}><div className="flex flex-wrap justify-between gap-2"><div><h3 className="font-semibold">{meal.name}</h3><p className="text-xs text-slate-500">{meal.time} · {meal.category}</p></div><p className="text-xs">{meal.totals.kcal} kcal · P {meal.totals.protein} g · C {meal.totals.carbs} g · G {meal.totals.fat} g</p></div><div className="mt-3 space-y-2">{meal.items.map((item, itemIndex) => { const food = foods.find((candidate) => candidate.id === item.foodId); const alternatives = item.alternatives.map((id) => foods.find((candidate) => candidate.id === id)).filter((candidate): candidate is DemoFood => Boolean(candidate && candidate.status === "demo_validated")); return <div className="grid gap-2 rounded-md border bg-white p-3 md:grid-cols-[1fr_120px_1fr]" key={`${item.foodId}-${itemIndex}`}><div><p className="text-sm font-medium">{food?.name ?? "Alimento indisponível"}</p><p className="text-xs text-slate-500">{food?.householdMeasure}</p></div><div><Label className="text-xs">Quantidade (g)</Label><Input min="1" type="number" value={item.grams} onChange={(event) => updatePlanItem(dayIndex, mealIndex, itemIndex, { grams: Number(event.target.value) })} /></div><div>{alternatives.length > 0 && <><Label className="text-xs">Substituir (opcional)</Label><select className="mt-1 h-10 w-full rounded-md border bg-background px-2 text-sm" value={item.foodId} onChange={(event) => updatePlanItem(dayIndex, mealIndex, itemIndex, { foodId: event.target.value })}><option value={item.foodId}>{food?.name ?? "Atual"}</option>{alternatives.map((alternative) => <option value={alternative.id} key={alternative.id}>{alternative.name}</option>)}</select></>}</div></div>; })}</div><p className="mt-3 border-t pt-3 text-xs font-medium">Totais do dia: {day.totals.kcal} kcal · Proteínas {day.totals.protein} g · Carboidratos {day.totals.carbs} g · Gorduras {day.totals.fat} g</p></article>)}</div></section>)}</div>}
        </TabsContent>
      </Tabs>
    </SectionCard>
  </AdminLayout>;
}
