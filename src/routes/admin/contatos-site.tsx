import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ChevronDown, ChevronRight, FileText, MessageCircle, Pencil, RefreshCw, Save, Trash2, X } from "lucide-react";
import { AdminLayout, PageIntro } from "@/components/admin/admin-ui";
import { useAuth } from "@/components/auth/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { buildQuestionnaireReport, printSiteContactReport } from "@/lib/admin/site-contact-report";

export const Route = createFileRoute("/admin/contatos-site")({
  head: () => ({ meta: [{ title: "Contatos do site | Área Administrativa" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: SiteContactsPage,
});

type Answers = Record<string, string | string[]>;
type SiteContact = { id: string; full_name: string; whatsapp: string; birth_date: string | null; request_type: string; status: "Novo" | "Em contato" | "Finalizado"; created_at: string; questionnaire_answers: Answers | null; questionnaire_report: string | null; professional_notes: string | null };
const statuses: SiteContact["status"][] = ["Novo", "Em contato", "Finalizado"];
const questionLabels: Record<string, string> = {
  who: "Para quem você está buscando orientação?",
  areas: "Dificuldades ou mudanças observadas",
  onset: "Quando percebeu pela primeira vez?",
  onset_type: "Como começaram?",
  change: "Como evoluíram?",
  contexts: "Situações em que ficam mais perceptíveis",
  impact: "Efeitos na rotina",
  factors: "O que coincidiu com o início ou a piora?",
  reason: "Motivo da busca por orientação",
  goal: "Como prefere seguir?",
};

function formatBirthDateAndAge(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  const today = new Date();
  let age = today.getFullYear() - year;
  if (today.getMonth() + 1 < month || (today.getMonth() + 1 === month && today.getDate() < day)) age -= 1;
  const date = new Date(`${value}T00:00:00Z`).toLocaleDateString("pt-BR", { timeZone: "UTC" });
  return `${date} · ${age} ${age === 1 ? "ano" : "anos"}`;
}

function SiteContactsPage() {
  const { isAdmin, isLoading: authLoading } = useAuth();
  const [items, setItems] = useState<SiteContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftAnswers, setDraftAnswers] = useState<Record<string, string>>({});
  const [savingAnswers, setSavingAnswers] = useState(false);
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [contactDraft, setContactDraft] = useState({ full_name: "", whatsapp: "", birth_date: "" });
  const [savingContact, setSavingContact] = useState(false);
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [savingNotesId, setSavingNotesId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError("");
    const { data, error: queryError } = await supabase.from("site_contact_requests").select("id,full_name,whatsapp,birth_date,request_type,status,created_at,questionnaire_answers,questionnaire_report,professional_notes").order("created_at", { ascending: false });
    if (queryError) setError("Não foi possível carregar os contatos autorizados.");
    else {
      const contacts = (data as SiteContact[] | null) ?? [];
      const prepared = await Promise.all(contacts.map(async item => {
        const contact = { ...item, questionnaire_answers: item.questionnaire_answers ? Object.fromEntries(Object.entries(item.questionnaire_answers).filter(([key]) => key !== "age")) : null };
        if ((!contact.questionnaire_report?.includes("SÍNTESE DAS RESPOSTAS")) && contact.questionnaire_answers && Object.keys(contact.questionnaire_answers).length > 0) {
          const report = buildQuestionnaireReport(contact, questionLabels);
          let reportUpdate = supabase.from("site_contact_requests").update({ questionnaire_report: report }).eq("id", item.id);
          reportUpdate = contact.questionnaire_report ? reportUpdate.eq("questionnaire_report", contact.questionnaire_report) : reportUpdate.is("questionnaire_report", null);
          const { error: reportError } = await reportUpdate;
          if (!reportError) return { ...contact, questionnaire_report: report };
        }
        return contact;
      }));
      setItems(prepared);
    }
    setLoading(false);
  }

  useEffect(() => { if (!authLoading && isAdmin) void load(); }, [authLoading, isAdmin]);

  async function updateStatus(id: string, status: SiteContact["status"]) {
    setError("");
    const { error: updateError } = await supabase.from("site_contact_requests").update({ status }).eq("id", id);
    if (updateError) setError("Não foi possível atualizar o status.");
    else setItems(current => current.map(item => item.id === id ? { ...item, status } : item));
  }

  function startEditingContact(item: SiteContact) {
    setContactDraft({ full_name: item.full_name, whatsapp: item.whatsapp, birth_date: item.birth_date ?? "" });
    setEditingContactId(item.id);
  }

  async function saveContact(item: SiteContact) {
    const fullName = contactDraft.full_name.trim().replace(/\s+/g, " ");
    const phoneDigits = contactDraft.whatsapp.replace(/\D/g, "");
    const whatsapp = phoneDigits.length === 10 || phoneDigits.length === 11 ? `55${phoneDigits}` : phoneDigits;
    const birthDate = contactDraft.birth_date;
    if (fullName.length < 2 || fullName.length > 100) {
      setError("Informe um nome com pelo menos 2 caracteres.");
      return;
    }
    if (phoneDigits.length < 10 || phoneDigits.length > 13) {
      setError("Informe um WhatsApp válido com DDD.");
      return;
    }
    if ((item.request_type === "Questionário de orientação neuropsicológica" && !birthDate) || (birthDate && (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate) || Number.isNaN(new Date(`${birthDate}T00:00:00.000Z`).getTime()) || new Date(`${birthDate}T00:00:00.000Z`).toISOString().slice(0, 10) !== birthDate || birthDate > new Date().toISOString().slice(0, 10)))) {
      setError("Informe uma data de nascimento válida.");
      return;
    }
    setSavingContact(true);
    setError("");
    const updatedContact = { ...item, full_name: fullName, whatsapp, birth_date: birthDate || null };
    const questionnaireReport = updatedContact.questionnaire_answers && Object.keys(updatedContact.questionnaire_answers).length > 0 ? buildQuestionnaireReport(updatedContact, questionLabels) : updatedContact.questionnaire_report;
    const { error: updateError } = await supabase.from("site_contact_requests").update({ full_name: fullName, whatsapp, birth_date: birthDate || null, questionnaire_report: questionnaireReport }).eq("id", item.id);
    if (updateError) setError("Não foi possível atualizar os dados do contato.");
    else {
      setItems(current => current.map(contact => contact.id === item.id ? { ...updatedContact, questionnaire_report: questionnaireReport } : contact));
      setEditingContactId(null);
    }
    setSavingContact(false);
  }

  async function saveProfessionalNotes(item: SiteContact) {
    const notes = (noteDrafts[item.id] ?? item.professional_notes ?? "").trim();
    if (notes.length > 5000) {
      setError("As observações podem ter no máximo 5.000 caracteres.");
      return;
    }
    setSavingNotesId(item.id);
    setError("");
    const { error: updateError } = await supabase.from("site_contact_requests").update({ professional_notes: notes || null }).eq("id", item.id);
    if (updateError) setError("Não foi possível salvar as observações do profissional.");
    else setItems(current => current.map(contact => contact.id === item.id ? { ...contact, professional_notes: notes || null } : contact));
    setSavingNotesId(null);
  }

  function printReport(item: SiteContact) {
    if (!printSiteContactReport(item, questionLabels)) setError("Permita a abertura de uma nova janela para imprimir ou salvar o relatório em PDF.");
  }

  function startEditing(item: SiteContact) {
    if (!item.questionnaire_answers) return;
    setDraftAnswers(Object.fromEntries(Object.entries(item.questionnaire_answers).filter(([key]) => key !== "age").map(([key, value]) => [key, Array.isArray(value) ? value.join("\n") : value])));
    setEditingId(item.id);
  }

  async function saveAnswers(item: SiteContact) {
    if (!item.questionnaire_answers) return;
    setSavingAnswers(true);
    setError("");
    const answers = Object.fromEntries(Object.entries(draftAnswers).map(([key, value]) => [key, Array.isArray(item.questionnaire_answers?.[key]) ? value.split("\n").map(answer => answer.trim()).filter(Boolean) : value])) as Answers;
    const questionnaireReport = buildQuestionnaireReport({ ...item, questionnaire_answers: answers }, questionLabels);
    const { error: updateError } = await supabase.from("site_contact_requests").update({ questionnaire_answers: answers, questionnaire_report: questionnaireReport }).eq("id", item.id);
    if (updateError) setError("Não foi possível salvar as alterações das respostas.");
    else {
      setItems(current => current.map(contact => contact.id === item.id ? { ...contact, questionnaire_answers: answers, questionnaire_report: questionnaireReport } : contact));
      setEditingId(null);
    }
    setSavingAnswers(false);
  }

  async function deleteAnswers(item: SiteContact) {
    if (!window.confirm(`Excluir as respostas do questionário de ${item.full_name}? O contato será mantido.`)) return;
    setError("");
    const { error: updateError } = await supabase.from("site_contact_requests").update({ questionnaire_answers: null, questionnaire_report: null }).eq("id", item.id);
    if (updateError) setError("Não foi possível excluir as respostas do questionário.");
    else {
      setItems(current => current.map(contact => contact.id === item.id ? { ...contact, questionnaire_answers: null, questionnaire_report: null } : contact));
      setEditingId(null);
    }
  }

  async function deleteContact(item: SiteContact) {
    if (!window.confirm(`Excluir o contato de ${item.full_name} e todos os dados vinculados a este pedido? Esta ação não pode ser desfeita.`)) return;
    setError("");
    const { error: deleteError } = await supabase.from("site_contact_requests").delete().eq("id", item.id);
    if (deleteError) setError("Não foi possível excluir o contato.");
    else {
      setItems(current => current.filter(contact => contact.id !== item.id));
      setExpandedId(null);
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
            {item.birth_date && <p className="ml-6 mt-1 text-xs text-slate-500">Nascimento: {formatBirthDateAndAge(item.birth_date)}</p>}
          </div>
          <div className="flex w-full flex-wrap gap-2 sm:w-auto"><Button variant="outline" onClick={() => printReport(item)} disabled={!item.questionnaire_report} title={!item.questionnaire_report ? "Disponível após concluir o questionário" : undefined}><FileText className="mr-2 size-4" />Relatório / PDF</Button><Select value={item.status} onValueChange={value => void updateStatus(item.id, value as SiteContact["status"])}><SelectTrigger className="w-full sm:w-44" aria-label={`Status de ${item.full_name}`}><SelectValue /></SelectTrigger><SelectContent>{statuses.map(status => <SelectItem key={status} value={status}>{status}</SelectItem>)}</SelectContent></Select></div>
        </div>
        {expanded && <div className="border-t border-slate-100 px-4 pb-5 pt-4 sm:px-5">
          {editingContactId === item.id ? <section className="rounded-xl border border-slate-200 bg-slate-50 p-4"><div className="grid gap-4 sm:grid-cols-3"><div className="grid gap-2"><Label htmlFor={`contact-name-${item.id}`}>Nome</Label><Input id={`contact-name-${item.id}`} value={contactDraft.full_name} maxLength={100} onChange={event => setContactDraft(current => ({ ...current, full_name: event.target.value }))} /></div><div className="grid gap-2"><Label htmlFor={`contact-phone-${item.id}`}>WhatsApp</Label><Input id={`contact-phone-${item.id}`} type="tel" inputMode="tel" value={contactDraft.whatsapp} maxLength={20} onChange={event => setContactDraft(current => ({ ...current, whatsapp: event.target.value }))} /></div><div className="grid gap-2"><Label htmlFor={`contact-birth-${item.id}`}>Data de nascimento</Label><Input id={`contact-birth-${item.id}`} type="date" value={contactDraft.birth_date} max={new Date().toISOString().slice(0, 10)} onChange={event => setContactDraft(current => ({ ...current, birth_date: event.target.value }))} /></div></div><div className="mt-4 flex flex-wrap gap-2"><Button size="sm" onClick={() => void saveContact(item)} disabled={savingContact}><Save className="mr-2 size-4" />{savingContact ? "Salvando…" : "Salvar dados"}</Button><Button size="sm" variant="outline" onClick={() => setEditingContactId(null)} disabled={savingContact}><X className="mr-2 size-4" />Cancelar</Button></div></section> : <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex flex-wrap items-center gap-4"><a href={`https://wa.me/${item.whatsapp}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm text-[#26786e] underline"><MessageCircle className="size-4" />{item.whatsapp}</a>{item.birth_date && <p className="text-sm text-slate-600"><strong className="font-medium">Data de nascimento:</strong> {formatBirthDateAndAge(item.birth_date)}</p>}</div><div className="flex items-center gap-3"><time className="text-xs text-slate-400" dateTime={item.created_at}>{new Date(item.created_at).toLocaleString("pt-BR")}</time><Button size="sm" variant="outline" onClick={() => startEditingContact(item)}><Pencil className="mr-2 size-4" />Editar dados</Button></div></div>}
          {hasQuestionnaire && (item.questionnaire_answers && Object.keys(item.questionnaire_answers).length > 0 ? <section className="mt-4 rounded-xl border border-[#cce7df] bg-[#f4faf8] p-4"><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-sm font-semibold text-[#245f57]">Respostas do questionário para avaliação</h3>{editingId === item.id ? <div className="flex gap-2"><Button size="sm" onClick={() => void saveAnswers(item)} disabled={savingAnswers}><Save className="mr-2 size-4" />{savingAnswers ? "Salvando…" : "Salvar"}</Button><Button size="sm" variant="outline" onClick={() => setEditingId(null)} disabled={savingAnswers}><X className="mr-2 size-4" />Cancelar</Button></div> : <div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => startEditing(item)}><Pencil className="mr-2 size-4" />Editar</Button><Button size="sm" variant="outline" className="border-red-200 text-red-700 hover:bg-red-50" onClick={() => void deleteAnswers(item)}><Trash2 className="mr-2 size-4" />Excluir respostas</Button></div>}</div><dl className="mt-4 grid gap-3 sm:grid-cols-2">{Object.entries(item.questionnaire_answers).map(([key, answer]) => <div key={key} className="rounded-lg bg-white p-3"><dt className="text-xs font-semibold text-slate-500">{questionLabels[key] ?? key}</dt><dd className="mt-1 text-sm leading-6 text-slate-800">{editingId === item.id ? <Textarea aria-label={questionLabels[key] ?? key} value={draftAnswers[key] ?? ""} onChange={event => setDraftAnswers(current => ({ ...current, [key]: event.target.value }))} rows={Array.isArray(answer) ? 3 : 2} /> : Array.isArray(answer) ? answer.join(" · ") : answer}</dd>{editingId === item.id && Array.isArray(answer) && <p className="mt-1 text-xs text-slate-500">Em respostas com múltipla escolha, deixe uma opção por linha.</p>}</div>)}</dl></section> : <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Este contato ainda não tem respostas salvas; o questionário pode não ter sido concluído.</p>)}
          {item.questionnaire_report && <section className="mt-4 rounded-xl border border-[#cce7df] bg-[#f4faf8] p-4"><h3 className="text-sm font-semibold text-[#245f57]">Relatório gerado e salvo no contato</h3><pre className="mt-3 whitespace-pre-wrap font-sans text-sm leading-6 text-slate-700">{item.questionnaire_report}</pre></section>}
          <section className="mt-4 rounded-xl border border-slate-200 bg-white p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-sm font-semibold text-slate-800">Observações privadas do profissional</h3><p className="mt-1 text-xs text-slate-500">Incluídas no relatório individual. Somente a equipe autorizada pode consultar.</p></div><Button size="sm" onClick={() => void saveProfessionalNotes(item)} disabled={savingNotesId === item.id}><Save className="mr-2 size-4" />{savingNotesId === item.id ? "Salvando…" : "Salvar observações"}</Button></div><Textarea className="mt-3" aria-label={`Observações privadas do profissional para ${item.full_name}`} value={noteDrafts[item.id] ?? item.professional_notes ?? ""} maxLength={5000} rows={4} onChange={event => setNoteDrafts(current => ({ ...current, [item.id]: event.target.value }))} /></section>
          <div className="mt-5 border-t border-slate-100 pt-4"><Button variant="outline" className="border-red-200 text-red-700 hover:bg-red-50" onClick={() => void deleteContact(item)}><Trash2 className="mr-2 size-4" />Excluir contato</Button></div>
        </div>}
      </CardContent></Card>;
    })}</div>}
  </AdminLayout>;
}
