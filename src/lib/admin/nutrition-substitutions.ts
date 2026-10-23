export type SubstitutionFood = {
  id: string;
  name: string;
  energy_kcal_100g: number;
  proteins_g_100g: number;
  carbohydrates_g_100g: number;
  fats_g_100g: number | null;
  fibers_g_100g: number | null;
};

export type NutritionallyEquivalentAlternative = {
  food_library_id: string;
  food: string;
  quantity_g: number;
  calories_kcal: number;
  protein_g: number;
  carbohydrate_g: number;
  fat_g: number;
  fiber_g: number | null;
};

const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
const foodGroup = (name: string) => {
  const value = normalize(name);
  if (/aveia|arroz|milho|trigo|farinha|pao|macarrao|cereal/.test(value)) return "cereal";
  if (/carne|frango|peixe|pescado|atum|sardinha|camarao|ovo/.test(value)) return "protein";
  if (/leite|iogurte|queijo|bebida lactea/.test(value)) return "dairy";
  if (/fruta|banana|maca|pera|manga|abacate|abacaxi|caju|acerola|polpa/.test(value)) return "fruit";
  if (/alface|brocolis|abobrinha|berinjela|cenoura|tomate|couve|repolho|legume/.test(value)) return "vegetable";
  if (/batata|mandioca|inhame|car[aá]|abobora/.test(value)) return "tuber";
  if (/feijao|lentilha|grao de bico|ervilha/.test(value)) return "legume";
  return null;
};
const preparation = (name: string) => {
  const words = normalize(name).split(/\s+/);
  return [["cru", "crua"], ["cozido", "cozida"], ["assado", "assada"], ["grelhado", "grelhada"], ["frito", "frita"], ["refogado", "refogada"], ["desidratado", "desidratada"], ["torrado", "torrada"]].find((group) => group.some((state) => words.includes(state)))?.[0] ?? null;
};
const closeEnough = (a: number, b: number, tolerance = 0.2) => Math.max(a, b) === 0 || Math.abs(a - b) / Math.max(a, b) <= tolerance;

export function equivalentAlternative(selected: SubstitutionFood, alternative: SubstitutionFood): NutritionallyEquivalentAlternative | null {
  if (foodGroup(selected.name) === null || foodGroup(selected.name) !== foodGroup(alternative.name)) return null;
  if (preparation(selected.name) !== preparation(alternative.name)) return null;
  if (![selected.energy_kcal_100g, selected.proteins_g_100g, selected.carbohydrates_g_100g, selected.fats_g_100g, alternative.energy_kcal_100g, alternative.proteins_g_100g, alternative.carbohydrates_g_100g, alternative.fats_g_100g].every((value) => typeof value === "number" && Number.isFinite(value) && value >= 0)) return null;
  if (selected.energy_kcal_100g <= 0 || alternative.energy_kcal_100g <= 0) return null;

  const exactGrams = selected.energy_kcal_100g / alternative.energy_kcal_100g * 100;
  const step = exactGrams >= 100 ? 10 : 5;
  const grams = Math.max(step, Math.round(exactGrams / step) * step);
  if (grams > 2000) return null;
  const factor = grams / 100;
  const values = {
    calories_kcal: alternative.energy_kcal_100g * factor,
    protein_g: alternative.proteins_g_100g * factor,
    carbohydrate_g: alternative.carbohydrates_g_100g * factor,
    fat_g: alternative.fats_g_100g! * factor,
    fiber_g: alternative.fibers_g_100g === null ? null : alternative.fibers_g_100g * factor,
  };
  if (!closeEnough(values.calories_kcal, selected.energy_kcal_100g, 0.05)) return null;
  if (!closeEnough(values.protein_g, selected.proteins_g_100g) || !closeEnough(values.carbohydrate_g, selected.carbohydrates_g_100g) || !closeEnough(values.fat_g, selected.fats_g_100g!)) return null;
  if (selected.fibers_g_100g !== null && (values.fiber_g === null || !closeEnough(values.fiber_g, selected.fibers_g_100g))) return null;

  return { food_library_id: alternative.id, food: alternative.name, quantity_g: grams, ...values };
}

export function verifiedAlternatives(selected: SubstitutionFood, alternatives: SubstitutionFood[]): NutritionallyEquivalentAlternative[] {
  return alternatives.flatMap((alternative) => {
    const equivalent = equivalentAlternative(selected, alternative);
    return equivalent ? [equivalent] : [];
  });
}
