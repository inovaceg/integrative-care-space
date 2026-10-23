import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const functionName = "nutrition-food-search";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const jsonResponse = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Método não permitido." }, 405);

  const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return jsonResponse({ error: "Autenticação obrigatória." }, 401);
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !anonKey) {
    console.error(`[${functionName}] Missing Supabase configuration`);
    return jsonResponse({ error: "Configuração do Supabase incompleta." }, 503);
  }

  const client = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } });
  const { data: authData, error: authError } = await client.auth.getUser(token);
  if (authError || !authData.user) return jsonResponse({ error: "Sessão inválida." }, 401);
  const { data: role, error: roleError } = await client.from("user_roles").select("role").eq("user_id", authData.user.id).maybeSingle();
  if (roleError || !role || !["doctor", "admin"].includes(role.role)) return jsonResponse({ error: "Acesso não autorizado." }, 403);

  let body: { query?: unknown };
  try { body = await req.json(); } catch { return jsonResponse({ error: "Requisição inválida." }, 400); }
  const query = typeof body.query === "string" ? body.query.trim() : "";
  if (query.length < 2 || query.length > 100) return jsonResponse({ error: "Digite de 2 a 100 caracteres para pesquisar." }, 400);

  const apiKey = Deno.env.get("USDA_FDC_API_KEY") ?? "DEMO_KEY";
  try {
    const response = await fetch(`https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(15_000),
      body: JSON.stringify({ query, dataType: ["Foundation", "SR Legacy"], pageSize: 20, pageNumber: 1 }),
    });
    if (response.status === 429) return jsonResponse({ error: "A cota de busca da USDA foi atingida. Aguarde ou configure sua própria chave USDA_FDC_API_KEY." }, 429);
    if (!response.ok) {
      console.error(`[${functionName}] USDA response status=${response.status}`);
      return jsonResponse({ error: "A base FoodData Central não respondeu à busca. Tente novamente mais tarde." }, 502);
    }

    const payload = await response.json();
    const foods = (Array.isArray(payload.foods) ? payload.foods : []).flatMap((food: Record<string, unknown>) => {
      const dataType = typeof food.dataType === "string" ? food.dataType : "";
      if (!["Foundation", "SR Legacy"].includes(dataType) || typeof food.fdcId !== "number" || typeof food.description !== "string") return [];
      const nutrientValues = new Map<number, number>();
      if (Array.isArray(food.foodNutrients)) {
        for (const nutrient of food.foodNutrients as Array<Record<string, unknown>>) {
          const id = Number(nutrient.nutrientId);
          const value = Number(nutrient.value);
          if ([1003, 1004, 1005, 1008].includes(id) && Number.isFinite(value) && value >= 0) nutrientValues.set(id, value);
        }
      }
      const calories = nutrientValues.get(1008);
      const protein = nutrientValues.get(1003);
      const fat = nutrientValues.get(1004) ?? null;
      const carbohydrates = nutrientValues.get(1005);
      return [{
        source_code: `USDA-${food.fdcId}`,
        name: food.description.trim(),
        category: dataType,
        energy_kcal_100g: calories ?? null,
        proteins_g_100g: protein ?? null,
        carbohydrates_g_100g: carbohydrates ?? null,
        fats_g_100g: fat,
        source: "USDA FoodData Central",
        license: "USDA FoodData Central data — public domain; source identifier retained",
      }];
    });
    return jsonResponse({ foods });
  } catch (error) {
    const timedOut = error instanceof DOMException && error.name === "TimeoutError";
    console.error(`[${functionName}] USDA request ${timedOut ? "timed out" : "failed"}`);
    return jsonResponse({ error: timedOut ? "A busca na USDA demorou mais que o esperado." : "Não foi possível conectar à base FoodData Central." }, 502);
  }
});
