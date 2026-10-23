import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const functionName = "nutrition-taco-import";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const jsonResponse = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").replace(/[^a-z0-9]/g, "");
const chunk = <T>(values: T[], size: number) => Array.from({ length: Math.ceil(values.length / size) }, (_, index) => values.slice(index * size, (index + 1) * size));

type ImportRow = {
  codigo_taco: unknown;
  nome: unknown;
  energia_kcal: unknown;
  proteinas_g: unknown;
  carboidratos_g: unknown;
  gorduras_g: unknown;
  fibras_g: unknown;
  sodio_mg: unknown;
};
type CleanRow = {
  codigo_taco: number;
  nome: string;
  energia_kcal: number;
  proteinas_g: number;
  carboidratos_g: number;
  gorduras_g: number | null;
  fibras_g: number | null;
  sodio_mg: number | null;
};

function validateRow(input: ImportRow): { row?: CleanRow; errors: string[] } {
  const errors: string[] = [];
  const code = Number(input.codigo_taco);
  const name = typeof input.nome === "string" ? input.nome.trim() : "";
  const energy = input.energia_kcal === null ? null : Number(input.energia_kcal);
  const protein = input.proteinas_g === null ? null : Number(input.proteinas_g);
  const carbs = input.carboidratos_g === null ? null : Number(input.carboidratos_g);
  const fat = input.gorduras_g === null ? null : Number(input.gorduras_g);
  const fiber = input.fibras_g === null ? null : Number(input.fibras_g);
  const sodium = input.sodio_mg === null ? null : Number(input.sodio_mg);
  if (!Number.isInteger(code) || code <= 0) errors.push("Código TACO inválido.");
  if (!name || name.length > 300) errors.push("Nome ausente ou inválido.");
  if (energy === null || protein === null || carbs === null || ![energy, protein, carbs].every((value) => Number.isFinite(value) && value >= 0)) errors.push("Energia, proteínas e carboidratos precisam ser valores numéricos não negativos.");
  if (energy !== null && energy > 1000) errors.push("Energia acima de 1.000 kcal/100 g; importação bloqueada por segurança.");
  if ([protein, carbs, fat, fiber].some((value) => value !== null && (!Number.isFinite(value) || value < 0 || value > 100))) errors.push("Macronutriente ou fibra fora do intervalo válido por 100 g.");
  if (sodium !== null && (!Number.isFinite(sodium) || sodium < 0 || sodium > 100000)) errors.push("Sódio fora do intervalo válido por 100 g.");
  if (errors.length) return { errors };
  return { row: { codigo_taco: code, nome, energia_kcal: energy!, proteinas_g: protein!, carboidratos_g: carbs!, gorduras_g: fat, fibras_g: fiber, sodio_mg: sodium }, errors };
}

