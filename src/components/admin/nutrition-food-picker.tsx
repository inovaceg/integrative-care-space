import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { isTrustedNutritionSource, scaleNutritionPer100g } from "@/lib/admin/nutrition-calculations";

type Food = {
  id: string;
  name: string;
  energy_kcal_100g: number;
  proteins_g_100g: number;
  carbohydrates_g_100g: number;
  fats_g_100g: number | null;
  household_measure: string;
  allergens: string[];
  allergen_info_known: boolean;
  gluten_status: string;
  lactose_status: string;
  source: string;
  license: string;
  source_code: string | null;
};

export type PlannedFood = {
  food: string;
  portion: string;
  calories_kcal: number;
  calories_source: string;
  protein_g: number;
  protein_source: string;
  carbohydrate_g: number;
  carbohydrate_source: string;
  fat_g?: number;
  fat_source?: string;
  alternatives: string[];
  food_library_id: string;
  quantity_g: number;
  nutrition_per_100g: { calories_kcal: number; protein_g: number; carbohydrate_g: number; fat_g: number | null };
};

const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");

export function NutritionFoodPicker({ allergies, intolerances, onAdd, disabled }: {
  allergies: string;
  intolerances: string;
  onAdd: (mealName: string, item: PlannedFood) => void;
  disabled?: boolean;
}) {
  const [foods, setFoods] = useState<Food[]>([]);
  const [foodId, setFoodId] = useState("");
  const [foodSearch, setFoodSearch] = useState("");
  const [mealName, setMealName] = useState("Café da manhã");
  const [grams, setGrams] = useState("100");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void supabase.from("nutrition_food_library")
      .select("id,name,energy_kcal_100g,proteins_g_100g,carbohydrates_g_100g,fats_g_100g,household_measure,allergens,allergen_info_known,gluten_status,lactose_status,source,license,source_code")
      .eq("validation_status", "verified")
      .order("name")
      .then(({ data, error: queryError }) => {
        if (!active) return;
        if (queryError) setError("Não foi possível carregar os alimentos validados.");
        else setFoods((data as Food[] | null) ?? []);
        setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const safeFoods = useMemo(() => {
    const normalizedAllergies = normalize(allergies.trim());
    const noKnownAllergies = /^(nenhum(a)?|nao|sem alergias?)$/.test(normalizedAllergies);
    const allergyTerms = noKnownAllergies ? [] : allergies.split(/[,;\n]|\s+e\s+/i).map(normalize).map((term) => term.trim()).filter(Boolean);
    const intoleranceText = normalize(intolerances);
    return foods.filter((food) => {
      if (!isTrustedNutritionSource(food.source) || !food.license.trim()) return false;
      const foodAllergens = food.allergens.map(normalize).filter(Boolean);
      if (allergyTerms.length && (!food.allergen_info_known || allergyTerms.some((term) => foodAllergens.some((allergen) => allergen.includes(term) || term.includes(allergen))))) return false;
      if (/gluten|trigo|cevada|centeio/.test(intoleranceText) && food.gluten_status !== "free") return false;
      if (/lactose|leite/.test(intoleranceText) && food.lactose_status !== "free") return false;
      return true;
    });
  }, [foods, allergies, intolerances]);

  const matchingFoods = useMemo(() => {
    const term = normalize(foodSearch.trim());
    return term ? safeFoods.filter((food) => normalize(food.name).includes(term)) : safeFoods;
  }, [safeFoods, foodSearch]);
  const selected = safeFoods.find((food) => food.id === foodId);
  const quantity = Number(grams.replace(",", "."));
  const quantityValid = Number.isFinite(quantity) && quantity > 0 && quantity <= 2000;
  const add = () => {
    if (!selected || !quantityValid || !mealName.trim()) return;
    const calories = scaleNutritionPer100g(selected.energy_kcal_100g, quantity);
    const protein = scaleNutritionPer100g(selected.proteins_g_100g, quantity);
    const carbohydrate = scaleNutritionPer100g(selected.carbohydrates_g_100g, quantity);
    if (calories === null || protein === null || carbohydrate === null) return;
    const fat = scaleNutritionPer100g(selected.fats_g_100g, quantity);
    const source = `${selected.source}${selected.source_code ? ` · ${selected.source_code}` : ""}; ${selected.license}`;
    onAdd(mealName.trim(), {
      food: selected.name,
      portion: `${quantity} g${selected.household_measure ? ` (referência cadastrada: ${selected.household_measure})` : ""}`,
      calories_kcal: calories,
      calories_source: source,
      protein_g: protein,
      protein_source: source,
      carbohydrate_g: carbohydrate,
      carbohydrate_source: source,
      ...(fat === null ? {} : { fat_g: fat, fat_source: source }),
      alternatives: [],
      food_library_id: selected.id,
      quantity_g: quantity,
      nutrition_per_100g: { calories_kcal: selected.energy_kcal_100g, protein_g: selected.proteins_g_100g, carbohydrate_g: selected.carbohydrates_g_100g, fat_g: selected.fats_g_100g },
    });
  };

  return <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
    <h3 className="font-semibold text-slate-800">Adicionar alimento da biblioteca validada</h3>
    <p className="mt-1 text-xs text-slate-500">Composição calculada proporcionalmente aos valores por 100 g. A medida caseira cadastrada é apenas informativa; não há conversão automática para gramas.</p>
    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <div><Label>Refeição</Label><Select value={mealName} onValueChange={setMealName}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{["Café da manhã", "Lanche da manhã", "Almoço", "Lanche da tarde", "Jantar", "Ceia"].map((name) => <SelectItem key={name} value={name}>{name}</SelectItem>)}</SelectContent></Select></div>
      <div><Label htmlFor="food-search">Pesquisar alimento</Label><Input id="food-search" className="mt-1" value={foodSearch} onChange={(event) => setFoodSearch(event.target.value)} placeholder="Ex.: arroz" /></div>
      <div><Label>Alimento verificado</Label><Select value={foodId} onValueChange={setFoodId}><SelectTrigger className="mt-1"><SelectValue placeholder={loading ? "Carregando..." : "Selecione"} /></SelectTrigger><SelectContent>{matchingFoods.map((food) => <SelectItem key={food.id} value={food.id}>{food.name}</SelectItem>)}</SelectContent></Select><p className="mt-1 text-xs text-slate-500">{matchingFoods.length} de {safeFoods.length} alimento(s) compatível(is) com as restrições registradas.</p></div>
      <div><Label htmlFor="food-grams">Quantidade (g)</Label><Input id="food-grams" className="mt-1" inputMode="decimal" value={grams} onChange={(event) => setGrams(event.target.value)} /></div>
      <div className="flex items-end"><Button type="button" className="w-full" disabled={disabled || !selected || !quantityValid} onClick={add}><Plus className="mr-2 size-4" />Adicionar à refeição</Button></div>
    </div>
    {selected && <p className="mt-3 text-xs text-slate-600">Fonte: {selected.source || "não informada"} · Licença: {selected.license || "não informada"}{selected.allergens.length ? ` · Alergênicos: ${selected.allergens.join(", ")}` : ""}</p>}
    {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
    {!loading && !safeFoods.length && <p className="mt-2 text-sm text-amber-800">Nenhum alimento validado compatível foi encontrado. Não substituímos nem estimamos dados ausentes.</p>}
  </section>;
}
