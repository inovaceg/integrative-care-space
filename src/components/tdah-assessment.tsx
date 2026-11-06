import { useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, Check, ClipboardList, LoaderCircle, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { whatsappNumber } from "@/lib/site-data";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Question = { id: string; title: string; options: string[]; multiple?: boolean; exclusive?: string[] };
type Answers = Record<string, string | string[]>;
const requestType = "Questionário de orientação sobre TDAH";
const functionName = "neuropsych-contact-intake";
const questions: Question[] = [
  { id: "tdah_who", title: "Para quem você está buscando orientação?", options: ["Para mim", "Para meu filho ou minha filha", "Para outro familiar", "Para outra pessoa que acompanho"] },
  { id: "tdah_attention", title: "Quais dificuldades de atenção ou organização você tem observado?", multiple: true, exclusive: ["Não tenho observado essas dificuldades", "Não sei informar"], options: ["Perde o foco durante conversas, aulas, leituras ou tarefas", "Deixa passar detalhes ou comete erros por distração", "Começa tarefas, mas tem dificuldade para concluí-las", "Tem dificuldade para organizar materiais, horários ou prazos", "Adia tarefas que exigem concentração por mais tempo", "Perde objetos importantes ou esquece compromissos e instruções", "Não tenho observado essas dificuldades", "Não sei informar"] },
  { id: "tdah_hyperactivity", title: "Quais sinais de inquietação ou impulsividade você tem observado?", multiple: true, exclusive: ["Não tenho observado esses comportamentos", "Não sei informar"], options: ["Mexe mãos ou pés com frequência ou tem dificuldade para permanecer sentado quando a situação pede", "Sente inquietação ou necessidade de se movimentar em situações que exigem calma", "Responde antes de a pergunta terminar ou interrompe conversas com frequência", "Tem dificuldade para esperar a vez", "Age com pressa, antes de considerar as consequências", "Não tenho observado esses comportamentos", "Não sei informar"] },
  { id: "tdah_frequency", title: "Nos últimos seis meses, com que frequência as dificuldades assinaladas ocorreram?", options: ["Em poucos dias", "Em alguns dias de um mês típico", "Em vários dias de uma semana típica", "Na maioria dos dias", "Não sei informar"] },
  { id: "tdah_onset", title: "Em que fase da vida essas dificuldades foram percebidas pela primeira vez?", options: ["Na infância, antes dos 12 anos", "Na adolescência, dos 12 aos 17 anos", "Na vida adulta, a partir dos 18 anos", "Não sei informar"] },
  { id: "tdah_contexts", title: "Em quais contextos essas dificuldades aparecem?", multiple: true, exclusive: ["Ainda não consegui identificar em quais contextos"], options: ["Em casa ou na rotina familiar", "Na escola ou na faculdade", "No trabalho", "Em atividades sociais ou de lazer", "Ainda não consegui identificar em quais contextos"] },
  { id: "tdah_impact", title: "Quais efeitos essas dificuldades têm na rotina?", multiple: true, exclusive: ["Até agora, não percebi impacto na rotina", "Não sei informar"], options: ["Atrapalham o desempenho escolar, acadêmico ou profissional", "Dificultam o cumprimento de horários, prazos ou compromissos", "Exigem lembretes ou ajuda frequente para concluir tarefas", "Geram conflitos ou dificultam a convivência", "Causam frustração ou desgaste no dia a dia", "Até agora, não percebi impacto na rotina", "Não sei informar"] },
  { id: "tdah_motivation", title: "O que motivou você a buscar orientação agora?", multiple: true, options: ["Quero entender dificuldades que já existem há algum tempo", "As dificuldades ficaram mais frequentes ou passaram a interferir mais na rotina", "Um familiar ou alguém da escola ou do trabalho comentou sobre o que percebeu", "Um profissional de saúde recomendou uma avaliação", "Já existe um diagnóstico de TDAH e busco orientação sobre acompanhamento", "Outro motivo"] },
  { id: "tdah_next_step", title: "Qual próximo passo você deseja?", options: ["Entender como funciona a avaliação", "Consultar valores e disponibilidade", "Solicitar um agendamento", "Apenas conhecer melhor o assunto neste momento"] },
];
const selected = (answer: string | string[] | undefined) => Array.isArray(answer) ? answer : answer ? [answer] : [];

function choose(question: Question, current: string | string[] | undefined, option: string) {
  if (!question.multiple) return option;
  const existing = selected(current);
  if (question.exclusive?.includes(option)) return existing.includes(option) ? [] : [option];
  const remaining = existing.filter(item => !question.exclusive?.includes(item));
  return remaining.includes(option) ? remaining.filter(item => item !== option) : [...remaining, option];
}

function summary(answers: Answers) {
  const value = (key: string) => selected(answers[`tdah_${key}`]).join(", ") || "não informado";
  return [
    `A orientação é buscada para: ${value("who")}.`,
    `Foram relatadas dificuldades de atenção ou organização: ${value("attention")}; e sinais de inquietação ou impulsividade: ${value("hyperactivity")}.`,
    `A frequência indicada nos últimos seis meses foi ${value("frequency")}, com primeira percepção na fase ${value("onset")}.`,
    `Os contextos mencionados foram ${value("contexts")}; os efeitos percebidos na rotina foram ${value("impact")}.`,
    `A busca foi motivada por ${value("motivation")}. O próximo passo desejado é ${value("next_step")}.`,
  ].join(" ");
}

export function TdahAssessment() {
  const [screen, setScreen] = useState<"intro" | "contact" | "questions" | "feedback">("intro");
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [consent, setConsent] = useState(false);
  const [answers, setAnswers] = useState<Answers>({});
  const [index, setIndex] = useState(0);
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const question = questions[index];
  const appointment = answers.tdah_next_step === "Solicitar um agendamento";
  const whatsAppText = appointment ? "Olá! Gostaria de consultar a disponibilidade para conversar sobre orientação relacionada ao TDAH." : "Olá! Gostaria de saber mais sobre orientação relacionada ao TDAH.";

  async function register(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!consent) return setError("Autorize o registro dos dados para continuar.");
    setBusy(true);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke(functionName, { body: { firstName: name, whatsapp, birthDate, requestType, consent } });
      if (invokeError || !data?.received || typeof data.questionnaireToken !== "string") throw new Error("Não foi possível registrar seus dados. Tente novamente.");
      setToken(data.questionnaireToken);
      setScreen("questions");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível registrar seus dados. Tente novamente.");
    } finally { setBusy(false); }
  }

  async function next() {
    if (busy) return;
    if (index < questions.length - 1) { setIndex(value => value + 1); return; }
    setBusy(true);
    setError("");
    try {
      const { data, error: invokeError } = await supabase.functions.invoke(functionName, { body: { action: "save_questionnaire_answers", questionnaireToken: token, answers } });
      if (invokeError || !data?.saved) throw new Error("Não foi possível salvar as respostas. Tente novamente.");
      setScreen("feedback");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível salvar as respostas. Tente novamente.");
    } finally { setBusy(false); }
  }

  return <section className="section-space bg-[#f4f8f7]"><div className="container-site max-w-4xl"><div className="mb-7 flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.16em] text-[#2f8f82]"><ClipboardList className="size-5" />Orientação inicial</div><div className="overflow-hidden rounded-3xl border border-[#dbe8e4] bg-white shadow-sm">
    {screen === "intro" && <div className="px-6 py-10 sm:px-12 sm:py-14"><span className="grid size-14 place-items-center rounded-2xl bg-[#e5f4f0] text-[#26786e]"><ClipboardList className="size-7" /></span><h2 className="mt-6 font-display text-3xl font-semibold text-slate-900 sm:text-4xl">Orientação inicial sobre TDAH</h2><p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">Responda pensando na pessoa para quem você está buscando orientação. Considere o que costuma acontecer na rotina. Suas respostas ajudam a equipe a preparar o primeiro contato. O questionário não gera diagnóstico.</p><Button size="lg" className="mt-8 bg-[#2f8f82] text-white hover:bg-[#26796e]" onClick={() => setScreen("contact")}>Começar questionário <ArrowRight className="ml-2 size-4" /></Button></div>}
    {screen === "contact" && <div className="p-6 sm:p-10"><button type="button" onClick={() => setScreen("intro")} className="mb-6 inline-flex min-h-10 items-center text-sm font-semibold text-slate-600"><ArrowLeft className="mr-2 size-4"/>Voltar</button><h2 className="font-display text-2xl font-semibold text-slate-900">Antes de começar</h2><p className="mt-3 leading-7 text-slate-600">Informe seu nome e WhatsApp para contato, além da data de nascimento da pessoa para quem busca orientação. Se estiver respondendo por uma criança ou adolescente, informe o contato do responsável.</p><form className="mt-7 grid gap-5" onSubmit={event => void register(event)}><div className="grid gap-2"><Label htmlFor="tdah-name">Nome</Label><Input id="tdah-name" value={name} onChange={event => setName(event.target.value)} autoComplete="name" maxLength={100} required /></div><div className="grid gap-2"><Label htmlFor="tdah-whatsapp">WhatsApp com DDD</Label><Input id="tdah-whatsapp" value={whatsapp} onChange={event => setWhatsapp(event.target.value)} type="tel" inputMode="tel" autoComplete="tel" placeholder="(32) 99999-9999" maxLength={20} required /></div><div className="grid gap-2"><Label htmlFor="tdah-birth">Data de nascimento da pessoa avaliada</Label><Input id="tdah-birth" type="date" value={birthDate} onChange={event => setBirthDate(event.target.value)} max={new Date().toISOString().slice(0, 10)} required /></div><label className="flex items-start gap-3 rounded-xl border border-slate-200 p-4 text-sm leading-6"><Checkbox checked={consent} onCheckedChange={value => setConsent(value === true)} aria-label="Autorizar armazenamento dos dados e respostas"/><span>Autorizo o registro dos dados de contato e da data de nascimento, além do armazenamento das respostas para consulta pela equipe autorizada. Li o <a href="/politica-de-privacidade" target="_blank" rel="noreferrer" className="font-semibold underline">aviso de privacidade</a>.</span></label>{error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}<Button type="submit" size="lg" disabled={busy || !consent} className="w-fit bg-[#2f8f82] text-white hover:bg-[#26796e]">{busy ? <><LoaderCircle className="mr-2 size-4 animate-spin"/>Registrando…</> : "Continuar para as perguntas"}</Button></form></div>}
    {screen === "questions" && <section className="p-6 sm:p-10"><div className="mb-8"><div className="flex justify-between text-sm text-slate-500"><span>Pergunta {index + 1} de {questions.length}</span><span>{Math.round((index + 1) / questions.length * 100)}%</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#2f8f82]" style={{ width: `${(index + 1) / questions.length * 100}%` }}/></div></div><h2 className="font-display text-2xl font-semibold leading-snug text-slate-900 sm:text-3xl">{question.title}</h2><p className="mt-2 text-sm text-slate-500">{question.multiple ? "Marque todas as opções que se aplicam." : "Selecione uma opção."}</p><div className="mt-6 grid gap-3" role={question.multiple ? "group" : "radiogroup"} aria-label={question.title}>{question.options.map(option => { const isSelected = selected(answers[question.id]).includes(option); return <button type="button" key={option} role={question.multiple ? "checkbox" : "radio"} aria-checked={isSelected} onClick={() => setAnswers(current => ({ ...current, [question.id]: choose(question, current[question.id], option) }))} className={`flex min-h-14 items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left text-base transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f8f82] focus-visible:ring-offset-2 ${isSelected ? "border-[#2f8f82] bg-[#eff9f6] text-[#1e625a]" : "border-slate-200 bg-white text-slate-700 hover:border-[#9bcfc3] hover:bg-slate-50"}`}><span>{option}</span>{isSelected && <Check className="size-5 shrink-0 text-[#2f8f82]"/>}</button>; })}</div>{error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}<div className="mt-7 flex justify-between gap-3"><Button variant="outline" onClick={() => index ? setIndex(value => value - 1) : setScreen("contact")}><ArrowLeft className="mr-2 size-4"/>Voltar</Button><Button disabled={!selected(answers[question.id]).length || busy} onClick={() => void next()}>{busy ? <><LoaderCircle className="mr-2 size-4 animate-spin"/>Salvando…</> : index === questions.length - 1 ? "Concluir" : <>Continuar<ArrowRight className="ml-2 size-4"/></>}</Button></div><p className="mt-5 text-xs text-slate-500">As respostas serão registradas no pedido após a conclusão e consultadas somente pela equipe autorizada.</p></section>}
    {screen === "feedback" && <div className="p-6 sm:p-10"><h2 className="font-display text-3xl font-semibold text-slate-900 sm:text-4xl">Sua orientação inicial</h2><article className="mt-6 rounded-2xl border border-[#dbe8e4] bg-[#f7fbfa] p-5"><h3 className="font-semibold text-[#245f57]">Resumo do que você compartilhou</h3><p className="mt-2 leading-7 text-slate-700">{summary(answers)}</p></article><p className="mt-5 rounded-lg bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">Este questionário é informativo e não gera diagnóstico. A avaliação e a orientação são discutidas com o profissional.</p><a href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsAppText)}`} target="_blank" rel="noreferrer" className="mt-7 inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-[#2f8f82] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#26796e]">{appointment ? "Solicitar agendamento pelo WhatsApp" : "Falar com a equipe"}<MessageCircle className="size-4"/></a></div>}
  </div></div></section>;
}
