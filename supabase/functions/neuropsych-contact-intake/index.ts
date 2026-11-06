import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const requestTypes = ["Tirar dúvidas sobre a avaliação", "Consultar valores e horários", "Solicitar uma conversa inicial", "Questionário de orientação neuropsicológica"];
const answerKeys = new Set(["who", "areas", "onset", "onset_type", "change", "contexts", "impact", "factors", "reason", "goal"]);
const maxBodyLength = 4096;
const questionLabels: Record<string, string> = {
  who: "Para quem você está buscando orientação?",
  areas: "Quais dificuldades ou mudanças você tem observado?",
  onset: "Quando você percebeu essas dificuldades pela primeira vez?",
  onset_type: "Como essas dificuldades começaram?",
  change: "Como as dificuldades evoluíram desde que começaram?",
  contexts: "Em quais situações as dificuldades ficam mais perceptíveis?",
  impact: "Que efeitos essas dificuldades têm na rotina?",
  factors: "Você percebeu algo que coincidiu com o início ou a piora das dificuldades?",
  reason: "O que motivou você a buscar orientação agora?",
  goal: "Como você prefere seguir?",
};
const toHex = (bytes: Uint8Array) => Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");

function formatBirthDateAndAge(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  const today = new Date();
  let age = today.getUTCFullYear() - year;
  if (today.getUTCMonth() + 1 < month || (today.getUTCMonth() + 1 === month && today.getUTCDate() < day)) age -= 1;
  const date = new Date(`${value}T00:00:00Z`).toLocaleDateString("pt-BR", { timeZone: "UTC" });
  return `${date} · ${age} ${age === 1 ? "ano" : "anos"}`;
}

function buildQuestionnaireReport(fullName: string, birthDate: string | null, answers: Record<string, string | string[]>) {
  const value = (key: string) => {
    const answer = answers[key];
    return Array.isArray(answer) ? answer.join(", ") : answer ?? "não informado";
  };
  const areas = value("areas");
  const contexts = value("contexts");
  const impact = value("impact");
  const onset = value("onset");
  const onsetType = value("onset_type");
  const change = value("change");
  const factors = value("factors");
  const hasFactors = factors !== "não informado" && !/não percebi|nenhum|não sei/i.test(factors);
  const synthesis = [
    `A orientação é buscada para: ${value("who")}. As principais dificuldades relatadas são: ${areas}.`,
    `Primeira percepção: ${onset}. Início descrito como ${onsetType}; desde então, ${change}.`,
    `Ficam mais perceptíveis em ${contexts}, com efeitos relatados em ${impact}. ${hasFactors ? `Também é relatada possível coincidência com ${factors}; essa associação temporal, por si só, não permite concluir que haja relação de causa.` : "Não foi identificada uma coincidência específica com o início ou a piora."}`,
    `A busca neste momento é motivada por ${value("reason")}; a preferência indicada para os próximos passos é ${value("goal")}.`,
  ];
  const focusPoints = [
    `Explorar exemplos concretos, frequência e repercussão das dificuldades relatadas (${areas}) nos contextos selecionados (${contexts}), considerando os efeitos na rotina (${impact}).`,
    `Esclarecer a cronologia: primeira percepção (${onset}), modo de início (${onsetType}) e evolução (${change}), distinguindo mudanças recentes de padrões mais antigos.`,
    ...(hasFactors ? [`Investigar a sequência temporal dos fatores mencionados (${factors}), sem presumir causalidade.`] : []),
    `Considerar a motivação e a preferência expressas pela pessoa: ${value("reason")} / ${value("goal")}.`,
  ];
  return [
    "SÍNTESE AVALIATIVA INFORMATIVA — QUESTIONÁRIO DE ORIENTAÇÃO SOBRE AVALIAÇÃO NEUROPSICOLÓGICA",
    `Pessoa avaliada: ${fullName}`,
    `Nascimento / idade: ${birthDate ? formatBirthDateAndAge(birthDate) : "Não informada"}`,
    `Relatório gerado em: ${new Date().toLocaleString("pt-BR")}`,
    "",
    "SÍNTESE DAS RESPOSTAS",
    ...synthesis,
    "",
    "ASPECTOS A APROFUNDAR NA AVALIAÇÃO PROFISSIONAL",
    ...focusPoints.map(point => `• ${point}`),
    "",
    "Síntese descritiva gerada a partir das respostas fornecidas para apoiar a avaliação profissional. Não constitui laudo, diagnóstico, pontuação ou conclusão clínica automática. A interpretação e as conclusões cabem ao profissional responsável.",
  ].join("\n");
}

