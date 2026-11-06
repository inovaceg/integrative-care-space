import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const requestTypes = ["Tirar dúvidas sobre a avaliação", "Consultar valores e horários", "Solicitar uma conversa inicial"];

serve(async request => {
  if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (request.method !== "POST") return Response.json({ error: "Método não permitido." }, { status: 405, headers: corsHeaders });

  let body: unknown;
  try {
    const rawBody = await request.text();
    if (rawBody.length > 4096) return Response.json({ error: "Solicitação inválida." }, { status: 413, headers: corsHeaders });
    body = JSON.parse(rawBody);
  } catch {
    return Response.json({ error: "Solicitação inválida." }, { status: 400, headers: corsHeaders });
  }
  if (!body || typeof body !== "object") return Response.json({ error: "Solicitação inválida." }, { status: 400, headers: corsHeaders });

  const input = body as Record<string, unknown>;
  const fullNameInput = typeof input.name === "string" ? input.name : typeof input.firstName === "string" ? input.firstName : "";
  const fullName = fullNameInput.trim().replace(/\s+/g, " ");
  const phoneDigits = typeof input.whatsapp === "string" ? input.whatsapp.replace(/\D/g, "") : "";
  const whatsapp = phoneDigits.length === 10 || phoneDigits.length === 11 ? `55${phoneDigits}` : phoneDigits;
  const requestType = typeof input.requestType === "string" ? input.requestType : "";
  if (fullName.length < 2 || fullName.length > 100 || !/^[\p{L}][\p{L}\p{M}'’.-]*(?: [\p{L}][\p{L}\p{M}'’.-]*)*$/u.test(fullName)) {
    return Response.json({ error: "Informe um nome válido." }, { status: 400, headers: corsHeaders });
  }
  if (phoneDigits.length < 10 || phoneDigits.length > 13) {
    return Response.json({ error: "Informe um WhatsApp válido com DDD." }, { status: 400, headers: corsHeaders });
  }
  if (!requestTypes.includes(requestType) || input.consent !== true) {
    return Response.json({ error: "Confirme o pedido de contato para continuar." }, { status: 400, headers: corsHeaders });
  }

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const { error } = await supabase.from("site_contact_requests").insert({ full_name: fullName, whatsapp, request_type: requestType });
  if (error) return Response.json({ error: "Não foi possível registrar o pedido agora. Tente novamente." }, { status: 500, headers: corsHeaders });
  return Response.json({ received: true }, { status: 201, headers: corsHeaders });
});
