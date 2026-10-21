import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const functionName = "nutrition-approve";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Método não permitido." }, 405);
  const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return jsonResponse({ error: "Autenticação obrigatória." }, 401);
  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anonKey || !serviceKey) {
    console.error(`[${functionName}] Missing server configuration`);
    return jsonResponse({ error: "Serviço temporariamente indisponível." }, 503);
  }
  const userClient = createClient(url, anonKey, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } });
  const { data: authData, error: authError } = await userClient.auth.getUser(token);
  if (authError || !authData.user) return jsonResponse({ error: "Sessão inválida." }, 401);
  const approverId = authData.user.id;
  const { data: role, error: roleError } = await userClient.from("user_roles").select("role").eq("user_id", approverId).maybeSingle();
  if (roleError || !role || !["doctor", "admin"].includes(role.role)) return jsonResponse({ error: "Acesso não autorizado." }, 403);
  const { data: credential, error: credentialError } = await userClient.from("nutritionist_credentials").select("verification_status,verified_at,verified_by").eq("profissional_id", approverId).maybeSingle();
  if (credentialError || credential?.verification_status !== "verified" || !credential.verified_at || !credential.verified_by) return jsonResponse({ error: "É necessária uma credencial CRN verificada." }, 403);
  let input: { plan_id?: unknown; version_id?: unknown };
  try { input = await req.json(); } catch { return jsonResponse({ error: "Requisição inválida." }, 400); }
  if (typeof input.plan_id !== "string" || typeof input.version_id !== "string") return jsonResponse({ error: "Plano ou versão inválidos." }, 400);
  const serviceClient = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { error: approvalError } = await serviceClient.rpc("approve_nutrition_plan", { p_plan_id: input.plan_id, p_version_id: input.version_id, p_profissional_id: approverId });
  if (approvalError) {
    console.error(`[${functionName}] Approval operation rejected`);
    return jsonResponse({ error: "O planejamento não pôde ser aprovado. Verifique o plano e sua versão." }, 409);
  }
  return jsonResponse({ approved: true });
});