serve(async request => {
  if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (request.method !== "POST") return Response.json({ error: "Método não permitido." }, { status: 405, headers: corsHeaders });

  let body: unknown;
  try {
    const rawBody = await request.text();
    if (rawBody.length > maxBodyLength) return Response.json({ error: "Solicitação inválida." }, { status: 413, headers: corsHeaders });
    body = JSON.parse(rawBody);
  } catch {
    return Response.json({ error: "Solicitação inválida." }, { status: 400, headers: corsHeaders });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) return Response.json({ error: "Solicitação inválida." }, { status: 400, headers: corsHeaders });

  const input = body as Record<string, unknown>;
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

  if (input.action === "save_questionnaire_answers") {
    const answers = input.answers;
    const questionnaireToken = typeof input.questionnaireToken === "string" ? input.questionnaireToken : "";
    if (!/^[0-9a-f]{64}$/i.test(questionnaireToken) || !answers || typeof answers !== "object" || Array.isArray(answers)) {
      return Response.json({ error: "Respostas inválidas." }, { status: 400, headers: corsHeaders });
    }
    const entries = Object.entries(answers as Record<string, unknown>);
    const validAnswers = entries.length > 0 && entries.every(([key, value]) => answerKeys.has(key) && (
      typeof value === "string" && value.length <= 200 ||
      Array.isArray(value) && value.length <= 12 && value.every(item => typeof item === "string" && item.length <= 200)
    ));
    if (!validAnswers || JSON.stringify(answers).length > 3500) {
      return Response.json({ error: "Respostas inválidas." }, { status: 400, headers: corsHeaders });
    }
    const tokenBytes = new Uint8Array(32);
    for (let index = 0; index < tokenBytes.length; index += 1) tokenBytes[index] = Number.parseInt(questionnaireToken.slice(index * 2, index * 2 + 2), 16);
    const tokenHash = toHex(new Uint8Array(await crypto.subtle.digest("SHA-256", tokenBytes)));
    const { data: contact, error: lookupError } = await supabase.from("site_contact_requests")
      .select("id,full_name,birth_date")
      .eq("questionnaire_token_hash", tokenHash)
      .eq("request_type", "Questionário de orientação neuropsicológica")
      .maybeSingle();
    if (lookupError) return Response.json({ error: "Não foi possível salvar as respostas." }, { status: 500, headers: corsHeaders });
    if (!contact) return Response.json({ error: "Solicitação não encontrada." }, { status: 404, headers: corsHeaders });
    const questionnaireReport = buildQuestionnaireReport(contact.full_name, contact.birth_date, answers as Record<string, string | string[]>);
    const { error } = await supabase.from("site_contact_requests")
      .update({ questionnaire_answers: answers, questionnaire_report: questionnaireReport })
      .eq("id", contact.id);
    if (error) return Response.json({ error: "Não foi possível salvar as respostas." }, { status: 500, headers: corsHeaders });
    return Response.json({ saved: true }, { status: 200, headers: corsHeaders });
  }

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
  const birthDate = typeof input.birthDate === "string" ? input.birthDate : "";
  if (requestType === "Questionário de orientação neuropsicológica") {
    const parsedBirthDate = /^\d{4}-\d{2}-\d{2}$/.test(birthDate) ? new Date(`${birthDate}T00:00:00.000Z`) : null;
    if (!parsedBirthDate || Number.isNaN(parsedBirthDate.getTime()) || parsedBirthDate.toISOString().slice(0, 10) !== birthDate || birthDate > new Date().toISOString().slice(0, 10)) {
      return Response.json({ error: "Informe uma data de nascimento válida." }, { status: 400, headers: corsHeaders });
    }
  }

  const tokenBytes = requestType === "Questionário de orientação neuropsicológica" ? crypto.getRandomValues(new Uint8Array(32)) : null;
  const questionnaireToken = tokenBytes ? toHex(tokenBytes) : null;
  const questionnaireTokenHash = tokenBytes ? toHex(new Uint8Array(await crypto.subtle.digest("SHA-256", tokenBytes))) : null;
  const { error } = await supabase.from("site_contact_requests").insert({
    full_name: fullName,
    whatsapp,
    request_type: requestType,
    birth_date: requestType === "Questionário de orientação neuropsicológica" ? birthDate : null,
    questionnaire_token_hash: questionnaireTokenHash,
  });
  if (error) return Response.json({ error: "Não foi possível registrar o pedido agora. Tente novamente." }, { status: 500, headers: corsHeaders });
  return Response.json({ received: true, questionnaireToken }, { status: 201, headers: corsHeaders });
});