function checkReferenceRows(rows: CleanRow[]) {
  const references = [
    { label: "Arroz integral cozido", find: (name: string) => name.includes("arrozintegral") && name.includes("cozido"), min: 118, max: 130 },
    { label: "Arroz branco tipo 1 cozido", find: (name: string) => name.includes("arroz") && name.includes("tipo1") && name.includes("cozido") && !name.includes("integral"), min: 120, max: 136 },
    { label: "Aveia em flocos crua", find: (name: string) => name.includes("aveiaemflocos") && name.includes("crua"), min: 380, max: 410 },
  ];
  return references.flatMap((reference) => {
    const row = rows.find((item) => reference.find(normalize(item.nome)));
    if (!row) return [`${reference.label}: não encontrado.`];
    if (row.energia_kcal < reference.min || row.energia_kcal > reference.max) return [`${reference.label}: ${row.energia_kcal} kcal/100 g; esperado aproximadamente ${Math.round((reference.min + reference.max) / 2)}.`];
    return [];
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Método não permitido." }, 405);
  const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return jsonResponse({ error: "Autenticação obrigatória." }, 401);
  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anonKey || !serviceKey) {
    console.error(`[${functionName}] Missing server configuration`);
    return jsonResponse({ error: "Configuração do Supabase incompleta." }, 503);
  }
  const authClient = createClient(url, anonKey, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } });
  const { data: authData, error: authError } = await authClient.auth.getUser(token);
  if (authError || !authData.user) return jsonResponse({ error: "Sessão inválida." }, 401);
  const { data: role, error: roleError } = await authClient.from("user_roles").select("role").eq("user_id", authData.user.id).maybeSingle();
  if (roleError || role?.role !== "admin") return jsonResponse({ error: "Somente administradores autorizados podem importar a biblioteca." }, 403);

  let body: { rows?: unknown };
  try { body = await req.json(); } catch { return jsonResponse({ error: "Requisição inválida." }, 400); }
  if (!Array.isArray(body.rows) || body.rows.length < 1 || body.rows.length > 650) return jsonResponse({ error: "Envie entre 1 e 650 linhas de alimentos." }, 400);

  const inputRows = body.rows as ImportRow[];
  const outlierEnergyRows = inputRows.filter((item) => {
    if (!item || typeof item !== "object" || item.energia_kcal === null || item.energia_kcal === undefined || item.energia_kcal === "") return false;
    const energy = Number(item.energia_kcal);
    return Number.isFinite(energy) && (energy < 0 || energy > 1000);
  });
  if (outlierEnergyRows.length) return jsonResponse({ error: "Importação interrompida: há valores de energia negativos ou acima de 1.000 kcal/100 g. Corrija a planilha antes de tentar novamente." }, 422);
  const validRows: CleanRow[] = [];
  const rejected: Array<{ codigo_taco: number | null; nome: string; error: string }> = [];
  for (const item of inputRows) {
    if (!item || typeof item !== "object") {
      rejected.push({ codigo_taco: null, nome: "", error: "Linha de importação inválida." });
      continue;
    }
    const result = validateRow(item);
    if (result.row) validRows.push(result.row);
    else rejected.push({ codigo_taco: Number.isInteger(Number(item.codigo_taco)) ? Number(item.codigo_taco) : null, nome: typeof item.nome === "string" ? item.nome.slice(0, 200) : "", error: result.errors.join(" ") });
  }
  const referenceErrors = checkReferenceRows(validRows);
  if (referenceErrors.length) return jsonResponse({ error: "A importação foi interrompida: os alimentos de conferência não passaram na validação.", reference_errors: referenceErrors }, 422);
  if (!validRows.length) return jsonResponse({ error: "Nenhuma linha válida para importar.", rejected }, 422);

  const service = createClient(url, serviceKey, { auth: { persistSession: false } });
  const seen = new Set<number>();
  const uniqueRows: CleanRow[] = [];
  let ignored = 0;
  for (const row of validRows) {
    if (seen.has(row.codigo_taco)) { ignored += 1; continue; }
    seen.add(row.codigo_taco);
    uniqueRows.push(row);
  }
  let imported = 0;
  let updated = 0;
  const writeErrors: Array<{ codigo_taco: number; nome: string; error: string }> = [];

  for (const batch of chunk(uniqueRows, 50)) {
    const sourceCodes = batch.map((row) => `TACO-${row.codigo_taco}`);
    const { data: existingRows, error: lookupError } = await service.from("nutrition_food_library").select("id,source_code,source").in("source_code", sourceCodes);
    if (lookupError) {
      for (const row of batch) writeErrors.push({ codigo_taco: row.codigo_taco, nome: row.nome, error: "Falha ao verificar duplicidade no banco." });
      continue;
    }
    const existingByCode = new Map((existingRows ?? []).map((row) => [row.source_code, row]));
    const inserts: Record<string, unknown>[] = [];
    const updates: Array<{ id: string; row: CleanRow }> = [];
    for (const row of batch) {
      const sourceCode = `TACO-${row.codigo_taco}`;
      const existing = existingByCode.get(sourceCode);
      if (existing && existing.source !== "TACO") { ignored += 1; continue; }
      if (existing) { updates.push({ id: existing.id, row }); continue; }
      inserts.push({
        source_code: sourceCode,
        name: row.nome,
        category: "TACO — Alimentos principais",
        energy_kcal_100g: row.energia_kcal,
        proteins_g_100g: row.proteinas_g,
        carbohydrates_g_100g: row.carboidratos_g,
        fats_g_100g: row.gorduras_g,
        fibers_g_100g: row.fibras_g,
        sodium_mg_100g: row.sodio_mg,
        source: "TACO",
        license: "Planilha TACO fornecida pelo administrador; conferir termos da fonte antes de redistribuição.",
        validation_status: "verified",
        allergens: [],
        allergen_info_known: false,
        gluten_status: "unknown",
        lactose_status: "unknown",
        nutrition_missing: ["allergens", "gluten_status", "lactose_status"],
        import_notes: "Aba Alimentos - principais; nutrientes por 100 g sem conversão. A planilha não fornece dados de alergênicos, glúten ou lactose.",
      });
    }
    if (inserts.length) {
      const { error: insertError } = await service.from("nutrition_food_library").insert(inserts);
      if (insertError) {
        for (const item of inserts) writeErrors.push({ codigo_taco: Number(String(item.source_code).slice(5)), nome: String(item.name), error: "Falha ao inserir no banco; a linha não foi contada como importada." });
      } else imported += inserts.length;
    }
    const updateResults = await Promise.all(updates.map(async ({ id, row }) => {
      const { error } = await service.from("nutrition_food_library").update({
        name: row.nome,
        category: "TACO — Alimentos principais",
        energy_kcal_100g: row.energia_kcal,
        proteins_g_100g: row.proteinas_g,
        carbohydrates_g_100g: row.carboidratos_g,
        fats_g_100g: row.gorduras_g,
        fibers_g_100g: row.fibras_g,
        sodium_mg_100g: row.sodio_mg,
        updated_at: new Date().toISOString(),
      }).eq("id", id);
      return { row, error };
    }));
    for (const result of updateResults) {
      if (result.error) writeErrors.push({ codigo_taco: result.row.codigo_taco, nome: result.row.nome, error: "Falha ao atualizar os nutrientes no banco." });
      else updated += 1;
    }
  }

  console.info(`[${functionName}] Import completed imported=${imported} updated=${updated} ignored=${ignored} rejected=${rejected.length + writeErrors.length}`);
  return jsonResponse({ imported, updated, ignored, rejected: rejected.length + writeErrors.length, rejected_rows: [...rejected, ...writeErrors] });
});
