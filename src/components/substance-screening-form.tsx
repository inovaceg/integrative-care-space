import { useEffect, useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2, HeartHandshake, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { SubstanceScreeningConclusion } from '@/components/substance-screening-conclusion';

const storageKey = 'substance-screening:resume-token';
const substanceOptions = ['Álcool', 'Tabaco e nicotina', 'Maconha e derivados', 'Cocaína', 'Crack', 'Anfetaminas e estimulantes', 'Ecstasy e outras drogas sintéticas', 'Opioides', 'Benzodiazepínicos e sedativos', 'Medicamentos sem prescrição ou usados de forma diferente da prescrita', 'Inalantes e solventes', 'Alucinógenos', 'Outras substâncias', 'Não sabe identificar'];
const urgentItems = [
  ['overdose', 'Suspeita de overdose ou ingestão de quantidade potencialmente perigosa'],
  ['intoxication', 'Intoxicação grave neste momento'],
  ['breathing', 'Dificuldade para respirar'],
  ['unconscious', 'Perda de consciência ou dificuldade para despertar'],
  ['seizure', 'Convulsões'],
  ['withdrawal', 'Abstinência intensa ou potencialmente grave'],
  ['suicide', 'Pensamentos de suicídio ou risco imediato de se machucar'],
  ['violence', 'Violência ou ameaça acontecendo neste momento'],
] as const;
const ageQuestions = {
  child: [
    ['exposure', 'Há suspeita ou relato de exposição da criança a álcool, drogas, nicotina ou medicamentos usados de modo diferente do indicado?', 'select'],
    ['development', 'Há mudanças recentes no desenvolvimento, sono, alimentação ou saúde?', 'textarea'],
    ['behavior', 'Que mudanças de comportamento foram percebidas? Quando começaram?', 'textarea'],
    ['family_school', 'Como está o ambiente familiar e escolar? Houve alguma mudança importante?', 'textarea'],
    ['guardian_observations', 'O que mais o(a) responsável considera importante compartilhar?', 'textarea'],
  ],
  adolescent: [
    ['experimented', 'Você já experimentou alguma das substâncias selecionadas?', 'select'],
    ['frequency', 'Com que frequência isso aconteceu nos últimos 12 meses?', 'frequency'],
    ['context', 'Em que situações ou contextos costuma acontecer?', 'textarea'],
    ['consequences', 'Isso trouxe alguma consequência na escola, em casa, nas amizades ou na saúde?', 'textarea'],
    ['control', 'Você já quis parar ou reduzir e achou difícil?', 'select'],
    ['help', 'Você gostaria de conversar com alguém profissional sobre isso?', 'select'],
  ],
  adult: [
    ['history', 'Conte brevemente sobre seu histórico de uso e quando começou.', 'textarea'],
    ['frequency', 'Com que frequência utiliza atualmente?', 'frequency'],
    ['quantity', 'Se desejar, descreva a quantidade ou padrão de uso.', 'textarea'],
    ['duration', 'Há quanto tempo esse padrão acontece?', 'duration'],
    ['control', 'Já teve dificuldade para controlar, reduzir ou interromper o uso?', 'select'],
    ['withdrawal', 'Já sentiu sintomas físicos ou emocionais ao reduzir ou interromper?', 'textarea'],
    ['impacts', 'Que impactos percebeu na saúde, emoções, família, estudos ou trabalho?', 'textarea'],
    ['treatments', 'Já recebeu algum tipo de cuidado ou tratamento relacionado?', 'textarea'],
    ['motivation', 'O que gostaria que acontecesse a partir desta avaliação?', 'textarea'],
  ],
} as const;
type AgeGroup = keyof typeof ageQuestions;
type Answers = Record<string, unknown> & { substances?: string[]; safety?: Record<string, boolean> };

function getAge(birthDate: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return null;
  const [year, month, day] = birthDate.split('-').map(Number);
  const birth = new Date(Date.UTC(year, month - 1, day));
  if (birth.toISOString().slice(0, 10) !== birthDate || birth > new Date()) return null;
  const now = new Date();
  return now.getUTCFullYear() - year - (now.getUTCMonth() + 1 < month || (now.getUTCMonth() + 1 === month && now.getUTCDate() < day) ? 1 : 0);
}
function getAgeGroup(age: number | null): AgeGroup | null {
  return age === null ? null : age < 12 ? 'child' : age < 18 ? 'adolescent' : 'adult';
}
function isUrgent(answers: Answers) {
  return Object.values(answers.safety ?? {}).some(Boolean);
}

export function SubstanceScreeningForm() {
  const [token, setToken] = useState('');
  const [answers, setAnswers] = useState<Answers>({ substances: [], safety: {} });
  const [patientName, setPatientName] = useState('');
  const [contactWhatsapp, setContactWhatsapp] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [consent, setConsent] = useState(false);
  const [step, setStep] = useState(0);
  const [started, setStarted] = useState(false);
  const [resumed, setResumed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [savedAt, setSavedAt] = useState('');
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const group = useMemo(() => getAgeGroup(getAge(birthDate)), [birthDate]);
  const urgent = isUrgent(answers);

  useEffect(() => {
    const savedToken = window.sessionStorage.getItem(storageKey);
    if (!savedToken) return;
    setLoading(true);
    void supabase.functions.invoke('substance-screening', { body: { action: 'resume', token: savedToken } }).then(({ data, error: requestError }) => {
      if (requestError || !data?.screening) { window.sessionStorage.removeItem(storageKey); setLoading(false); return; }
      const screening = data.screening;
      setToken(savedToken);
      setPatientName(screening.patient_name ?? '');
      setContactWhatsapp(screening.contact_whatsapp ?? '');
      setBirthDate(screening.birth_date ?? '');
      setAnswers((screening.answers ?? { substances: [], safety: {} }) as Answers);
      setResumed(true);
      setStarted(true);
      setSubmitted(screening.status !== 'draft');
      setConsent(Boolean(screening.consent_version));
      setLoading(false);
    });
  }, []);

  async function start() {
    setLoading(true);
    setError('');
    const newToken = crypto.randomUUID();
    const { error: requestError } = await supabase.functions.invoke('substance-screening', { body: { action: 'create', token: newToken, consent } });
    if (requestError) { setError('Não foi possível iniciar agora. Tente novamente em instantes.'); setLoading(false); return; }
    window.sessionStorage.setItem(storageKey, newToken);
    setToken(newToken);
    setStarted(true);
    setLoading(false);
  }

  async function persist(action: 'save' | 'submit' = 'save', snapshot = answers) {
    if (!token || !birthDate || !consent) return;
    const { data, error: requestError } = await supabase.functions.invoke('substance-screening', { body: { action, token, patient_name: patientName, contact_whatsapp: contactWhatsapp, birth_date: birthDate, age_group: group, answers: snapshot, consent } });
    if (requestError || data?.error) { setError(data?.error ?? 'Não foi possível salvar ou enviar. Confira os dados e tente novamente.'); return; }
    if (data?.screening?.status === 'pending') {
      setSubmitted(true);
      window.sessionStorage.removeItem(storageKey);
    }
    setSavedAt(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
    setError('');
  }

  useEffect(() => {
    if (!started || !token || !birthDate || submitted) return;
    const timer = window.setTimeout(() => { void persist(); }, 1500);
    return () => window.clearTimeout(timer);
  }, [answers, birthDate, consent, contactWhatsapp, patientName, started, submitted, token]);

  function updateAnswer(key: string, value: unknown) {
    setAnswers((current) => ({ ...current, [key]: value }));
  }

  function updateSafety(key: string, checked: boolean) {
    setAnswers((current) => ({ ...current, safety: { ...(current.safety ?? {}), [key]: checked } }));
  }

  async function submit() {
    setLoading(true);
    await persist('submit');
    setLoading(false);
  }

  const progress = Math.round(((step + 1) / 4) * 100);
  const selectedQuestions = group ? [
    ...ageQuestions[group],
    ...(group !== 'child' ? (answers.substances ?? []).filter((name): name is string => typeof name === 'string' && name !== 'Não sabe identificar').flatMap((name) => {
      const slug = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '_').toLowerCase();
      return [[`frequency_${slug}`, `Com que frequência ocorre o uso de ${name}?`, 'frequency'], [`duration_${slug}`, `Há quanto tempo esse padrão relacionado a ${name} acontece?`, 'duration']] as const;
    }) : []),
  ] : [];

  if (loading && !started) return <main className="grid min-h-screen place-items-center bg-[#f8f6f1] p-6 text-[#526760]">Preparando sua avaliação...</main>;
  if (!started) return <main className="min-h-screen bg-[#f8f6f1] px-4 py-12 text-[#173f3a]"><div className="mx-auto max-w-3xl"><Link to="/" className="inline-flex items-center gap-2 text-sm text-[#17675b]"><ArrowLeft className="size-4"/>Voltar ao site</Link><section className="mt-8 rounded-3xl border border-[#d9e6df] bg-white p-7 shadow-sm sm:p-10"><span className="grid size-12 place-items-center rounded-2xl bg-[#e5f4f0] text-[#26786e]"><HeartHandshake className="size-6"/></span><p className="mt-6 text-xs font-bold uppercase tracking-[.16em] text-[#26786e]">Acolhimento sem julgamentos</p><h1 className="mt-3 font-display text-3xl font-semibold sm:text-4xl">Triagem inicial sobre uso de substâncias</h1><p className="mt-4 leading-7 text-[#526760]">Este formulário ajuda a organizar informações para uma conversa profissional. Não é diagnóstico e não determina dependência. Você pode responder no seu ritmo; as respostas ficam privadas e são acessíveis apenas à equipe autorizada.</p><div className="mt-5 rounded-2xl bg-[#f4f8f7] p-4 text-sm leading-6 text-[#526760]"><strong className="text-[#173f3a]">Se houver uma emergência agora</strong>, como dificuldade para respirar, perda de consciência, convulsão, suspeita de overdose, risco de suicídio ou violência, ligue para o SAMU 192 ou procure um serviço de emergência. Não espere preencher este formulário.</div><p className="mt-5 text-sm leading-6 text-[#526760]">A triagem é destinada a crianças, adolescentes e adultos. A data de nascimento define o fluxo adequado. Para crianças, o formulário é respondido por um responsável. Em adolescentes, explicaremos os cuidados de privacidade e a participação de responsáveis.</p>{error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}<Button onClick={() => void start()} disabled={loading} className="mt-6 h-12 rounded-full bg-[#17675b] px-7 text-white hover:bg-[#12574d]">Iniciar minha avaliação <ArrowRight className="ml-2 size-4"/></Button></section><p className="mt-6 text-center text-xs text-[#71817b]">Dr. Frederick Parreira · Psicólogo — CRP 04/86194</p></div></main>;

  if (submitted) return <SubstanceScreeningConclusion answers={answers} urgent={urgent} />;

  return <main className="min-h-screen bg-[#f8f6f1] px-4 py-8 text-[#173f3a] sm:py-12"><div className="mx-auto max-w-3xl"><div className="flex items-center justify-between"><Link to="/" className="inline-flex items-center gap-2 text-sm text-[#17675b]"><ArrowLeft className="size-4"/>Sair da avaliação</Link><span className="inline-flex items-center gap-1 text-xs text-[#526760]"><ShieldCheck className="size-4"/>Privado</span></div><section className="mt-6 rounded-3xl border border-[#d9e6df] bg-white p-6 shadow-sm sm:p-9"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-[#26786e]">Triagem inicial</p><h1 className="mt-2 font-display text-2xl font-semibold">Vamos no seu ritmo</h1></div>{savedAt && <span role="status" className="text-right text-xs text-[#526760]">Salvo às {savedAt}</span>}</div><div className="mt-5 h-2 overflow-hidden rounded-full bg-[#e8efec]"><div className="h-full rounded-full bg-[#2f8f82] transition-all" style={{ width: `${progress}%` }}/></div><p className="mt-2 text-xs text-[#71817b]">Etapa {step + 1} de 4 · {progress}%</p>{resumed && step === 0 && <p className="mt-4 rounded-xl bg-[#f4f8f7] p-3 text-sm leading-6 text-[#526760]">Encontramos uma triagem salva neste dispositivo. Os dados já preenchidos podem ser alterados abaixo antes de continuar.</p>}
      {step === 0 && <div className="mt-7 space-y-5"><h2 className="font-display text-xl font-semibold">Sobre você</h2><div><Label htmlFor="screening-name">Como podemos chamar você?</Label><Input id="screening-name" className="mt-1" maxLength={120} value={patientName} onChange={(event) => setPatientName(event.target.value)} placeholder="Nome ou nome social"/></div><div><Label htmlFor="screening-whatsapp">WhatsApp para contato (opcional)</Label><Input id="screening-whatsapp" className="mt-1" type="tel" autoComplete="tel" maxLength={30} value={contactWhatsapp} onChange={(event) => setContactWhatsapp(event.target.value)} placeholder="(00) 00000-0000"/><p className="mt-1 text-xs text-[#71817b]">Usaremos apenas para retornar sobre esta triagem.</p></div><div><Label htmlFor="screening-birth">Data de nascimento</Label><Input id="screening-birth" className="mt-1" type="date" max={new Date().toISOString().slice(0,10)} value={birthDate} onChange={(event) => setBirthDate(event.target.value)}/>{birthDate && !group && <p className="mt-1 text-sm text-red-700">Confira a data de nascimento.</p>}</div>{group && <p className="rounded-xl bg-[#f4f8f7] p-3 text-sm text-[#526760]">Fluxo selecionado pela idade: <strong>{group === 'child' ? 'criança (respondido por responsável)' : group === 'adolescent' ? 'adolescente' : 'adulto'}</strong>. Não é possível escolher outro fluxo.</p>}{group === 'child' && <><div><Label htmlFor="guardian-name">Nome do responsável</Label><Input id="guardian-name" className="mt-1" value={String(answers.guardian_name ?? '')} onChange={(event) => updateAnswer('guardian_name', event.target.value)} /></div><div><Label htmlFor="guardian-relation">Vínculo com a criança</Label><Input id="guardian-relation" className="mt-1" value={String(answers.guardian_relation ?? '')} onChange={(event) => updateAnswer('guardian_relation', event.target.value)} placeholder="Ex.: mãe, pai, responsável legal"/></div></>}{group === 'adolescent' && <div className="rounded-xl bg-[#f4f8f7] p-4 text-sm leading-6 text-[#526760]">Suas respostas serão tratadas com cuidado. Em situações de risco à sua segurança, poderá ser necessário envolver um adulto responsável e buscar ajuda para proteger você. Você pode conversar com a equipe sobre dúvidas de privacidade.</div>}</div>}
      {step === 1 && <div className="mt-7 space-y-5"><h2 className="font-display text-xl font-semibold">Substâncias e experiências</h2><p className="text-sm leading-6 text-[#526760]">Marcar uma substância não significa dependência. Selecione apenas o que deseja compartilhar.</p><fieldset><legend className="mb-2 text-sm font-medium">Quais substâncias você gostaria de abordar?</legend><div className="grid gap-2 sm:grid-cols-2">{substanceOptions.map((item) => <label key={item} className="flex items-start gap-2 rounded-xl border border-[#d9e6df] p-3 text-sm"><input type="checkbox" className="mt-1 accent-[#26786e]" checked={(answers.substances ?? []).includes(item)} onChange={(event) => updateAnswer('substances', event.target.checked ? [...(answers.substances ?? []), item] : (answers.substances ?? []).filter((value) => value !== item))}/><span>{item}</span></label>)}</div></fieldset>{group && selectedQuestions.map(([key, question, kind]) => <div key={key}><Label htmlFor={`answer-${key}`}>{question}</Label>{kind === 'textarea' ? <Textarea id={`answer-${key}`} className="mt-1 min-h-24" maxLength={3000} value={String(answers[key] ?? '')} onChange={(event) => updateAnswer(key, event.target.value)} /> : kind === 'select' ? <select id={`answer-${key}`} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={String(answers[key] ?? '')} onChange={(event) => updateAnswer(key, event.target.value)}><option value="">Selecione, se desejar</option><option>Não</option><option>Sim</option><option>Não tenho certeza</option><option>Prefiro não responder</option></select> : kind === 'frequency' ? <select id={`answer-${key}`} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={String(answers[key] ?? '')} onChange={(event) => updateAnswer(key, event.target.value)}><option value="">Selecione, se desejar</option><option>Nunca</option><option>Uma vez</option><option>Mensalmente ou menos</option><option>Algumas vezes no mês</option><option>Semanalmente</option><option>Diariamente ou quase diariamente</option><option>Prefiro não responder</option></select> : <select id={`answer-${key}`} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={String(answers[key] ?? '')} onChange={(event) => updateAnswer(key, event.target.value)}><option value="">Selecione, se desejar</option><option>Menos de 1 mês</option><option>1 a 6 meses</option><option>6 a 12 meses</option><option>Mais de 1 ano</option><option>Não sei / prefiro não responder</option></select>}</div>)}</div>}
      {step === 2 && <div className="mt-7 space-y-5"><h2 className="font-display text-xl font-semibold">Como isso afeta seu dia a dia</h2>{group !== 'child' && <><div><Label htmlFor="substance-reason">O que fez você buscar esta avaliação agora?</Label><Textarea id="substance-reason" className="mt-1 min-h-24" value={String(answers.reason ?? '')} onChange={(event) => updateAnswer('reason', event.target.value)} /></div><div><Label htmlFor="substance-observations">Há algo mais que gostaria que a equipe soubesse?</Label><Textarea id="substance-observations" className="mt-1 min-h-24" value={String(answers.observations ?? '')} onChange={(event) => updateAnswer('observations', event.target.value)} /></div></>}{group === 'adolescent' && <div><Label htmlFor="guardian-choice">Você se sente seguro(a) para envolver um responsável?</Label><select id="guardian-choice" className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={String(answers.guardian_participation ?? '')} onChange={(event) => updateAnswer('guardian_participation', event.target.value)}><option value="">Selecione, se desejar</option><option>Sim</option><option>Quero conversar primeiro com a equipe</option><option>Não me sinto seguro(a)</option></select></div>}{group === 'child' && <div className="rounded-xl bg-[#f4f8f7] p-4 text-sm leading-6 text-[#526760]">As respostas deste fluxo são fornecidas pelo responsável e servem para organizar uma avaliação profissional da criança. Não usamos questionários de dependência destinados a adultos.</div>}</div>}
      {step === 3 && <div className="mt-7 space-y-5"><h2 className="font-display text-xl font-semibold">Segurança e envio</h2><div className="rounded-2xl border border-amber-200 bg-amber-50 p-4"><div className="flex gap-3"><AlertTriangle className="size-5 shrink-0 text-amber-700"/><p className="text-sm leading-6 text-amber-950">Você pode marcar todas as situações aplicáveis. Ao enviar, verá uma orientação adequada às respostas. Em emergência atual, ligue 192; não aguarde o envio da triagem.</p></div></div><fieldset><legend className="mb-3 text-sm font-medium">Alguma destas situações está acontecendo agora?</legend><div className="space-y-2">{urgentItems.map(([key, label]) => <label key={key} className="flex items-start gap-3 rounded-xl border border-[#d9e6df] p-3 text-sm"><input type="checkbox" className="mt-1 accent-red-700" checked={Boolean(answers.safety?.[key])} onChange={(event) => updateSafety(key, event.target.checked)}/><span>{label}</span></label>)}</div></fieldset><label className="flex items-start gap-3 rounded-xl border border-[#d9e6df] p-4 text-sm leading-6"><input type="checkbox" className="mt-1 accent-[#26786e]" checked={consent} onChange={(event) => setConsent(event.target.checked)}/><span>Li as informações de privacidade e concordo com o envio destas informações para análise profissional. Entendo que esta triagem não é diagnóstico. Para criança, confirmo que sou responsável e posso responder por ela.</span></label><p className="text-xs leading-5 text-[#71817b]">As informações de saúde são armazenadas de forma protegida no Supabase e só ficam disponíveis para o profissional autorizado. O código de retomada fica neste navegador, não na URL. Não inclua dados que não sejam necessários.</p></div>}
      {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}<div className="mt-8 flex flex-wrap items-center justify-between gap-3"><Button variant="outline" disabled={step === 0 || loading} onClick={() => setStep((current) => current - 1)}><ArrowLeft className="mr-2 size-4"/>Voltar</Button>{step < 3 ? <Button disabled={!group || !birthDate || loading} onClick={() => setStep((current) => current + 1)} className="bg-[#17675b] text-white">Continuar<ArrowRight className="ml-2 size-4"/></Button> : <Button disabled={loading || !consent} onClick={() => void submit()} className="bg-[#17675b] text-white">{loading ? 'Enviando…' : 'Enviar para análise'}<CheckCircle2 className="ml-2 size-4"/></Button>}</div></section><p className="mt-5 text-center text-xs text-[#71817b]">Salvamento automático no Supabase · Alterne as etapas quando quiser revisar.</p></div></main>;
}

export const substanceCatalog = substanceOptions;
