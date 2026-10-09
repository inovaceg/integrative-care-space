import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const respond = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
});

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return respond({ error: "Método não permitido." }, 405);
  try {
    const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
    if (!token) return respond({ error: "Sessão necessária." }, 401);
    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: { user }, error: authError } = await db.auth.getUser(token);
    if (authError || !user) return respond({ error: "Sessão inválida." }, 401);
    const date = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
    const readToday = () => db.from("daily_motivational_messages").select("message, message_date").eq("user_id", user.id).eq("message_date", date).maybeSingle();
    const today = await readToday();
    if (today.error) throw today.error;
    if (today.data) return respond(today.data);

    const key = Deno.env.get("OPENAI_API_KEY");
    if (!key) {
      console.warn("[daily-motivation] OPENAI_API_KEY não configurada");
      return respond({ error: "A mensagem diária aguarda a configuração da OpenAI." }, 503);
    }
    const history = await db.from("daily_motivational_messages").select("message").eq("user_id", user.id).order("message_date", { ascending: false }).limit(60);
    if (history.error) throw history.error;
    const excluded = (history.data ?? []).map((row) => row.message);
    for (let attempt = 0; attempt < 3; attempt++) {
      console.info("[daily-motivation] Gerando mensagem", { date, attempt: attempt + 1 });
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        signal: AbortSignal.timeout(25000),
        body: JSON.stringify({
          model: "gpt-4o-mini", temperature: 1, max_tokens: 200,
          messages: [
            { role: "system", content: "Escreva uma mensagem motivacional original em português brasileiro para as boas-vindas diárias de um profissional de saúde. Tom profissional e acolhedor, com foco em propósito, escuta, cuidado ético com pacientes e pequenas realizações. Use uma ou duas frases, entre 20 e 350 caracteres. Não faça promessas clínicas, não pressione por produtividade, não atribua citações a autores, não use emojis, títulos ou aspas. Retorne somente a mensagem. Não repita nem parafraseie as mensagens anteriores fornecidas. Varie o tema e a estrutura." },
            { role: "user", content: `Data: ${date}. Mensagens anteriores a evitar: ${JSON.stringify(excluded)}` },
          ],
        }),
      });
      if (!response.ok) {
        console.error("[daily-motivation] Falha na OpenAI", { status: response.status });
        return respond({ error: "Não foi possível gerar a mensagem diária. Tente novamente mais tarde." }, 502);
      }
      const result = await response.json();
      const message = result.choices?.[0]?.message?.content?.trim();
      if (typeof message !== "string" || message.length < 20 || message.length > 500) continue;
      const normalized = message.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
      const saved = await db.from("daily_motivational_messages").insert({
        user_id: user.id, message_date: date, message, normalized_message: normalized,
      }).select("message, message_date").single();
      if (!saved.error) {
        console.info("[daily-motivation] Mensagem salva", { date });
        return respond(saved.data);
      }
      if (saved.error.code !== "23505") throw saved.error;
      // A concorrência entre abas deve retornar a mensagem já salva para este dia.
      const concurrent = await readToday();
      if (concurrent.error) throw concurrent.error;
      if (concurrent.data) return respond(concurrent.data);
      excluded.push(message);
    }
    return respond({ error: "Não foi possível obter uma mensagem inédita. Tente novamente mais tarde." }, 503);
  } catch (error) {
    console.error("[daily-motivation] Falha ao obter mensagem", { message: error instanceof Error ? error.message : "Erro de banco ou serviço" });
    return respond({ error: "A mensagem diária está indisponível no momento." }, 500);
  }
});
