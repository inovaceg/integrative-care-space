import { useMemo, useState, type FormEvent, type KeyboardEvent } from "react";
import { ArrowLeft, ArrowRight, Check, ClipboardList, LoaderCircle, MessageCircle, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Question = { id: string; title: string; options: string[]; multiple?: boolean; exclusive?: string[] };
type Answers = Record<string, string | string[]>;
type NextRequest = "Tirar dúvidas sobre a avaliação" | "Consultar valores e horários" | "Solicitar uma conversa inicial";
const intakeFunctionUrl = "https://fusqpjescampwoyazceu.supabase.co/functions/v1/neuropsych-contact-intake";
const intakeFunctionName = new URL(intakeFunctionUrl).pathname.split("/").pop()!;

const questions: Question[] = [
  { id: "who", title: "Para quem você está buscando informações?", options: ["Para mim", "Para meu filho ou minha filha", "Para outro familiar ou pessoa que acompanho"] },
  { id: "age", title: "Qual é a faixa etária da pessoa?", options: ["Criança até 11 anos", "Adolescente de 12 a 17 anos", "Adulto de 18 a 59 anos", "Pessoa com 60 anos ou mais", "Prefiro não informar"] },
  { id: "reason", title: "O que motivou sua busca?", options: ["Percebi dificuldades no dia a dia", "A família ou a escola percebeu mudanças", "Recebi um encaminhamento profissional", "Percebi mudanças após uma condição de saúde", "Quero entender como funciona"] },
  { id: "areas", title: "Em quais áreas você percebe alguma dificuldade?", multiple: true, exclusive: ["Ainda não sei ou prefiro não informar", "Prefiro não responder"], options: ["Manter a atenção ou terminar tarefas", "Lembrar informações ou compromissos", "Organizar tarefas e planejar a rotina", "Aprender, ler, escrever ou fazer contas", "Compreender ou se expressar", "Outra dificuldade", "Ainda não sei ou prefiro não informar", "Prefiro não responder"] },
  { id: "onset", title: "Quando a dificuldade começou a chamar atenção?", options: ["Já era percebida desde a infância", "Apareceu mais tarde", "Começou recentemente", "Ficou perceptível depois de um evento de saúde", "Não sei dizer", "Prefiro não responder"] },
  { id: "change", title: "Como a situação mudou desde então?", options: ["Continua parecida", "Ficou mais perceptível", "Varia bastante conforme a situação", "Tem melhorado", "Não sei dizer", "Prefiro não responder"] },
  { id: "frequency", title: "Com que frequência isso acontece?", options: ["Em situações pontuais", "Em alguns dias da semana", "Na maioria dos dias", "Varia muito", "Não sei dizer", "Prefiro não responder"] },
  { id: "contexts", title: "Onde você costuma perceber isso?", multiple: true, exclusive: ["Ainda não identifiquei", "Prefiro não responder"], options: ["Em casa", "Na escola ou faculdade", "No trabalho", "Em atividades sociais", "Em tarefas do dia a dia, como organizar compromissos", "Ainda não identifiquei", "Prefiro não responder"] },
  { id: "impact", title: "Na prática, quanto isso interfere na rotina?", options: ["Percebo a dificuldade, mas sigo fazendo as atividades como antes", "Algumas tarefas exigem mais tempo ou esforço", "Preciso de ajuda ou adaptações em algumas atividades", "Ainda não consigo avaliar o impacto", "Prefiro não responder"] },
  { id: "goal", title: "O que você espera esclarecer numa conversa inicial?", options: ["Entender melhor as dificuldades observadas", "Conversar sobre um encaminhamento", "Entender como funciona a avaliação e a devolutiva", "Saber valores e horários", "Agendar uma conversa inicial"] },
];
const allQuestionIds = questions.map(question => question.id);
const noAnswer = new Set(["Ainda não sei ou prefiro não informar", "Ainda não identifiquei", "Não sei dizer", "Ainda não consigo avaliar o impacto", "Prefiro não responder"]);

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

function buildFeedback(answers: Answers) {
  const areas = selectedValues(answers.areas).filter(value => !noAnswer.has(value));
  const contexts = selectedValues(answers.contexts).filter(value => !noAnswer.has(value));
  const observation: string[] = [];
  if (areas.length) observation.push(`Você percebe ${areas.slice(0, 2).map(value => value.toLowerCase()).join(" e ")}`);
  if (answers.frequency && !noAnswer.has(String(answers.frequency))) observation.push(`com frequência ${String(answers.frequency).toLowerCase()}`);
  if (contexts.length) observation.push(`principalmente ${contexts.map(value => value.toLowerCase()).join(", ")}`);

  const tips: string[] = [];
  if (answers.onset && !noAnswer.has(String(answers.onset))) tips.push(`Anote quando isso começou a chamar atenção: ${String(answers.onset).toLowerCase()}.`);
  if (answers.change === "Ficou mais perceptível") tips.push("Pode ajudar comparar um exemplo concreto de uma tarefa de antes com a mesma tarefa hoje.");
  else if (answers.change === "Varia bastante conforme a situação") tips.push("Anote em quais situações a dificuldade aparece mais e em quais aparece menos.");
  else if (answers.change === "Tem melhorado") tips.push("Se puder, leve um exemplo de algo que ficou mais fácil e quando percebeu essa mudança.");
  else if (answers.change === "Continua parecida") tips.push("Um exemplo recente de uma tarefa que continua parecida pode ajudar a explicar a situação.");
  if (contexts.length > 1) tips.push(`Se puder, leve um exemplo de cada ambiente que mencionou: ${contexts.join(", ")}.`);
  if (answers.impact && !noAnswer.has(String(answers.impact))) tips.push(`Você informou que ${String(answers.impact).toLowerCase()}. Pense em uma atividade concreta que ilustre esse impacto.`);
  if (answers.reason === "Recebi um encaminhamento profissional") tips.push("Se já tiver o encaminhamento, você pode levá-lo à conversa.");
  if (["Criança até 11 anos", "Adolescente de 12 a 17 anos"].includes(String(answers.age))) {
    tips.push("Para crianças e adolescentes, exemplos observados em casa e na escola podem ajudar, quando disponíveis.");
  }
  if (!tips.length && answers.impact && !noAnswer.has(String(answers.impact))) tips.push(`Você informou que ${String(answers.impact).toLowerCase()}. Um exemplo recente dessa situação pode ajudar a iniciar a conversa.`);
  if (!tips.length) tips.push("Se desejar, pense em uma situação cotidiana que gostaria de compreender melhor e leve esse exemplo para a conversa.");
  return {
    observation: observation.length ? `${observation.join(", ")}.` : "Você optou por não detalhar dificuldades específicas. A conversa inicial pode começar pelas dúvidas que deseja esclarecer.",
    tips,
  };
}

function requestForGoal(goal: string | string[] | undefined): NextRequest {
  if (goal === "Saber valores e horários") return "Consultar valores e horários";
  if (goal === "Agendar uma conversa inicial") return "Solicitar uma conversa inicial";
  return "Tirar dúvidas sobre a avaliação";
}

export function NeuropsychAssessment() {
  const [screen, setScreen] = useState<"intro" | "question" | "feedback" | "contact" | "sent">("intro");
  const [answers, setAnswers] = useState<Answers>({});
  const [questionIndex, setQuestionIndex] = useState(0);
  const [firstName, setFirstName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [requestType, setRequestType] = useState<NextRequest>("Tirar dúvidas sobre a avaliação");

  const path = useMemo(() => answers.reason === "Quero entender como funciona"
    ? [...allQuestionIds.slice(0, 3), "goal"]
    : allQuestionIds, [answers.reason]);
  const currentId = path[questionIndex];
  const question = questions.find(item => item.id === currentId);
  const feedback = useMemo(() => buildFeedback(answers), [answers]);
  const isMinor = answers.age === "Criança até 11 anos" || answers.age === "Adolescente de 12 a 17 anos";

  function goBack() {
    if (screen === "contact") { setScreen("feedback"); return; }
    if (screen === "feedback") { setScreen("question"); setQuestionIndex(path.length - 1); return; }
    if (screen === "question") {
      if (questionIndex === 0) setScreen("intro");
      else setQuestionIndex(index => index - 1);
    }
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

  async function submitContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError("");
    if (!consent) { setSubmitError("Marque a autorização para que a equipe possa entrar em contato pelo WhatsApp."); return; }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke(intakeFunctionName, {
        body: { firstName, whatsapp, requestType, consent },
      });
      if (error || !data?.received) throw new Error("Não foi possível registrar seu pedido agora. Tente novamente mais tarde.");
      setScreen("sent");
    } catch (cause) {
      setSubmitError(cause instanceof Error ? cause.message : "Não foi possível registrar seu pedido agora. Tente novamente mais tarde.");
    } finally {
      setSubmitting(false);
    }
  }

  return <section className="section-space bg-[#f4f8f7]">
    <div className="container-site max-w-4xl">
      <div className="mb-7 flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.16em] text-[#2f8f82]"><ClipboardList className="size-5" />Orientação inicial</div>
      <div className="overflow-hidden rounded-3xl border border-[#dbe8e4] bg-white shadow-sm">
        {screen === "intro" && <div className="px-6 py-10 sm:px-12 sm:py-14"><span className="grid size-14 place-items-center rounded-2xl bg-[#e5f4f0] text-[#26786e]"><ClipboardList className="size-7" /></span><h2 className="mt-6 max-w-2xl font-display text-3xl font-semibold leading-tight text-slate-900 sm:text-4xl">Entenda o que levar para uma primeira conversa sobre avaliação neuropsicológica.</h2><p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">Responda a algumas perguntas opcionais de orientação. Não há pontuação, classificação de risco ou diagnóstico, e suas respostas não serão enviadas nem armazenadas.</p><Button size="lg" className="mt-8 bg-[#2f8f82] text-white hover:bg-[#26796e]" onClick={() => setScreen("question")}>Começar questionário <ArrowRight className="ml-2 size-4" /></Button></div>}
        {screen === "question" && question && <section className="p-6 sm:p-10" onKeyDown={handleQuestionKey} aria-labelledby="question-title">
          <div className="mb-8" aria-live="polite"><div className="flex items-center justify-between gap-3 text-sm text-slate-500"><span>Pergunta {questionIndex + 1} de {path.length}</span><span>{Math.round(((questionIndex + 1) / path.length) * 100)}%</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#2f8f82] transition-all" style={{ width: `${((questionIndex + 1) / path.length) * 100}%` }} /></div></div>
          <h2 id="question-title" className="font-display text-2xl font-semibold leading-snug text-slate-900 sm:text-3xl">{question.title}</h2>
          {question.multiple && <p className="mt-2 text-sm text-slate-500">Você pode marcar mais de uma opção.</p>}
          <div className="mt-6 grid gap-3" role={question.multiple ? "group" : "radiogroup"} aria-label={question.title}>
            {question.options.map(option => {
              const selected = selectedValues(answers[question.id]).includes(option);
              return <button key={option} type="button" role={question.multiple ? "checkbox" : "radio"} aria-checked={selected} onClick={() => setAnswers(current => {
                const next = { ...current, [question.id]: toggleChoice(question, current[question.id], option) };
                if (question.id === "reason" && option === "Quero entender como funciona") {
                  for (const hiddenId of ["areas", "onset", "change", "frequency", "contexts", "impact"]) delete next[hiddenId];
                }
                return next;
              })} className={`flex min-h-14 items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left text-base transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f8f82] focus-visible:ring-offset-2 ${selected ? "border-[#2f8f82] bg-[#eff9f6] text-[#1e625a]" : "border-slate-200 bg-white text-slate-700 hover:border-[#9bcfc3] hover:bg-slate-50"}`}><span>{option}</span>{selected && <Check className="size-5 shrink-0 text-[#2f8f82]" />}</button>;
            })}
          </div>
          <div className="mt-7 flex flex-wrap justify-between gap-3"><Button variant="outline" onClick={goBack}><ArrowLeft className="mr-2 size-4" />Voltar</Button><Button disabled={question.multiple ? selectedValues(answers[question.id]).length === 0 : !answers[question.id]} onClick={goForward}>Continuar<ArrowRight className="ml-2 size-4" /></Button></div>
          <p className="mt-5 text-xs text-slate-500">Você pode mudar suas respostas ao voltar. As respostas ficam apenas na memória desta página.</p>
        </section>}
        {screen === "feedback" && <div className="p-6 sm:p-10"><button type="button" onClick={goBack} className="mb-7 inline-flex min-h-10 items-center text-sm font-semibold text-slate-600 hover:text-slate-900"><ArrowLeft className="mr-2 size-4" />Voltar às respostas</button><h2 className="font-display text-3xl font-semibold text-slate-900 sm:text-4xl">O que pode ajudar na sua conversa inicial</h2><div className="mt-7 grid gap-4"><article className="rounded-2xl border border-[#dbe8e4] bg-[#f7fbfa] p-5"><h3 className="font-semibold text-[#245f57]">O que você percebeu</h3><p className="mt-2 leading-7 text-slate-700">{feedback.observation}</p></article><article className="rounded-2xl border border-slate-200 p-5"><h3 className="font-semibold text-slate-800">O que vale levar à conversa</h3><ul className="mt-2 list-disc space-y-2 pl-5 leading-7 text-slate-700">{feedback.tips.map(tip => <li key={tip}>{tip}</li>)}</ul></article><article className="rounded-2xl border border-slate-200 p-5"><h3 className="font-semibold text-slate-800">Próximo passo</h3><p className="mt-2 leading-7 text-slate-700">{answers.reason === "Quero entender como funciona" ? "Uma avaliação pode incluir entrevista, observação e instrumentos selecionados pelo profissional, conforme a demanda e a conversa inicial." : "Se desejar, você pode pedir contato para tirar dúvidas, consultar valores e horários ou solicitar uma conversa inicial."}</p></article></div><p className="mt-6 rounded-lg bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">Este retorno é informativo. A indicação de uma avaliação é discutida com o profissional.</p><div className="mt-7 flex flex-wrap gap-3"><Button size="lg" className="bg-[#2f8f82] text-white hover:bg-[#26796e]" onClick={() => setScreen("contact")}>{requestType}<MessageCircle className="ml-2 size-4" /></Button><Button variant="outline" onClick={() => setScreen("intro")}>Recomeçar</Button></div></div>}
        {screen === "contact" && <div className="p-6 sm:p-10"><button type="button" onClick={() => setScreen("feedback")} className="mb-6 inline-flex min-h-10 items-center text-sm font-semibold text-slate-600 hover:text-slate-900"><ArrowLeft className="mr-2 size-4" />Voltar ao resultado</button><h2 className="font-display text-2xl font-semibold text-slate-900 sm:text-3xl">Solicitar contato da equipe</h2><p className="mt-3 leading-7 text-slate-600">O cadastro é opcional. Não inclua informações clínicas neste formulário.</p><form className="mt-7 grid gap-5" onSubmit={event => void submitContact(event)} noValidate><div className="grid gap-2"><Label htmlFor="contact-first-name">{isMinor ? "Primeiro nome do responsável" : "Seu primeiro nome"}</Label><Input id="contact-first-name" value={firstName} onChange={event => setFirstName(event.target.value)} autoComplete="given-name" maxLength={60} required /></div><div className="grid gap-2"><Label htmlFor="contact-whatsapp">WhatsApp com DDD</Label><Input id="contact-whatsapp" value={whatsapp} onChange={event => setWhatsapp(event.target.value)} type="tel" inputMode="tel" autoComplete="tel" placeholder="(32) 99999-9999" maxLength={20} required /></div><label className="flex items-start gap-3 rounded-xl border border-slate-200 p-4 text-sm leading-6"><Checkbox checked={consent} onCheckedChange={value => setConsent(value === true)} aria-label="Autorizar contato pelo WhatsApp" /><span>Solicito que a equipe do Dr. Frederick entre em contato comigo pelo WhatsApp sobre este pedido. Li o <a href="/politica-de-privacidade" target="_blank" rel="noreferrer" className="font-semibold underline underline-offset-2">aviso de privacidade do site</a>.</span></label>{submitError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{submitError}</p>}<Button type="submit" size="lg" disabled={submitting || !consent} className="w-fit bg-[#2f8f82] text-white hover:bg-[#26796e]">{submitting ? <><LoaderCircle className="mr-2 size-4 animate-spin" />Enviando…</> : "Enviar solicitação"}</Button><p className="text-xs text-slate-500">Apenas seu primeiro nome, WhatsApp, tipo de pedido, data e status serão registrados. Suas respostas ao questionário não são enviadas.</p></form></div>}
        {screen === "sent" && <div className="px-6 py-12 text-center sm:px-12"><span className="mx-auto grid size-14 place-items-center rounded-full bg-[#e5f4f0] text-[#26786e]"><ShieldCheck className="size-7" /></span><h2 className="mt-5 font-display text-2xl font-semibold text-slate-900">Pedido recebido</h2><p className="mx-auto mt-3 max-w-lg leading-7 text-slate-600">Sua solicitação de contato foi registrada. A equipe poderá retornar pelo WhatsApp informado.</p><Button variant="outline" className="mt-6" onClick={() => { setScreen("intro"); setAnswers({}); setQuestionIndex(0); setFirstName(""); setWhatsapp(""); setConsent(false); }}>Concluir</Button></div>}
      </div>
    </div>
  </section>;
}
