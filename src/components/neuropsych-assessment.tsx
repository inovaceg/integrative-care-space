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
type Screen = "intro" | "contact" | "question" | "feedback";
const intakeFunctionName = "neuropsych-contact-intake";
const infoChoice = "Quero apenas entender como funciona a avaliação";
const openAnswers = new Set(["Prefiro não responder", "Prefiro não informar", "Não sei dizer", "Percebi há pouco tempo ou ainda não consigo comparar", "Ainda não identifiquei uma dificuldade específica", "Ainda não identifiquei em quais situações acontece", "Ainda não consigo avaliar"]);
const questions: Question[] = [
  { id: "who", title: "Para quem você está buscando informações?", options: ["Para mim", "Para meu filho ou minha filha", "Para outra pessoa da família", "Para outra pessoa que acompanho"] },
  { id: "reason", title: "O que motivou sua busca?", multiple: true, exclusive: [infoChoice, "Prefiro não responder"], options: ["Percebi dificuldades ou mudanças no dia a dia", "Alguém da família, da escola ou do trabalho comentou sobre uma dificuldade ou mudança", "Um profissional sugeriu ou encaminhou para uma avaliação", "Percebi mudanças depois de um acontecimento relacionado à saúde", infoChoice, "Prefiro não responder"] },
  { id: "areas", title: "O que você tem observado?", multiple: true, exclusive: ["Ainda não identifiquei uma dificuldade específica", "Prefiro não responder"], options: ["Distração ou dificuldade para manter a atenção", "Esquecimento de conversas, instruções ou compromissos", "Dificuldade para começar, organizar ou terminar tarefas", "Necessidade de mais tempo para entender informações ou responder", "Dificuldade para aprender, ler, escrever ou fazer contas", "Dificuldade para compreender o que foi dito, encontrar palavras ou explicar uma ideia", "Dificuldade para lidar com mudanças de plano ou passar de uma tarefa para outra", "Outra dificuldade", "Ainda não identifiquei uma dificuldade específica", "Prefiro não responder"] },
  { id: "onset", title: "Quando você começou a perceber isso?", options: ["Há menos de 1 mês", "De 1 a 6 meses atrás", "Há mais de 6 meses e menos de 1 ano", "Há 1 ano ou mais", "Não sei dizer", "Prefiro não responder"] },
  { id: "change", title: "Desde então, o que você percebeu?", options: ["A dificuldade ficou mais perceptível", "Ficou menos perceptível", "Continua parecida", "Há períodos em que aparece mais e outros em que aparece menos", "Percebi há pouco tempo ou ainda não consigo comparar", "Prefiro não responder"] },
  { id: "contexts", title: "Em quais situações você percebe isso?", multiple: true, exclusive: ["Ainda não identifiquei em quais situações acontece", "Prefiro não responder"], options: ["Nas tarefas de casa ou de cuidado pessoal", "Nas aulas, nos estudos ou nas tarefas escolares", "Nas atividades do trabalho", "Nas conversas, brincadeiras ou atividades sociais", "Ao lidar com compromissos, compras, pagamentos ou deslocamentos", "Ainda não identifiquei em quais situações acontece", "Prefiro não responder"] },
  { id: "impact", title: "Quando isso acontece, o que muda na rotina?", options: ["As atividades continuam como de costume", "Algumas atividades exigem mais tempo ou esforço", "Algumas atividades exigem lembretes, ajuda ou adaptações", "Algumas atividades são adiadas, evitadas ou ficam sem terminar", "Ainda não consigo avaliar", "Prefiro não responder"] },
  { id: "goal", title: "O que você gostaria de fazer agora?", options: ["Entender como funcionam as etapas da avaliação e a devolutiva", "Saber o que levar para uma primeira conversa ou após um encaminhamento", "Tirar uma dúvida", "Consultar valores e horários", "Solicitar um agendamento", "Apenas ver minha orientação"] },
];
const allQuestionIds = questions.map(question => question.id);

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
  const areas = selectedValues(answers.areas).filter(value => !openAnswers.has(value));
  const contexts = selectedValues(answers.contexts).filter(value => !openAnswers.has(value));
  const hasDetails = areas.some(area => area !== "Outra dificuldade");
  const referral = selectedValues(answers.reason).includes("Um profissional sugeriu ou encaminhou para uma avaliação");
  const seeksInformation = selectedValues(answers.reason).includes(infoChoice) || answers.goal === "Entender como funcionam as etapas da avaliação e a devolutiva";
  const hasOpenResponse = [...areas, ...contexts, String(answers.onset ?? ""), String(answers.change ?? ""), String(answers.impact ?? ""), ...selectedValues(answers.reason)].some(value => openAnswers.has(value));
  const forAnotherPerson = Boolean(answers.who && answers.who !== "Para mim");
  const sentences: string[] = [];

  if (hasDetails) {
    const reported = areas.slice(0, 2).map(value => value.charAt(0).toLowerCase() + value.slice(1)).join(" e ");
    sentences.push(forAnotherPerson ? `Você observou, na pessoa acompanhada, ${reported}` : `Você relatou ${reported}`);
  }
  if (contexts.length) sentences.push(`Você percebe isso ${contexts[0].toLowerCase()}`);
  if (answers.onset && !openAnswers.has(String(answers.onset))) sentences.push(`A percepção começou ${String(answers.onset).toLowerCase()}`);
  if (answers.impact && !openAnswers.has(String(answers.impact))) sentences.push(`Na rotina, ${String(answers.impact).charAt(0).toLowerCase()}${String(answers.impact).slice(1)}`);

  const suggestions: string[] = [];
  if (referral) suggestions.push("Se recebeu um encaminhamento, tenha-o à mão, se possível, e anote a dúvida ou dificuldade que motivou a indicação.");
  if (hasDetails) suggestions.push("Para a conversa, pode ajudar anotar um exemplo concreto: o que a pessoa estava fazendo, o que aconteceu e como isso afetou a atividade.");
  if (!suggestions.length) suggestions.push("Se desejar, anote uma dúvida ou um exemplo do que motivou sua busca para levar à conversa.");

  return {
    summary: sentences.length ? `${sentences.join(". ")}.` : "Suas respostas deixaram alguns pontos em aberto. A orientação geral é conversar com o profissional sobre suas dúvidas e sobre o que motivou a busca.",
    suggestions,
    showServiceInfo: seeksInformation || !hasDetails || hasOpenResponse,
  };
}

