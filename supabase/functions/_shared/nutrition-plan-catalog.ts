export type CatalogFoodReference = {
  id: string;
  source_code: string | null;
  name: string;
};

export type CatalogSuggestion = CatalogFoodReference & { score: number };
export type CatalogSelectionIssue = {
  meal: string;
  label: string;
  value: string;
  reason: string;
  suggestions?: CatalogSuggestion[];
};

type ProposedItem = Record<string, unknown>;
type ProposedMeal = { name: string; items: ProposedItem[] };

const normalizeName = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").replace(/[^a-z0-9]+/g, " ").trim();

export function findFoodNameSuggestions(query: string, catalog: CatalogFoodReference[]): CatalogSuggestion[] {
  const normalizedQuery = normalizeName(query);
  const queryTerms = [...new Set(normalizedQuery.split(" ").filter((term) => term.length > 1))];
  if (!queryTerms.length) return [];
  const preparationGroups = [["cru", "crua"], ["cozido", "cozida"], ["assado", "assada"], ["frito", "frita"], ["grelhado", "grelhada"], ["refogado", "refogada"]];
  const queryPreparation = preparationGroups.find((group) => group.some((term) => queryTerms.includes(term)));
  const contrasts = [["branco", "integral"], ["tipo 1", "tipo 2"], ["com sal", "sem sal"], ["desnatado", "integral"]];
  return catalog.map((food) => {
    const normalizedName = normalizeName(food.name);
    if (queryPreparation && !queryPreparation.some((term) => normalizedName.split(" ").includes(term))) return null;
    if (contrasts.some(([left, right]) => (normalizedQuery.includes(left) && normalizedName.includes(right)) || (normalizedQuery.includes(right) && normalizedName.includes(left)))) return null;
    const nameTerms = new Set(normalizedName.split(" "));
    const matches = queryTerms.filter((term) => nameTerms.has(term)).length;
    const score = matches / queryTerms.length;
    return score < 0.5 ? null : { ...food, score };
  }).filter((food): food is CatalogSuggestion => food !== null).sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, "pt-BR")).slice(0, 5);
}

export function validateFoodSelections(meals: ProposedMeal[], catalog: CatalogFoodReference[]): CatalogSelectionIssue[] {
  const byId = new Map(catalog.map((food) => [food.id, food]));
  const byCode = new Map(catalog.filter((food) => food.source_code !== null).map((food) => [food.source_code!, food]));
  const issues: CatalogSelectionIssue[] = [];
  for (const meal of meals) {
    for (const item of meal.items) {
      const foodId = item.food_id;
      const providedName = typeof item.food_name === "string" ? item.food_name : typeof item.food === "string" ? item.food : "";
      const rawValue = typeof foodId === "string" ? foodId : providedName;
      const knownCode = typeof foodId === "string" ? byCode.get(foodId) : undefined;
      const selectedFood = typeof foodId === "string" ? byId.get(foodId) : undefined;
      const label = providedName.trim().slice(0, 120) || knownCode?.name || rawValue.slice(0, 120) || "alimento sem identificador";
      if (!selectedFood) {
        const suggestions = providedName ? findFoodNameSuggestions(providedName, catalog) : [];
        const reason = knownCode ? `“${rawValue}” é um código TACO, não o ID interno exigido.` : typeof foodId === "string" ? `O ID “${rawValue}” não existe no catálogo verificado.` : "A resposta não trouxe food_id; nomes livres não são aceitos.";
        issues.push({ meal: meal.name, label, value: rawValue.slice(0, 120), reason, ...(suggestions.length ? { suggestions } : {}) });
      }
      const grams = item.portion_grams;
      if (typeof grams !== "number" || !Number.isFinite(grams) || grams < 1 || grams > 2000) issues.push({ meal: meal.name, label, value: String(grams ?? "ausente").slice(0, 120), reason: "A quantidade deve ser um número entre 1 e 2.000 g." });
      if (!Array.isArray(item.alternatives)) {
        issues.push({ meal: meal.name, label, value: "alternatives", reason: "A lista de alternativas está em formato inválido." });
      } else {
        for (const alternativeId of item.alternatives) {
          if (typeof alternativeId !== "string" || !byId.has(alternativeId)) {
            const alternativeCode = typeof alternativeId === "string" ? byCode.get(alternativeId) : undefined;
            issues.push({ meal: meal.name, label: alternativeCode?.name ?? String(alternativeId ?? "sem ID").slice(0, 120), value: String(alternativeId ?? "sem ID").slice(0, 120), reason: alternativeCode ? `“${String(alternativeId)}” é um código TACO, não o ID interno exigido para alternativas.` : "O ID da alternativa não existe no catálogo verificado." });
          }
        }
      }
    }
  }
  return issues;
}
