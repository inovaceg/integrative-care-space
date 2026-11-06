import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ChevronDown, ChevronRight, MessageCircle, RefreshCw } from "lucide-react";
import { AdminLayout, PageIntro } from "@/components/admin/admin-ui";
import { useAuth } from "@/components/auth/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/contatos-site")({
  head: () => ({ meta: [{ title: "Contatos do site | Área Administrativa" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: SiteContactsPage,
});

type Answers = Record<string, string | string[]>;
type SiteContact = { id: string; full_name: string; whatsapp: string; request_type: string; status: "Novo" | "Em contato" | "Finalizado"; created_at: string; questionnaire_answers: Answers | null };
const statuses: SiteContact["status"][] = ["Novo", "Em contato", "Finalizado"];
const questionLabels: Record<string, string> = {
  who: "Para quem busca informações?",
  age: "Faixa etária",
  reason: "Motivo da busca",
  areas: "O que tem observado?",
  onset: "Quando começou a perceber?",
  change: "O que percebeu desde então?",
  contexts: "Situações em que percebe",
  impact: "Impacto na rotina",
  goal: "Próximo passo desejado",
};

function SiteContactsPage() {
  const { isAdmin, isLoading: authLoading } = useAuth();
  const [items, setItems] = useState<SiteContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError("");
    const { data, error: queryError } = await supabase.from("site_contact_requests").select("id,full_name,whatsapp,request_type,status,created_at,questionnaire_answers").order("created_at", { ascending: false });
    if (queryError) setError("Não foi possível carregar os contatos autorizados.");
    else setItems((data as SiteContact[] | null) ?? []);
    setLoading(false);
  }

  useEffect(() => { if (!authLoading && isAdmin) void load(); }, [authLoading, isAdmin]);

  async function updateStatus(id: string, status: SiteContact["status"]) {
    setError("");
    const { error: updateError } = await supabase.from("site_contact_requests").update({ status }).eq("id", id);
    if (updateError) setError("Não foi possível atualizar o status.");
    else setItems(current => current.map(item => item.id === id ? { ...item, status } : item));
  }

  return <AdminLayout>
    <PageIntro eyebrow="Solicitações recebidas" title="Contatos do site" description="Selecione o nome de um contato para consultar as informações e respostas do questionário." action={<Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw className="mr-2 size-4" />Atualizar</Button>} />
    {error && <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {loading ? <p className="text-sm text-slate-500">Carregando solicitações…</p> : items.length === 0 ? <Card><CardContent className="py-12 text-center text-sm text-slate-500">Ainda não há solicitações de contato.</CardContent></Card> : <div className="space-y-2">{items.map(item => {
      const expanded = expandedId === item.id;
      const hasQuestionnaire = item.request_type === "Questionário de orientação neuropsicológica";
      return <Card key={item.id} className="border-slate-200/80 shadow-sm"><CardContent className="p-0">
        <div className="flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center sm:p-5">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" aria-expanded={expanded} onClick={() => setExpandedId(expanded ? null : item.id)} className="inline-flex min-h-10 items-center gap-2 text-left font-semibold text-slate-900 hover:text-[#26786e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f8f82] focus-visible:ring-offset-2">
                {expanded ? <ChevronDown className="size-4 shrink-0" /> : <ChevronRight className="size-4 shrink-0" />}{item.full_name}
              </button>
              <Badge variant="outline">{item.status}</Badge>
            </div>
            <p className="ml-6 mt-1 text-sm text-slate-600">{item.request_type}</p>
          </div>
          <Select value={item.status} onValueChange={value => void updateStatus(item.id, value as SiteContact["status"])}><SelectTrigger className="w-full sm:w-44" aria-label={`Status de ${item.full_name}`}><SelectValue /></SelectTrigger><SelectContent>{statuses.map(status => <SelectItem key={status} value={status}>{status}</SelectItem>)}</SelectContent></Select>
        </div>
        {expanded && <div className="border-t border-slate-100 px-4 pb-5 pt-4 sm:px-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <a href={`https://wa.me/${item.whatsapp}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm text-[#26786e] underline"><MessageCircle className="size-4" />{item.whatsapp}</a>
            <time className="text-xs text-slate-400" dateTime={item.created_at}>{new Date(item.created_at).toLocaleString("pt-BR")}</time>
          </div>
          {hasQuestionnaire && (item.questionnaire_answers && Object.keys(item.questionnaire_answers).length > 0 ? <section className="mt-4 rounded-xl border border-[#cce7df] bg-[#f4faf8] p-4"><h3 className="text-sm font-semibold text-[#245f57]">Respostas do questionário para avaliação</h3><dl className="mt-4 grid gap-3 sm:grid-cols-2">{Object.entries(item.questionnaire_answers).map(([key, answer]) => <div key={key} className="rounded-lg bg-white p-3"><dt className="text-xs font-semibold text-slate-500">{questionLabels[key] ?? key}</dt><dd className="mt-1 text-sm leading-6 text-slate-800">{Array.isArray(answer) ? answer.join(" · ") : answer}</dd></div>)}</dl></section> : <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Este contato ainda não tem respostas salvas; o questionário pode não ter sido concluído.</p>)}
        </div>}
      </CardContent></Card>;
    })}</div>}
  </AdminLayout>;
}