export function NeuropsychAssessment() {
  const [screen, setScreen] = useState<Screen>("intro");
  const [answers, setAnswers] = useState<Answers>({});
  const [questionIndex, setQuestionIndex] = useState(0);
  const [firstName, setFirstName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [contactRegistered, setContactRegistered] = useState(false);
  const [questionnaireToken, setQuestionnaireToken] = useState("");
  const [savingAnswers, setSavingAnswers] = useState(false);
  const [answerSaveError, setAnswerSaveError] = useState("");

  const skipDetails = selectedValues(answers.reason).includes(infoChoice);
  const path = useMemo(() => skipDetails ? ["who", "reason", "goal"] : allQuestionIds, [skipDetails]);
  useEffect(() => {
    if (!skipDetails) return;
    setAnswers(current => {
      const next = { ...current };
      for (const id of ["areas", "onset", "change", "contexts", "impact"]) delete next[id];
      return next;
    });
  }, [skipDetails]);
  const question = questions.find(item => item.id === path[questionIndex]);
  const feedback = useMemo(() => buildFeedback(answers), [answers]);
  const appointment = answers.goal === "Solicitar um agendamento";
  const whatsappText = appointment
    ? "Olá! Gostaria de consultar a disponibilidade para agendar uma conversa sobre avaliação neuropsicológica."
    : "Olá! Gostaria de saber mais sobre a avaliação neuropsicológica.";
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappText)}`;
  const whatsappLabel = appointment ? "Solicitar agendamento pelo WhatsApp" : "Falar com a equipe do Dr. Fred Martins";

  function goBack() {
    if (savingAnswers) return;
    if (questionIndex === 0) setScreen("intro");
    else setQuestionIndex(index => index - 1);
  }

  async function goForward() {
    if (!question || savingAnswers) return;
    if (questionIndex < path.length - 1) {
      setQuestionIndex(index => index + 1);
      return;
    }
    setAnswerSaveError("");
    const finalAnswers = { ...answers };
    if (skipDetails) {
      for (const id of ["areas", "onset", "change", "contexts", "impact"]) delete finalAnswers[id];
    }
    setAnswers(finalAnswers);
    setSavingAnswers(true);
    try {
      const { data, error } = await supabase.functions.invoke(intakeFunctionName, {
        body: { action: "save_questionnaire_answers", questionnaireToken, answers: finalAnswers },
      });
      if (error || !data?.saved) throw new Error("Não foi possível registrar suas respostas. Tente novamente.");
      setScreen("feedback");
    } catch (cause) {
      setAnswerSaveError(cause instanceof Error ? cause.message : "Não foi possível registrar suas respostas. Tente novamente.");
    } finally {
      setSavingAnswers(false);
    }
  }

  function handleQuestionKey(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "ArrowLeft") { event.preventDefault(); goBack(); }
    if (event.key === "ArrowRight" && (question?.multiple ? selectedValues(answers[question.id]).length > 0 : Boolean(answers[question?.id ?? ""]))) {
      event.preventDefault();
      goForward();
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
        body: { firstName, whatsapp, birthDate, requestType: "Questionário de orientação neuropsicológica", consent },
      });
      if (error || !data?.received || typeof data.questionnaireToken !== "string") throw new Error("Não foi possível registrar seus dados agora. Tente novamente.");
      setQuestionnaireToken(data.questionnaireToken);
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
        {screen === "intro" && <div className="px-6 py-10 sm:px-12 sm:py-14"><span className="grid size-14 place-items-center rounded-2xl bg-[#e5f4f0] text-[#26786e]"><ClipboardList className="size-7" /></span><h2 className="mt-6 max-w-2xl font-display text-3xl font-semibold leading-tight text-slate-900 sm:text-4xl">Avaliação neuropsicológica — Questionário de orientação inicial</h2><p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">Responda algumas perguntas para organizar o que você tem observado e entender quais informações podem ajudar em uma primeira conversa. Ao final, você verá uma orientação baseada nas suas respostas. A avaliação neuropsicológica é realizada por um profissional.</p><Button size="lg" className="mt-8 bg-[#2f8f82] text-white hover:bg-[#26796e]" onClick={() => setScreen(contactRegistered ? "question" : "contact")}>{contactRegistered ? "Continuar questionário" : "Começar questionário"} <ArrowRight className="ml-2 size-4" /></Button></div>}
        {screen === "contact" && <div className="p-6 sm:p-10"><button type="button" onClick={() => setScreen("intro")} className="mb-6 inline-flex min-h-10 items-center text-sm font-semibold text-slate-600 hover:text-slate-900"><ArrowLeft className="mr-2 size-4" />Voltar</button><h2 className="font-display text-2xl font-semibold text-slate-900 sm:text-3xl">Antes de começar</h2><p className="mt-3 leading-7 text-slate-600">Informe seu primeiro nome e WhatsApp para contato, além da data de nascimento da pessoa avaliada. Se estiver respondendo por uma criança ou adolescente, informe o contato do responsável. Após sua autorização, a equipe poderá consultar essas informações e suas respostas junto com este pedido.</p><form className="mt-7 grid gap-5" onSubmit={event => void registerBeforeQuestionnaire(event)}><div className="grid gap-2"><Label htmlFor="assessment-first-name">Primeiro nome</Label><Input id="assessment-first-name" value={firstName} onChange={event => setFirstName(event.target.value)} autoComplete="given-name" maxLength={60} required /></div><div className="grid gap-2"><Label htmlFor="assessment-whatsapp">WhatsApp com DDD</Label><Input id="assessment-whatsapp" value={whatsapp} onChange={event => setWhatsapp(event.target.value)} type="tel" inputMode="tel" autoComplete="tel" placeholder="(32) 99999-9999" maxLength={20} required /></div><div className="grid gap-2"><Label htmlFor="assessment-birth-date">Data de nascimento da pessoa avaliada</Label><Input id="assessment-birth-date" type="date" value={birthDate} onChange={event => setBirthDate(event.target.value)} max={new Date().toISOString().slice(0, 10)} required /></div><label className="flex items-start gap-3 rounded-xl border border-slate-200 p-4 text-sm leading-6"><Checkbox checked={consent} onCheckedChange={value => setConsent(value === true)} aria-label="Autorizar registro dos dados de contato, data de nascimento e respostas do questionário" /><span>Autorizo o registro do meu primeiro nome, WhatsApp e data de nascimento da pessoa avaliada, além do armazenamento das respostas para que a equipe autorizada possa consultar este pedido. Li o <a href="/politica-de-privacidade" target="_blank" rel="noreferrer" className="font-semibold underline underline-offset-2">aviso de privacidade</a>.</span></label>{submitError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{submitError}</p>}<Button type="submit" size="lg" disabled={submitting || !consent} className="w-fit bg-[#2f8f82] text-white hover:bg-[#26796e]">{submitting ? <><LoaderCircle className="mr-2 size-4 animate-spin" />Registrando…</> : "Continuar para as perguntas"}</Button></form></div>}
        {screen === "question" && question && <section className="p-6 sm:p-10" onKeyDown={handleQuestionKey} aria-labelledby="question-title"><div className="mb-8" aria-live="polite"><div className="flex items-center justify-between gap-3 text-sm text-slate-500"><span>Pergunta {questionIndex + 1} de {path.length}</span><span>{Math.round(((questionIndex + 1) / path.length) * 100)}%</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#2f8f82] transition-all" style={{ width: `${((questionIndex + 1) / path.length) * 100}%` }} /></div></div><h2 id="question-title" className="font-display text-2xl font-semibold leading-snug text-slate-900 sm:text-3xl">{question.title}</h2>{question.multiple && <p className="mt-2 text-sm text-slate-500">Você pode marcar mais de uma opção.</p>}<div className="mt-6 grid gap-3" role={question.multiple ? "group" : "radiogroup"} aria-label={question.title}>{question.options.map(option => { const selected = selectedValues(answers[question.id]).includes(option); return <button key={option} type="button" role={question.multiple ? "checkbox" : "radio"} aria-checked={selected} onClick={() => setAnswers(current => ({ ...current, [question.id]: toggleChoice(question, current[question.id], option) }))} className={`flex min-h-14 items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left text-base transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f8f82] focus-visible:ring-offset-2 ${selected ? "border-[#2f8f82] bg-[#eff9f6] text-[#1e625a]" : "border-slate-200 bg-white text-slate-700 hover:border-[#9bcfc3] hover:bg-slate-50"}`}><span>{option}</span>{selected && <Check className="size-5 shrink-0 text-[#2f8f82]" />}</button>; })}</div>{answerSaveError && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{answerSaveError}</p>}<div className="mt-7 flex flex-wrap justify-between gap-3"><Button variant="outline" onClick={goBack}><ArrowLeft className="mr-2 size-4" />Voltar</Button><Button disabled={question.multiple ? selectedValues(answers[question.id]).length === 0 || savingAnswers : !answers[question.id] || savingAnswers} onClick={() => void goForward()}>{savingAnswers ? <><LoaderCircle className="mr-2 size-4 animate-spin" />Salvando…</> : answerSaveError ? "Tentar novamente" : <>Continuar<ArrowRight className="ml-2 size-4" /></>}</Button></div><p className="mt-5 text-xs text-slate-500">As respostas serão registradas no pedido após a conclusão e consultadas somente pela equipe autorizada.</p></section>}
        {screen === "feedback" && <div className="p-6 sm:p-10"><h2 className="font-display text-3xl font-semibold text-slate-900 sm:text-4xl">Sua orientação inicial</h2><article className="mt-6 rounded-2xl border border-[#dbe8e4] bg-[#f7fbfa] p-5"><h3 className="font-semibold text-[#245f57]">Com base no que você informou</h3><p className="mt-2 leading-7 text-slate-700">{feedback.summary}</p></article>{feedback.showServiceInfo && <article className="mt-4 rounded-2xl border border-slate-200 p-5"><h3 className="font-semibold text-slate-800">Sobre a avaliação neuropsicológica</h3><p className="mt-2 leading-7 text-slate-700">A avaliação neuropsicológica busca compreender as relações entre funções cognitivas, emoções e comportamento. As etapas são definidas pelo profissional conforme a demanda. A devolutiva é a conversa profissional sobre os resultados e as informações relevantes para a pessoa avaliada.</p></article>}<article className="mt-4 rounded-2xl border border-slate-200 p-5"><h3 className="font-semibold text-slate-800">O que pode ajudar na primeira conversa</h3><ul className="mt-2 list-disc space-y-2 pl-5 leading-7 text-slate-700">{feedback.suggestions.map(suggestion => <li key={suggestion}>{suggestion}</li>)}</ul></article><p className="mt-6 rounded-lg bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">Este questionário é informativo. A indicação de uma avaliação é discutida com o profissional.</p><div className="mt-7 flex flex-wrap gap-3"><a href={whatsappUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-[#2f8f82] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#26796e]">{whatsappLabel}<MessageCircle className="size-4" /></a><Button variant="outline" onClick={() => { setScreen("question"); setQuestionIndex(path.length - 1); }}><ArrowLeft className="mr-2 size-4" />Voltar às respostas</Button></div></div>}
      </div>
    </div>
  </section>;
}
