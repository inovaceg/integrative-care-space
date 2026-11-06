import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ChevronDown, ChevronRight, MessageCircle, Pencil, RefreshCw, Save, Trash2, X } from "lucide-react";
import { AdminLayout, PageIntro } from "@/components/admin/admin-ui";
import { useAuth } from "@/components/auth/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftAnswers, setDraftAnswers] = useState<Record<string, string>>({});
  const [savingAnswers, setSavingAnswers] = useState(false);

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

  function startEditing(item: SiteContact) {
    if (!item.questionnaire_answers) return;
    setDraftAnswers(Object.fromEntries(Object.entries(item.questionnaire_answers).map(([key, value]) => [key, Array.isArray(value) ? value.join("\n") : value])));
    setEditingId(item.id);
  }

  async function saveAnswers(item: SiteContact) {
    if (!item.questionnaire_answers) return;
    setSavingAnswers(true);
    setError("");
    const answers = Object.fromEntries(Object.entries(draftAnswers).map(([key, value]) => [key, Array.isArray(item.questionnaire_answers?.[key]) ? value.split("\n").map(answer => answer.trim()).filter(Boolean) : value])) as Answers;
    const { error: updateError } = await supabase.from("site_contact_requests").update({ questionnaire_answers: answers }).eq("id", item.id);
    if (updateError) setError("Não foi possível salvar as alterações das respostas.");
    else {
      setItems(current => current.map(contact => contact.id === item.id ? { ...contact, questionnaire_answers: answers } : contact));
      setEditingId(null);
    }
    setSavingAnswers(false);
  }

  async function deleteAnswers(item: SiteContact) {
    if (!window.confirm(`Excluir as respostas do questionário de ${item.full_name}? O contato será mantido.`)) return;
    setError("");
    const { error: updateError } = await supabase.from("site_contact_requests").update({ questionnaire_answers: null }).eq("id", item.id);
    if (updateError) setError("Não foi possível excluir as respostas do questionário.");
    else {
      setItems(current => current.map(contact => contact.id === item.id ? { ...contact, questionnaire_answers: null } : contact));
      setEditingId(null);
    }
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
          {hasQuestionnaire && (item.questionnaire_answers && Object.keys(item.questionnaire_answers).length > 0 ? <section className="mt-4 rounded-xl border border-[#cce7df] bg-[#f4faf8] p-4"><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-sm font-semibold text-[#245f57]">Respostas do questionário para avaliação</h3>{editingId === item.id ? <div className="flex gap-2"><Button size="sm" onClick={() => void saveAnswers(item)} disabled={savingAnswers}><Save className="mr-2 size-4" />{savingAnswers ? "Salvando…" : "Salvar"}</Button><Button size="sm" variant="outline" onClick={() => setEditingId(null)} disabled={savingAnswers}><X className="mr-2 size-4" />Cancelar</Button></div> : <div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => startEditing(item)}><Pencil className="mr-2 size-4" />Editar</Button><Button size="sm" variant="outline" className="border-red-200 text-red-700 hover:bg-red-50" onClick={() => void deleteAnswers(item)}><Trash2 className="mr-2 size-4" />Excluir respostas</Button></div>}</div><dl className="mt-4 grid gap-3 sm:grid-cols-2">{Object.entries(item.questionnaire_answers).map(([key, answer]) => <div key={key} className="rounded-lg bg-white p-3"><dt className="text-xs font-semibold text-slate-500">{questionLabels[key] ?? key}</dt><dd className="mt-1 text-sm leading-6 text-slate-800">{editingId === item.id ? <Textarea aria-label={questionLabels[key] ?? key} value={draftAnswers[key] ?? ""} onChange={event => setDraftAnswers(current => ({ ...current, [key]: event.target.value }))} rows={Array.isArray(answer) ? 3 : 2} /> : Array.isArray(answer) ? answer.join(" · ") : answer}</dd>{editingId === item.id && Array.isArray(answer) && <p className="mt-1 text-xs text-slate-500">Em respostas com múltipla escolha, deixe uma opção por linha.</p>}</div>)}</dl></section> : <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Este contato ainda não tem respostas salvas; o questionário pode não ter sido concluído.</p>)}
        </div>}
      </CardContent></Card>;
    })}</div>}
  </AdminLayout>;
}
