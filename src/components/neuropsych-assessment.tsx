import { useEffect, useMemo, useState, type FormEvent, type KeyboardEvent } from "react";
import { ArrowLeft, ArrowRight, Check, ClipboardList, LoaderCircle, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { whatsappNumber } from "@/lib/site-data";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Question = { id: string; title: string; options: string[]; multiple?: boolean; exclusive?: string[] };
type Answers = Record<string, string | string[]>;
type NextRequest = "Tirar dúvidas sobre a avaliação" | "Consultar valores e horários" | "Solicitar uma conversa inicial";
type Screen = "intro" | "contact" | "question" | "feedback";
const intakeFunctionName = "neuropsych-contact-intake";
const questions: Question[] = [
  { id: "who", title: "Para quem você está buscando informações?", options: ["Para mim", "Para meu filho ou minha filha", "Para outra pessoa da família", "Para outra pessoa que acompanho"] },
  { id: "age", title: "Qual é a faixa etária da pessoa?", options: ["Até 11 anos", "De 12 a 17 anos", "De 18 a 59 anos", "60 anos ou mais", "Prefiro não informar"] },
  { id: "reason", title: "O que levou você a procurar informações agora?", multiple: true, exclusive: ["Quero apenas entender como funciona a avaliação", "Prefiro não responder"], options: ["Percebi dificuldades que têm chamado atenção no dia a dia", "Alguém da família, da escola ou do trabalho comentou sobre uma dificuldade ou mudança", "Um profissional sugeriu uma avaliação", "Percebi mudanças depois de um acontecimento relacionado à saúde", "Quero apenas entender como funciona a avaliação", "Prefiro não responder"] },
  { id: "areas", title: "O que você tem observado?", multiple: true, exclusive: ["Ainda não sei identificar", "Prefiro não responder"], options: ["Perder o foco ou se distrair durante uma atividade", "Esquecer conversas, instruções ou compromissos", "Ter dificuldade para começar, organizar ou concluir tarefas", "Demorar mais para entender informações ou responder", "Ter dificuldade para aprender, ler, escrever ou fazer contas", "Ter dificuldade para entender o que foi dito, encontrar palavras ou explicar uma ideia", "Ter dificuldade para lidar com mudanças de plano ou passar de uma tarefa para outra", "Outra dificuldade", "Ainda não sei identificar", "Prefiro não responder"] },
  { id: "onset", title: "Quando você começou a perceber essas dificuldades?", options: ["Há menos de 1 mês", "De 1 a 6 meses atrás", "Há mais de 6 meses e menos de 1 ano", "Há 1 ano ou mais", "Não sei dizer", "Prefiro não responder"] },
  { id: "change", title: "Desde que você percebeu essas dificuldades, como elas mudaram?", options: ["Ficaram mais perceptíveis", "Continuam parecidas", "Ficaram menos perceptíveis", "Alternam entre períodos em que aparecem mais e períodos em que aparecem menos", "Percebi há pouco tempo e ainda não consigo comparar", "Não sei dizer", "Prefiro não responder"] },
  { id: "frequency", title: "Em quantos dias das últimas quatro semanas você percebeu alguma dessas dificuldades?", options: ["Em nenhum dia", "De 1 a 3 dias", "De 4 a 13 dias", "Em 14 dias ou mais", "Não sei estimar", "Prefiro não responder"] },
  { id: "contexts", title: "Em quais situações você percebe essas dificuldades?", multiple: true, exclusive: ["Ainda não identifiquei uma situação", "Prefiro não responder"], options: ["Em tarefas de casa ou de cuidado pessoal", "Durante aulas, estudos ou tarefas escolares", "Durante atividades do trabalho", "Em conversas ou atividades sociais", "Ao lidar com compromissos, compras, pagamentos ou deslocamentos", "Ainda não identifiquei uma situação", "Prefiro não responder"] },
  { id: "conditions", title: "Em que condições essas dificuldades costumam aparecer mais?", multiple: true, exclusive: ["Aparecem em condições variadas", "Ainda não identifiquei um padrão", "Prefiro não responder"], options: ["Quando há barulho, interrupções ou distrações", "Quando preciso lidar com várias coisas ao mesmo tempo", "Quando a tarefa é nova ou tem muitas etapas", "Quando há pressa ou pressão", "Quando há cansaço ou pouco sono", "Aparecem em condições variadas", "Ainda não identifiquei um padrão", "Prefiro não responder"] },
  { id: "impact", title: "O que acontece com as atividades quando a dificuldade aparece?", multiple: true, exclusive: ["Ainda não consigo avaliar o impacto", "Prefiro não responder"], options: ["Consigo manter as atividades como de costume", "Preciso de mais tempo ou esforço", "Preciso de lembretes, ajuda ou adaptações", "Algumas atividades são adiadas, evitadas ou ficam sem terminar", "Ainda não consigo avaliar o impacto", "Prefiro não responder"] },
  { id: "helps", title: "O que costuma ajudar nessas situações?", multiple: true, exclusive: ["Ainda não identifiquei o que ajuda", "Prefiro não responder"], options: ["Usar listas, agendas, alarmes ou lembretes", "Dividir a atividade em etapas menores", "Fazer a tarefa em um ambiente com menos distrações", "Ter mais tempo ou receber instruções mais claras", "Contar com o apoio de outra pessoa", "Ainda não identifiquei o que ajuda", "Prefiro não responder"] },
  { id: "goal", title: "Qual próximo passo seria mais útil para você agora?", options: ["Entender como funciona a avaliação e a devolutiva", "Saber o que levar depois de receber um encaminhamento", "Tirar dúvidas com a equipe", "Consultar valores e horários", "Solicitar uma primeira conversa", "Por enquanto, quero apenas ver minha orientação"] },
];
const allQuestionIds = questions.map(question => question.id);
const uncertainty = new Set(["Prefiro não responder", "Ainda não sei identificar", "Ainda não identifiquei uma situação", "Ainda não identifiquei um padrão", "Ainda não consigo avaliar o impacto", "Ainda não identifiquei o que ajuda", "Não sei dizer", "Não sei estimar", "Percebi há pouco tempo e ainda não consigo comparar"]);

function selectedValues(answer: string | string[] | undefined) {
  return Array.isArray(answer) ? answer : answer ? [answer] : [];
}

function toggleChoice(question: Question, current: string | string[] | undefined, option: string): string | string[] {
  if (!question.multiple) return option;
  const existing = selectedValues(current);
  if (question.exclusive?.includes(option)) return existing.includes(option) ? [] : [option];
  const kept = existing.filter(value => !question.exclusive?.includes(value));
  return kept.includes(option) ? kept.filter(value => value !== option) : [...kept, option];
}

function requestForGoal(goal: string | string[] | undefined): NextRequest {
  if (goal === "Consultar valores e horários") return "Consultar valores e horários";
  if (goal === "Solicitar uma primeira conversa") return "Solicitar uma conversa inicial";
  return "Tirar dúvidas sobre a avaliação";
}

function buildFeedback(answers: Answers) {
  const areas = selectedValues(answers.areas).filter(value => !uncertainty.has(value));
  const contexts = selectedValues(answers.contexts).filter(value => !uncertainty.has(value));
  const impacts = selectedValues(answers.impact).filter(value => !uncertainty.has(value));
  const helps = selectedValues(answers.helps).filter(value => !uncertainty.has(value));
  const conditions = selectedValues(answers.conditions).filter(value => !uncertainty.has(value));
  const pieces: string[] = [];
  if (areas.length) pieces.push(`Você observou ${areas.slice(0, 2).map(value => value.charAt(0).toLowerCase() + value.slice(1)).join(" e ")}`);
  if (contexts.length) pieces.push(`principalmente ${contexts[0].toLowerCase()}`);
  else if (conditions.length) pieces.push(`sobretudo ${conditions[0].toLowerCase()}`);
  if (impacts.length) pieces.push(impacts[0].charAt(0).toLowerCase() + impacts[0].slice(1));
  else if (helps.length) pieces.push(`e relatou que ${helps[0].charAt(0).toLowerCase() + helps[0].slice(1)} costuma ajudar`);

  const tips: string[] = [];
  if (pieces.length) tips.push("Vale lembrar de uma situação recente e concreta: qual era a atividade, o que aconteceu e o que ajudou ou dificultou.");
  if (selectedValues(answers.reason).includes("Um profissional sugeriu uma avaliação")) tips.push("Se já estiver com o encaminhamento, você pode tê-lo à mão para a conversa.");
  if (!tips.length) tips.push("Se desejar, pense em uma situação cotidiana que gostaria de compreender melhor. Um exemplo concreto pode ajudar a iniciar a conversa.");
  return {
    observation: pieces.length ? `${pieces.join(", ")}.` : "Você informou poucos detalhes ou preferiu não responder a alguns itens. A conversa pode começar pelas dúvidas que deseja esclarecer.",
    tips,
  };
}

export function NeuropsychAssessment() {
  const [screen, setScreen] = useState<Screen>("intro");
  const [answers, setAnswers] = useState<Answers>({});
  const [questionIndex, setQuestionIndex] = useState(0);
  const [firstName, setFirstName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [requestType, setRequestType] = useState<NextRequest>("Tirar dúvidas sobre a avaliação");
  const [contactRegistered, setContactRegistered] = useState(false);

  const skipDetails = selectedValues(answers.reason).includes("Quero apenas entender como funciona a avaliação");
  const path = useMemo(() => skipDetails ? [...allQuestionIds.slice(0, 3), "goal"] : allQuestionIds, [skipDetails]);
  useEffect(() => {
    if (!skipDetails) return;
    setAnswers(current => {
      const next = { ...current };
      for (const id of ["areas", "onset", "change", "frequency", "contexts", "conditions", "impact", "helps"]) delete next[id];
      return next;
    });
  }, [skipDetails]);
  const currentId = path[questionIndex];
  const question = questions.find(item => item.id === currentId);
  const feedback = useMemo(() => buildFeedback(answers), [answers]);
  const wantsProcessInfo = answers.goal === "Entender como funciona a avaliação e a devolutiva" || skipDetails;
  const moreInfoUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`Olá! Gostaria de ${requestType.toLowerCase()}.`)}`;

  function goBack() {
    if (questionIndex === 0) setScreen("intro");
    else setQuestionIndex(index => index - 1);
  }

  function goForward() {
    if (!question) return;
    if (questionIndex < path.length - 1) setQuestionIndex(index => index + 1);
    else {
      setRequestType(requestForGoal(answers.goal));
      setScreen("feedback");
    }
  }

  function handleQuestionKey(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "ArrowLeft") { event.preventDefault(); goBack(); }
    if (event.key === "ArrowRight" && (question?.multiple ? selectedValues(answers[question.id]).length > 0 : Boolean(answers[question?.id ?? ""]))) {
      event.preventDefault(); goForward();
    }
  }

  async function registerBeforeQuestionnaire(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!event.currentTarget.reportValidity()) return;
    setSubmitError("");
    if (!consent) { setSubmitError("Marque a autorização para registrar seus dados de contato."); return; }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke(intakeFunctionName, {
        body: { firstName, whatsapp, requestType: "Questionário de orientação neuropsicológica", consent },
      });
      if (error || !data?.received) throw new Error("Não foi possível registrar seus dados agora. Tente novamente.");
      setContactRegistered(true);
      setScreen("question");
    } catch (cause) {
      setSubmitError(cause instanceof Error ? cause.message : "Não foi possível registrar seus dados agora. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  return <section className="section-space bg-[#f4f8f7]">
    <div className="container-site max-w-4xl">
      <div className="mb-7 flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.16em] text-[#2f8f82]"><ClipboardList className="size-5" />Orientação inicial</div>
      <div className="overflow-hidden rounded-3xl border border-[#dbe8e4] bg-white shadow-sm">
        {screen === "intro" && <div className="px-6 py-10 sm:px-12 sm:py-14"><span className="grid size-14 place-items-center rounded-2xl bg-[#e5f4f0] text-[#26786e]"><ClipboardList className="size-7" /></span><h2 className="mt-6 max-w-2xl font-display text-3xl font-semibold leading-tight text-slate-900 sm:text-4xl">Avaliação neuropsicológica. Por onde começar?</h2><p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">Antes de começar, informe seu primeiro nome e WhatsApp. Depois, responda às perguntas para organizar o que tem observado. Ao final, você receberá uma orientação e poderá pedir mais informações à equipe do Dr. Frederick.</p><Button size="lg" className="mt-8 bg-[#2f8f82] text-white hover:bg-[#26796e]" onClick={() => setScreen(contactRegistered ? "question" : "contact")}>{contactRegistered ? "Continuar questionário" : "Começar questionário"} <ArrowRight className="ml-2 size-4" /></Button></div>}
        {screen === "contact" && <div className="p-6 sm:p-10"><button type="button" onClick={() => setScreen("intro")} className="mb-6 inline-flex min-h-10 items-center text-sm font-semibold text-slate-600 hover:text-slate-900"><ArrowLeft className="mr-2 size-4" />Voltar</button><h2 className="font-display text-2xl font-semibold text-slate-900 sm:text-3xl">Antes de começar</h2><p className="mt-3 leading-7 text-slate-600">Informe seu primeiro nome e WhatsApp. Se estiver respondendo por uma criança ou adolescente, informe o contato do responsável. Esses dados são registrados após sua autorização e não serão associados às respostas.</p><form className="mt-7 grid gap-5" onSubmit={event => void registerBeforeQuestionnaire(event)}><div className="grid gap-2"><Label htmlFor="assessment-first-name">Primeiro nome</Label><Input id="assessment-first-name" value={firstName} onChange={event => setFirstName(event.target.value)} autoComplete="given-name" maxLength={60} required /></div><div className="grid gap-2"><Label htmlFor="assessment-whatsapp">WhatsApp com DDD</Label><Input id="assessment-whatsapp" value={whatsapp} onChange={event => setWhatsapp(event.target.value)} type="tel" inputMode="tel" autoComplete="tel" placeholder="(32) 99999-9999" maxLength={20} required /></div><label className="flex items-start gap-3 rounded-xl border border-slate-200 p-4 text-sm leading-6"><Checkbox checked={consent} onCheckedChange={value => setConsent(value === true)} aria-label="Autorizar o registro e contato pelo WhatsApp" /><span>Autorizo o registro do meu primeiro nome e WhatsApp para retorno sobre este questionário. Li o <a href="/politica-de-privacidade" target="_blank" rel="noreferrer" className="font-semibold underline underline-offset-2">aviso de privacidade</a>.</span></label>{submitError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{submitError}</p>}<Button type="submit" size="lg" disabled={submitting || !consent} className="w-fit bg-[#2f8f82] text-white hover:bg-[#26796e]">{submitting ? <><LoaderCircle className="mr-2 size-4 animate-spin" />Registrando…</> : "Continuar para as perguntas"}</Button></form></div>}
        {screen === "question" && question && <section className="p-6 sm:p-10" onKeyDown={handleQuestionKey} aria-labelledby="question-title"><div className="mb-8" aria-live="polite"><div className="flex items-center justify-between gap-3 text-sm text-slate-500"><span>Pergunta {questionIndex + 1} de {path.length}</span><span>{Math.round(((questionIndex + 1) / path.length) * 100)}%</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#2f8f82] transition-all" style={{ width: `${((questionIndex + 1) / path.length) * 100}%` }} /></div></div><h2 id="question-title" className="font-display text-2xl font-semibold leading-snug text-slate-900 sm:text-3xl">{question.title}</h2>{question.multiple && <p className="mt-2 text-sm text-slate-500">Você pode marcar mais de uma opção.</p>}<div className="mt-6 grid gap-3" role={question.multiple ? "group" : "radiogroup"} aria-label={question.title}>{question.options.map(option => { const selected = selectedValues(answers[question.id]).includes(option); return <button key={option} type="button" role={question.multiple ? "checkbox" : "radio"} aria-checked={selected} onClick={() => setAnswers(current => ({ ...current, [question.id]: toggleChoice(question, current[question.id], option) }))} className={`flex min-h-14 items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left text-base transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f8f82] focus-visible:ring-offset-2 ${selected ? "border-[#2f8f82] bg-[#eff9f6] text-[#1e625a]" : "border-slate-200 bg-white text-slate-700 hover:border-[#9bcfc3] hover:bg-slate-50"}`}><span>{option}</span>{selected && <Check className="size-5 shrink-0 text-[#2f8f82]" />}</button>; })}</div><div className="mt-7 flex flex-wrap justify-between gap-3"><Button variant="outline" onClick={goBack}><ArrowLeft className="mr-2 size-4" />Voltar</Button><Button disabled={question.multiple ? selectedValues(answers[question.id]).length === 0 : !answers[question.id]} onClick={goForward}>Continuar<ArrowRight className="ml-2 size-4" /></Button></div><p className="mt-5 text-xs text-slate-500">Suas respostas ficam apenas na memória desta página e não são armazenadas.</p></section>}
        {screen === "feedback" && <div className="p-6 sm:p-10"><h2 className="font-display text-3xl font-semibold text-slate-900 sm:text-4xl">O que pode ajudar na sua primeira conversa</h2><article className="mt-6 rounded-2xl border border-[#dbe8e4] bg-[#f7fbfa] p-5"><p className="leading-7 text-slate-700">{feedback.observation}</p></article><article className="mt-4 rounded-2xl border border-slate-200 p-5"><h3 className="font-semibold text-slate-800">Uma ideia para levar</h3><ul className="mt-2 list-disc space-y-2 pl-5 leading-7 text-slate-700">{feedback.tips.map(tip => <li key={tip}>{tip}</li>)}</ul></article>{wantsProcessInfo && <article className="mt-4 rounded-2xl border border-slate-200 p-5"><h3 className="font-semibold text-slate-800">Como funciona</h3><p className="mt-2 leading-7 text-slate-700">A avaliação começa com uma conversa para compreender a demanda. O profissional define as próximas etapas e, ao final do processo, conversa sobre os resultados e a devolutiva.</p></article>}<p className="mt-6 rounded-lg bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">Este questionário é informativo. A indicação de uma avaliação é discutida com o profissional.</p><div className="mt-7 flex flex-wrap gap-3"><a href={moreInfoUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-[#2f8f82] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#26796e]">Saiba mais pelo WhatsApp <MessageCircle className="size-4" /></a><Button variant="outline" onClick={() => { setAnswers({}); setQuestionIndex(0); setScreen("question"); }}>Recomeçar questionário</Button></div></div>}
      </div>
    </div>
  </section>;
}
