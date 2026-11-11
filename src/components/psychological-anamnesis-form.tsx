import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { AlertTriangle, ArrowLeft, ArrowRight, Check, Clipboard, LoaderCircle, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { loadPsychologicalAnamnesis, savePsychologicalAnamnesis, startPsychologicalAnamnesis, submitPsychologicalAnamnesis, type PsychologicalAnswers } from '@/lib/admin/psychological-anamnesis';
import { abuseOptions, activityFrequencyOptions, anamnesisFieldLabels, anamnesisSteps, appetiteOptions, childhoodFeelingOptions, civilStatusOptions, consentSections, criticalFigureOptions, educationOptions, familyHistoryOptions, familyPresenceOptions, frequencyOptions, genderIdentityOptions, householdOptions, insightOptions, medicationAdherenceOptions, medicationBenefitOptions, onsetOptions, orientationOptions, practiceFrequencyOptions, religionOptions, sleepOptions, sexualActivityOptions, sexualDifficultyOptions, sexualFrequencyOptions, substanceOptions, symptomOptions, yesNoOptions, yesNoSometimesOptions } from '@/lib/admin/psychological-anamnesis-content';

const consentVersion = '1.0-2026-11-11';
type AnswerValue = string | number | boolean | string[];
const emptyAnswers: PsychologicalAnswers = {};
const states = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'] as const;
const stateNames: Record<string,string> = { AC:'Acre',AL:'Alagoas',AP:'Amapá',AM:'Amazonas',BA:'Bahia',CE:'Ceará',DF:'Distrito Federal',ES:'Espírito Santo',GO:'Goiás',MA:'Maranhão',MT:'Mato Grosso',MS:'Mato Grosso do Sul',MG:'Minas Gerais',PA:'Pará',PB:'Paraíba',PR:'Paraná',PE:'Pernambuco',PI:'Piauí',RJ:'Rio de Janeiro',RN:'Rio Grande do Norte',RS:'Rio Grande do Sul',RO:'Rondônia',RR:'Roraima',SC:'Santa Catarina',SP:'São Paulo',SE:'Sergipe',TO:'Tocantins' };
const householdExclusive = ['Outras pessoas'];
const abuseExclusive = ['Nenhuma dessas situações', 'Prefiro não responder'];
const familyExclusive = ['Não tenho conhecimento', 'Prefiro não responder'];
const substanceExclusive = ['Não utilizo', 'Prefiro não responder'];

function ageOnDate(dateValue: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) return null;
  const date = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== dateValue || date > new Date()) return null;
  const today = new Date(); let age = today.getFullYear() - date.getFullYear();
  if (today.getMonth() < date.getMonth() || (today.getMonth() === date.getMonth() && today.getDate() < date.getDate())) age -= 1;
  return age;
}
function Field({ label, children, hint, required = false }: { label: string; children: ReactNode; hint?: string; required?: boolean }) {
  return <div className="grid gap-2"><Label className="text-sm font-medium leading-6 text-[#173f3a]">{label}{required && <span className="ml-1 text-[#a34b3d">*</span>}</Label>{children}{hint && <p className="text-xs leading-5 text-[#708079]">{hint}</p>}</div>;
}
function ChoiceGroup({ value, onChange, options }: { value: string; onChange: (value: string) => void; options: readonly string[] }) {
  return <div className="flex flex-wrap gap-2">{options.map(option => <Button key={option} type="button" variant={value === option ? 'default' : 'outline'} aria-pressed={value === option} className={value === option ? 'border-[#17675b] bg-[#17675b] text-white hover:bg-[#12574d]' : 'border-[#c9d9d0] bg-white text-[#345c52] hover:bg-[#eff6f2]'} onClick={() => onChange(value === option ? '' : option)}>{option}</Button>)}</div>;
}
function MultiChoice({ value, onChange, options, exclusive = [] }: { value: string[]; onChange: (value: string[]) => void; options: readonly string[]; exclusive?: readonly string[] }) {
  return <div className="grid gap-2 sm:grid-cols-2">{options.map(option => <label key={option} className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-[#e1e9e3] px-3 py-2 text-sm text-[#38594e]"><Checkbox checked={value.includes(option)} onCheckedChange={checked => { const next = checked === true ? (exclusive.includes(option) ? [option] : [...value.filter(item => !exclusive.includes(item)), option]) : value.filter(item => item !== option); onChange(next); }} className="border-[#99b5a5] data-[state=checked]:bg-[#26786e]" />{option}</label>)}</div>;
}
function TextAnswer({ value, onChange, rows = 3, placeholder }: { value: string; onChange: (value: string) => void; rows?: number; placeholder?: string }) {
  return <Textarea rows={rows} value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} className="resize-y border-[#d3dfd8] bg-white focus-visible:ring-[#2f8f82]" />;
}
function RangeAnswer({ value, onChange, label }: { value: string; onChange: (value: string) => void; label: string }) {
  return <Field label={label} hint="0 = mínimo · 10 = máximo. Opcional."><div className="flex items-center gap-3"><Input aria-label={label} type="number" min="0" max="10" step="1" inputMode="numeric" value={value} onChange={event => { const next = event.target.value; if (next === '') onChange(''); else if (/^\d{1,2}$/.test(next) && Number(next) <= 10) onChange(String(Number(next))); }} placeholder="0–10" className="w-28 border-[#d3dfd8] bg-white" /><span className="text-sm font-semibold text-[#17675b]">{value || '—'} / 10</span></div></Field>;
}
function normalizePhone(value: string) { return value.replace(/\D/g, '').slice(0, 11); }
function validEmail(value: string) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()); }
function validPhone(value: string) { return /^\d{10,11}$/.test(value.replace(/\D/g, '')); }
function formatAnswer(value: AnswerValue) { return Array.isArray(value) ? value.join(', ') : String(value); }
function labelFor(key: string) { return String(anamnesisFieldLabels[key] ?? key); }

export function PsychologicalAnamnesisForm() {
  const [birthDate, setBirthDate] = useState('');
  const [resumeInput, setResumeInput] = useState('');
  const [resumeKey, setResumeKey] = useState('');
  const [answers, setAnswers] = useState<PsychologicalAnswers>(emptyAnswers);
  const [step, setStep] = useState(0);
  const [reviewStage, setReviewStage] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [screen, setScreen] = useState<'gate' | 'form' | 'underage' | 'submitted'>('gate');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [signedName, setSignedName] = useState('');
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [submissionId, setSubmissionId] = useState('');
  const [cepStatus, setCepStatus] = useState('');
  const formRef = useRef<HTMLFormElement>(null);
  const saveQueue = useRef<Promise<void>>(Promise.resolve());
  const birthAge = useMemo(() => ageOnDate(birthDate), [birthDate]);
  const value = (key: string) => String(answers[key] ?? '');
  const set = (key: string, next: AnswerValue) => setAnswers(current => ({ ...current, [key]: next }));
  const selected = (key: string) => Array.isArray(answers[key]) ? answers[key] as string[] : [];
  const progress = screen === 'form' ? (reviewStage ? 100 : ((step + 1) / anamnesisSteps.length) * 100) : 0;

  useEffect(() => {
    const postalCode = value('postal_code');
    if (postalCode.length !== 8) { setCepStatus(''); return; }
    const controller = new AbortController();
    setCepStatus('Buscando endereço…');
    fetch(`https://viacep.com.br/ws/${postalCode}/json/`, { signal: controller.signal })
      .then(response => { if (!response.ok) throw new Error(); return response.json(); })
      .then((result: { erro?: boolean; logradouro?: string; bairro?: string; localidade?: string; uf?: string }) => {
        if (result.erro || typeof result.localidade !== 'string' || typeof result.uf !== 'string') { setCepStatus('CEP não encontrado. Você pode preencher o endereço manualmente.'); return; }
        setAnswers(current => ({ ...current, street: typeof result.logradouro === 'string' ? result.logradouro : current['street'] ?? '', neighborhood: typeof result.bairro === 'string' ? result.bairro : current['neighborhood'] ?? '', city: result.localidade, state: result.uf }));
        setCepStatus('Endereço preenchido pelo CEP.');
      })
      .catch(error => { if (error instanceof Error && error.name !== 'AbortError') setCepStatus('Não foi possível consultar o CEP. Preencha o endereço manualmente.'); });
    return () => controller.abort();
  }, [answers['postal_code']]);

  useEffect(() => {
    if (!resumeKey || screen !== 'form') return;
    const timer = window.setTimeout(() => {
      setSaving(true); setSaveMessage('Salvando com segurança…');
      const pending = saveQueue.current.catch(() => undefined).then(async () => { await savePsychologicalAnamnesis(resumeKey, answers); });
      saveQueue.current = pending;
      void pending.then(() => setSaveMessage('Rascunho salvo com segurança.')).catch(() => setSaveMessage('Não foi possível salvar agora. Tente novamente.')).finally(() => setSaving(false));
    }, 900);
    return () => window.clearTimeout(timer);
  }, [answers, resumeKey, screen]);
  useEffect(() => {
    if (!resumeKey || screen === 'submitted') return;
    const confirmExit = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', confirmExit);
    return () => window.removeEventListener('beforeunload', confirmExit);
  }, [resumeKey, screen]);

  async function start() {
    if (birthAge === null) { setError('Informe uma data de nascimento válida.'); return; }
    if (birthAge < 18) { setScreen('underage'); setError(''); return; }
    setBusy(true); setError('');
    try { const result = await startPsychologicalAnamnesis(birthDate); setResumeKey(result.resumeKey); setAnswers({ date_of_birth: birthDate }); setScreen('form'); }
    catch { setError('Não foi possível iniciar a ficha. Tente novamente.'); } finally { setBusy(false); }
  }
  async function resume() {
    const key = resumeInput.trim(); if (!key) { setError('Digite sua chave de retomada.'); return; }
    setBusy(true); setError('');
    try { const result = await loadPsychologicalAnamnesis(key); if (ageOnDate(result.birthDate) === null || ageOnDate(result.birthDate)! < 18) throw new Error(); setBirthDate(result.birthDate); setAnswers({ ...result.responses, date_of_birth: result.birthDate }); setResumeKey(key); setSignedName(String(result.responses['signed_name'] ?? '')); setScreen('form'); }
    catch { setError('Não foi possível recuperar este rascunho. Confira a chave e tente novamente.'); } finally { setBusy(false); }
  }
  async function copyResumeKey() { await navigator.clipboard.writeText(resumeKey); setCopied(true); window.setTimeout(() => setCopied(false), 1800); }
  function toggleArray(key: string, item: string, exclusive: readonly string[] = []) {
    const current = selected(key);
    const next = current.includes(item) ? current.filter(value => value !== item) : exclusive.includes(item) ? [item] : [...current.filter(value => !exclusive.includes(value)), item];
    set(key, next);
  }
  function requiredError() {
    if (!value('full_name').trim()) return 'Informe seu nome completo.';
    if (!value('phone') || !validPhone(value('phone'))) return 'Informe um WhatsApp válido com DDD.';
    if (!value('email') || !validEmail(value('email'))) return 'Informe um e-mail válido.';
    if (!value('city').trim()) return 'Informe sua cidade.';
    if (!value('state')) return 'Selecione seu estado.';
    return '';
  }
  const currentRisk = value('death_thoughts_current') === 'Sim';
  const riskFollowup = currentRisk || value('suicidal_thoughts_ever') === 'Sim';
  const showAccessQuestion = value('suicide_plan') === 'Sim' || currentRisk;

  function next() {
    setError('');
    if (step === 0) { const issue = requiredError(); if (issue) { setError(issue); return; } }
    if (step < anamnesisSteps.length - 1) { setStep(current => current + 1); formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  }
  function jumpTo(index: number) { setStep(index); setReviewStage(false); setConfirmSubmit(false); setError(''); formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  function review() {
    const issue = requiredError(); if (issue) { setStep(0); setError(issue); return; }
    if (value('consent_accepted') !== 'true') { setError('Confirme que leu e aceita o termo para prosseguir.'); return; }
    const fullName = value('full_name').trim().replace(/\s+/g, ' ');
    if (!signedName.trim() || signedName.trim().replace(/\s+/g, ' ') !== fullName) { setError('Digite o mesmo nome completo informado na identificação para assinar.'); return; }
    set('signed_name', signedName.trim().replace(/\s+/g, ' ')); setReviewStage(true); setError('');
  }
  async function submit(event: FormEvent) {
    event.preventDefault(); if (!reviewStage) { review(); return; }
    if (!confirmSubmit) { setConfirmSubmit(true); return; }
    setBusy(true); setError('');
    try {
      const finalAnswers = { ...answers, date_of_birth: birthDate, signed_name: signedName.trim().replace(/\s+/g, ' '), consent_accepted: 'true' };
      await saveQueue.current.catch(() => undefined);
      await savePsychologicalAnamnesis(resumeKey, finalAnswers);
      const result = await submitPsychologicalAnamnesis(resumeKey, finalAnswers, signedName.trim().replace(/\s+/g, ' '));
      setSubmissionId(result.id); setScreen('submitted');
    } catch { setError('Não foi possível enviar a ficha agora. Suas respostas permanecem salvas; tente novamente.'); } finally { setBusy(false); }
  }

  if (screen === 'submitted') return <main className="grid min-h-screen place-items-center bg-[#f5f7f2] px-5 py-12"><section className="w-full max-w-lg rounded-3xl border border-[#d7e4db] bg-white p-8 text-center shadow-xl sm:p-10"><div className="mx-auto grid size-14 place-items-center rounded-full bg-[#e8f3ec] text-[#17675b]"><ShieldCheck className="size-7" /></div><h1 className="mt-5 font-display text-2xl font-semibold text-[#173f3a]">Anamnese encaminhada</h1><p className="mt-3 text-sm leading-7 text-[#65756e]">Sua ficha foi recebida e encaminhada ao profissional. Ela será analisada antes do atendimento. O preenchimento não substitui uma consulta ou avaliação profissional.</p><p className="mt-4 text-xs text-[#82918a]">Protocolo: {submissionId}</p></section></main>;

  return <main className="min-h-screen bg-[radial-gradient(ellipse_at_top,_rgba(207,230,214,.62),_transparent_38%),#f5f7f2] px-4 py-7 sm:px-6 sm:py-10"><div className="mx-auto max-w-4xl">
    <header className="mb-7 flex items-center justify-between gap-4 rounded-2xl border border-white/80 bg-white/80 p-4 shadow-sm backdrop-blur sm:p-5"><div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#a0814d]">Anamnese Psicológica Digital</p><p className="mt-1 font-display text-lg font-semibold text-[#173f3a] sm:text-xl">Dr. Frederick Parreira</p><p className="mt-1 text-xs text-[#687873]">Psicólogo — CRP 04/86194</p></div><span className="hidden size-12 place-items-center rounded-full bg-[#075e54] font-display text-xl text-white sm:grid">Ψ</span></header>
    {screen === 'underage' ? <section className="mx-auto max-w-xl rounded-3xl border border-[#e4d8bd] bg-white p-7 shadow-lg sm:p-10"><div className="grid size-12 place-items-center rounded-full bg-[#fbf4e6] text-[#9b7941]"><AlertTriangle className="size-6" /></div><h1 className="mt-5 font-display text-2xl font-semibold text-[#173f3a]">Formulário específico necessário</h1><p className="mt-3 text-sm leading-7 text-[#65756e]">O formulário adulto não pode ser preenchido por menores de 18 anos. O atendimento de crianças e adolescentes exige um formulário específico e orientação da clínica. Entre em contato com a equipe para receber as instruções adequadas.</p><Button type="button" variant="outline" className="mt-6 rounded-full" onClick={() => { setScreen('gate'); setError(''); }}>Voltar</Button></section> : screen === 'gate' ? <section className="mx-auto max-w-xl rounded-3xl border border-white bg-white p-6 shadow-lg sm:p-9"><div className="mb-6"><p className="text-xs font-bold uppercase tracking-[.16em] text-[#347d68]">Antes de começar</p><h1 className="mt-2 font-display text-2xl font-semibold text-[#173f3a]">Confirme sua idade</h1><p className="mt-3 text-sm leading-6 text-[#65756e]">Esta versão é exclusiva para pessoas com 18 anos ou mais.</p></div><Field label="Data de nascimento" required><Input type="date" value={birthDate} max={new Date().toISOString().slice(0, 10)} onChange={event => { setBirthDate(event.target.value); setError(''); }} className="border-[#d3dfd8]" /></Field>{error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}<Button type="button" disabled={busy || !birthDate} onClick={() => void start()} className="mt-6 w-full rounded-full bg-[#17675b] hover:bg-[#12574d]">{busy ? <LoaderCircle className="mr-2 size-4 animate-spin" /> : null}Continuar</Button><div className="my-6 flex items-center gap-3 text-xs text-[#82918a]"><span className="h-px flex-1 bg-[#e3ebe5]" />Já começou?<span className="h-px flex-1 bg-[#e3ebe5]" /></div><Field label="Chave de retomada"><Input value={resumeInput} onChange={event => setResumeInput(event.target.value)} autoComplete="off" placeholder="Cole sua chave salva" className="border-[#d3dfd8]" /></Field><Button type="button" variant="outline" disabled={busy || !resumeInput.trim()} onClick={() => void resume()} className="mt-3 w-full rounded-full">Retomar preenchimento</Button></section> : <>
      <section className="mb-5 rounded-2xl border border-[#d7e4db] bg-white/90 p-4 shadow-sm sm:p-5"><div className="mb-2 flex items-center justify-between gap-4"><span className="text-xs font-semibold text-[#315e52]">{reviewStage ? 'Revisão final' : `Etapa ${step + 1} de 13`}</span><span className="text-right text-xs font-medium text-[#73837b]">{reviewStage ? 'Confira suas respostas' : anamnesisSteps[step]}</span></div><Progress value={progress} className="h-2 bg-[#e8efea] [&>div]:bg-[#26786e]" /><p className="mt-2 text-right text-xs text-[#73837b]">{Math.round(progress)}% concluído</p></section>
      <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-[#eadfc9] bg-[#fffdf8] p-4 text-sm text-[#675940] sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="font-semibold">Salvar e continuar depois</p><p className="mt-1 text-xs leading-5">Guarde sua chave em local seguro para retomar. As respostas ficam no servidor protegido, não no armazenamento local do navegador.</p><code className="mt-2 block break-all rounded bg-white p-2 text-[11px] text-[#37554a]">{resumeKey}</code></div><Button type="button" variant="outline" onClick={() => void copyResumeKey()} className="shrink-0 rounded-full border-[#d8c8a6] text-[#735c34]"><Clipboard className="mr-2 size-4" />{copied ? 'Copiada' : 'Copiar chave'}</Button></div>
      <form ref={formRef} onSubmit={submit} className="space-y-5">
        <section className="rounded-3xl border border-white bg-white p-5 shadow-lg transition-all duration-300 sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[.18em] text-[#a0814d]">{reviewStage ? 'Revisão' : `Etapa ${step + 1}`}</p><h1 className="mt-2 font-display text-2xl font-semibold text-[#173f3a] sm:text-3xl">{reviewStage ? 'Revise sua anamnese' : anamnesisSteps[step]}</h1><p className="mt-2 text-sm leading-6 text-[#718078]">Responda no seu ritmo. Os campos clínicos são opcionais.</p>
          {!reviewStage && <div className="mt-7 space-y-7">
            {step === 0 && <>
              <Field label="Nome completo" required><Input maxLength={200} autoComplete="name" value={value('full_name')} onChange={event => set('full_name', event.target.value)} className="border-[#d3dfd8]" /></Field>
              <Field label="Data de nascimento" required><Input type="date" value={birthDate} readOnly className="border-[#d3dfd8] bg-[#f4f7f3]" /></Field>
              <div className="grid gap-6 sm:grid-cols-2"><Field label="CPF"><Input inputMode="numeric" value={value('cpf')} onChange={event => set('cpf', event.target.value.replace(/\D/g,'').slice(0,11))} className="border-[#d3dfd8]" /></Field><Field label="Telefone/WhatsApp" required><Input type="tel" autoComplete="tel" inputMode="tel" placeholder="(00) 00000-0000" value={value('phone')} onChange={event => set('phone', normalizePhone(event.target.value))} className="border-[#d3dfd8]" /></Field><Field label="E-mail" required><Input type="email" autoComplete="email" value={value('email')} onChange={event => set('email', event.target.value)} className="border-[#d3dfd8]" /></Field><Field label="Profissão"><Input value={value('profession')} onChange={event => set('profession', event.target.value)} className="border-[#d3dfd8]" /></Field><Field label="Estado civil"><ChoiceGroup value={value('civil_status')} onChange={next => set('civil_status', next)} options={civilStatusOptions} /></Field></div>
              <div><h2 className="font-semibold text-[#24584e]">Endereço (opcional)</h2><div className="mt-3 grid gap-4 sm:grid-cols-2"><Field label="CEP" hint={cepStatus}><Input inputMode="numeric" autoComplete="postal-code" maxLength={8} value={value('postal_code')} onChange={event => set('postal_code', event.target.value.replace(/\D/g,'').slice(0,8))} className="border-[#d3dfd8]" /></Field><Field label="Logradouro"><Input value={value('street')} onChange={event => set('street', event.target.value)} className="border-[#d3dfd8]" /></Field><Field label="Bairro"><Input value={value('neighborhood')} onChange={event => set('neighborhood', event.target.value)} className="border-[#d3dfd8]" /></Field><Field label="Número"><Input value={value('street_number')} onChange={event => set('street_number', event.target.value)} className="border-[#d3dfd8]" /></Field><Field label="Complemento"><Input value={value('address_complement')} onChange={event => set('address_complement', event.target.value)} className="border-[#d3dfd8]" /></Field></div></div>
              <div className="grid gap-6 sm:grid-cols-2"><Field label="Cidade" required><Input autoComplete="address-level2" value={value('city')} onChange={event => set('city', event.target.value)} className="border-[#d3dfd8]" /></Field><Field label="Estado" required><select aria-label="Estado" value={value('state')} onChange={event => set('state', event.target.value)} className="h-10 rounded-md border border-[#d3dfd8] bg-white px-3 text-sm"><option value="">Selecione</option>{states.map(state => <option key={state} value={state}>{state} — {stateNames[state]}</option>)}</select></Field></div>
              <Field label="Com quem mora?"><MultiChoice value={selected('household')} onChange={next => set('household', next)} options={householdOptions} exclusive={householdExclusive} /></Field><Field label="Escolaridade"><ChoiceGroup value={value('education')} onChange={next => set('education', next)} options={educationOptions} /></Field>
            </>}
            {step === 1 && <>
              <Field label={anamnesisFieldLabels['main_concern'] ?? 'main_concern'}><TextAnswer rows={6} value={value('main_concern')} onChange={next => set('main_concern', next)} /></Field>
              <Field label={anamnesisFieldLabels['onset'] ?? 'onset'}><ChoiceGroup value={value('onset')} onChange={next => set('onset', next)} options={onsetOptions} /></Field>
              <Field label={anamnesisFieldLabels['trigger_event'] ?? 'trigger_event'}><ChoiceGroup value={value('trigger_event')} onChange={next => set('trigger_event', next)} options={yesNoOptions} /></Field>{value('trigger_event') === 'Sim' && <Field label={anamnesisFieldLabels['trigger_event_details'] ?? 'trigger_event_details'}><TextAnswer value={value('trigger_event_details')} onChange={next => set('trigger_event_details', next)} /></Field>}
              {(['treatment_expectation','work_study_impact','social_impact','family_impact'] as const).map(key => <Field key={key} label={labelFor(key)}><TextAnswer value={value(key)} onChange={next => set(key,next)} rows={4} /></Field>)}
              <RangeAnswer label={anamnesisFieldLabels['life_impact_scale'] ?? 'life_impact_scale'} value={value('life_impact_scale')} onChange={next => set('life_impact_scale',next)} />
            </>}
            {step === 2 && <>
              <Field label={anamnesisFieldLabels['symptoms'] ?? 'symptoms'}><MultiChoice value={selected('symptoms')} onChange={next => set('symptoms',next)} options={symptomOptions} /></Field><Field label={anamnesisFieldLabels['other_symptoms'] ?? 'other_symptoms'}><TextAnswer value={value('other_symptoms')} onChange={next => set('other_symptoms',next)} rows={4} /></Field>
              <p className="text-sm font-semibold text-[#24584e]">Considerando a última semana, avalie de 0 a 10:</p>{(['anxiety_scale','stress_scale','quality_of_life_scale','self_esteem_scale'] as const).map(key => <RangeAnswer key={key} label={labelFor(key)} value={value(key)} onChange={next => set(key,next)} />)}
            </>}
            {step === 3 && <>
              <div className="rounded-2xl border border-[#e6d9c0] bg-[#fffaf0] p-4 text-sm leading-6 text-[#634f2d]"><AlertTriangle className="mb-2 size-5" /><p>Este formulário não é monitorado em tempo real e não substitui atendimento de emergência. Se você estiver em perigo imediato ou sentir que pode se machucar, procure um serviço de emergência ou atendimento presencial imediatamente.</p><p className="mt-2">Se necessário, ligue para o SAMU (192), procure uma UPA/pronto-socorro ou ligue gratuitamente para o CVV (188).</p></div>
              <Field label={anamnesisFieldLabels['suicidal_thoughts_ever'] ?? 'suicidal_thoughts_ever'}><ChoiceGroup value={value('suicidal_thoughts_ever')} onChange={next => set('suicidal_thoughts_ever',next)} options={yesNoOptions} /></Field><Field label={anamnesisFieldLabels['death_thoughts_current'] ?? 'death_thoughts_current'}><ChoiceGroup value={value('death_thoughts_current')} onChange={next => set('death_thoughts_current',next)} options={yesNoOptions} /></Field>
              {currentRisk && <Field label={anamnesisFieldLabels['death_thoughts_frequency'] ?? 'death_thoughts_frequency'}><ChoiceGroup value={value('death_thoughts_frequency')} onChange={next => set('death_thoughts_frequency',next)} options={frequencyOptions} /></Field>}
              {riskFollowup && <Field label={anamnesisFieldLabels['suicide_plan'] ?? 'suicide_plan'}><ChoiceGroup value={value('suicide_plan')} onChange={next => set('suicide_plan',next)} options={yesNoOptions} /></Field>}{showAccessQuestion && <Field label={anamnesisFieldLabels['access_to_means'] ?? 'access_to_means'}><ChoiceGroup value={value('access_to_means')} onChange={next => set('access_to_means',next)} options={['Sim','Não','Prefiro não responder']} /></Field>}
              {riskFollowup && <><Field label={anamnesisFieldLabels['protective_factors'] ?? 'protective_factors'}><TextAnswer value={value('protective_factors')} onChange={next => set('protective_factors',next)} /></Field><RangeAnswer label={anamnesisFieldLabels['thoughts_intensity'] ?? 'thoughts_intensity'} value={value('thoughts_intensity')} onChange={next => set('thoughts_intensity',next)} /></>}
              <Field label={anamnesisFieldLabels['self_harm_ever'] ?? 'self_harm_ever'}><ChoiceGroup value={value('self_harm_ever')} onChange={next => set('self_harm_ever',next)} options={yesNoOptions} /></Field>{value('self_harm_ever') === 'Sim' && <Field label={anamnesisFieldLabels['self_harm_details'] ?? 'self_harm_details'}><TextAnswer rows={4} value={value('self_harm_details')} onChange={next => set('self_harm_details',next)} /></Field>}
            </>}
            {step === 4 && <>
              <Field label={anamnesisFieldLabels['previous_treatment'] ?? 'previous_treatment'}><ChoiceGroup value={value('previous_treatment')} onChange={next => set('previous_treatment',next)} options={yesNoOptions} /></Field>{value('previous_treatment') === 'Não' && <p className="rounded-lg bg-[#f5f8f4] p-3 text-sm text-[#38594e]">NUNCA FIZ</p>}{value('previous_treatment') === 'Sim' && <Field label={anamnesisFieldLabels['previous_treatment_details'] ?? 'previous_treatment_details'}><TextAnswer value={value('previous_treatment_details')} onChange={next => set('previous_treatment_details',next)} /></Field>}
              <Field label={anamnesisFieldLabels['medication_use'] ?? 'medication_use'}><ChoiceGroup value={value('medication_use')} onChange={next => set('medication_use',next)} options={yesNoOptions} /></Field>{value('medication_use') === 'Sim' && <div className="grid gap-5 rounded-2xl bg-[#f5f8f4] p-4 sm:grid-cols-2"><Field label={anamnesisFieldLabels['medication_name_dose'] ?? 'medication_name_dose'}><TextAnswer value={value('medication_name_dose')} onChange={next => set('medication_name_dose',next)} /></Field><Field label={anamnesisFieldLabels['medication_duration'] ?? 'medication_duration'}><Input value={value('medication_duration')} onChange={event => set('medication_duration',event.target.value)} /></Field><Field label={anamnesisFieldLabels['medication_prescriber'] ?? 'medication_prescriber'}><Input value={value('medication_prescriber')} onChange={event => set('medication_prescriber',event.target.value)} /></Field><Field label={anamnesisFieldLabels['medication_adherence'] ?? 'medication_adherence'}><ChoiceGroup value={value('medication_adherence')} onChange={next => set('medication_adherence',next)} options={medicationAdherenceOptions} /></Field><Field label={anamnesisFieldLabels['medication_benefit'] ?? 'medication_benefit'}><ChoiceGroup value={value('medication_benefit')} onChange={next => set('medication_benefit',next)} options={medicationBenefitOptions} /></Field></div>}
              <Field label={anamnesisFieldLabels['physical_health_history'] ?? 'physical_health_history'}><ChoiceGroup value={value('physical_health_history')} onChange={next => set('physical_health_history',next)} options={yesNoOptions} /></Field>{value('physical_health_history') === 'Sim' && <Field label={anamnesisFieldLabels['physical_health_details'] ?? 'physical_health_details'}><TextAnswer value={value('physical_health_details')} onChange={next => set('physical_health_details',next)} /></Field>}
              <Field label={anamnesisFieldLabels['hospitalizations'] ?? 'hospitalizations'}><ChoiceGroup value={value('hospitalizations')} onChange={next => set('hospitalizations',next)} options={yesNoOptions} /></Field>{value('hospitalizations') === 'Sim' && <div className="grid gap-4 sm:grid-cols-2"><Field label={anamnesisFieldLabels['hospitalization_reason'] ?? 'hospitalization_reason'}><TextAnswer value={value('hospitalization_reason')} onChange={next => set('hospitalization_reason',next)} /></Field><Field label={anamnesisFieldLabels['hospitalization_year'] ?? 'hospitalization_year'}><Input inputMode="numeric" maxLength={4} value={value('hospitalization_year')} onChange={event => set('hospitalization_year',event.target.value.replace(/\D/g,'').slice(0,4))} /></Field></div>}
            </>}
            {step === 5 && <>
              <Field label={anamnesisFieldLabels['childhood_adolescence'] ?? 'childhood_adolescence'}><TextAnswer rows={6} value={value('childhood_adolescence')} onChange={next => set('childhood_adolescence',next)} /></Field><Field label={anamnesisFieldLabels['abuse_experiences'] ?? 'abuse_experiences'}><MultiChoice value={selected('abuse_experiences')} onChange={next => set('abuse_experiences',next)} options={abuseOptions} exclusive={abuseExclusive} /></Field>{selected('abuse_experiences').some(item => !abuseExclusive.includes(item)) && <Field label={anamnesisFieldLabels['abuse_details'] ?? 'abuse_details'}><TextAnswer rows={4} value={value('abuse_details')} onChange={next => set('abuse_details',next)} /></Field>}
              <Field label={anamnesisFieldLabels['repeated_patterns'] ?? 'repeated_patterns'}><TextAnswer value={value('repeated_patterns')} onChange={next => set('repeated_patterns',next)} /></Field><Field label={anamnesisFieldLabels['adult_professional_life'] ?? 'adult_professional_life'}><TextAnswer rows={5} value={value('adult_professional_life')} onChange={next => set('adult_professional_life',next)} /></Field>
            </>}
            {step === 6 && <>
              {(['mother_relationship','father_relationship'] as const).map(key => <Field key={key} label={labelFor(key)}><TextAnswer value={value(key)} onChange={next => set(key,next)} rows={4} /></Field>)}<Field label={anamnesisFieldLabels['parental_presence'] ?? 'parental_presence'}><ChoiceGroup value={value('parental_presence')} onChange={next => set('parental_presence',next)} options={familyPresenceOptions} /></Field><Field label={anamnesisFieldLabels['childhood_warmth'] ?? 'childhood_warmth'}><ChoiceGroup value={value('childhood_warmth')} onChange={next => set('childhood_warmth',next)} options={childhoodFeelingOptions} /></Field><Field label={anamnesisFieldLabels['critical_figure'] ?? 'critical_figure'}><ChoiceGroup value={value('critical_figure')} onChange={next => set('critical_figure',next)} options={criticalFigureOptions} /></Field><Field label={anamnesisFieldLabels['family_mental_health'] ?? 'family_mental_health'}><MultiChoice value={selected('family_mental_health')} onChange={next => set('family_mental_health',next)} options={familyHistoryOptions} exclusive={familyExclusive} /></Field>
            </>}
            {step === 7 && <>
              {(['loneliness','inner_void','abandonment_fear','inadequacy','frustration','loss_of_control','impulsivity'] as const).map(key => <Field key={key} label={labelFor(key)}><ChoiceGroup value={value(key)} onChange={next => set(key,next)} options={yesNoSometimesOptions} /></Field>)}<Field label={anamnesisFieldLabels['insight'] ?? 'insight'}><ChoiceGroup value={value('insight')} onChange={next => set('insight',next)} options={insightOptions} /></Field>{(['support_person','immediate_support','future_projection','desired_change'] as const).map(key => <Field key={key} label={labelFor(key)}><TextAnswer rows={key === 'future_projection' || key === 'desired_change' ? 5 : 3} value={value(key)} onChange={next => set(key,next)} /></Field>)}
            </>}
            {step === 8 && <>
              <Field label={anamnesisFieldLabels['daily_routine'] ?? 'daily_routine'}><TextAnswer value={value('daily_routine')} onChange={next => set('daily_routine',next)} rows={4} /></Field><Field label={anamnesisFieldLabels['sleep'] ?? 'sleep'}><MultiChoice value={selected('sleep')} onChange={next => set('sleep',next)} options={sleepOptions} /></Field><Field label={anamnesisFieldLabels['appetite'] ?? 'appetite'}><ChoiceGroup value={value('appetite')} onChange={next => set('appetite',next)} options={appetiteOptions} /></Field><Field label={anamnesisFieldLabels['physical_activity'] ?? 'physical_activity'}><ChoiceGroup value={value('physical_activity')} onChange={next => set('physical_activity',next)} options={yesNoOptions} /></Field>{value('physical_activity') === 'Sim' && <Field label={anamnesisFieldLabels['physical_activity_frequency'] ?? 'physical_activity_frequency'}><ChoiceGroup value={value('physical_activity_frequency')} onChange={next => set('physical_activity_frequency',next)} options={activityFrequencyOptions} /></Field>}<Field label={anamnesisFieldLabels['leisure'] ?? 'leisure'}><TextAnswer value={value('leisure')} onChange={next => set('leisure',next)} /></Field><Field label={anamnesisFieldLabels['substances'] ?? 'substances'}><MultiChoice value={selected('substances')} onChange={next => set('substances',next)} options={substanceOptions} exclusive={substanceExclusive} /></Field>{selected('substances').some(item => !substanceExclusive.includes(item)) && <><Field label={anamnesisFieldLabels['substances_frequency'] ?? 'substances_frequency'}><ChoiceGroup value={value('substances_frequency')} onChange={next => set('substances_frequency',next)} options={frequencyOptions} /></Field><Field label={anamnesisFieldLabels['substances_details'] ?? 'substances_details'}><TextAnswer value={value('substances_details')} onChange={next => set('substances_details',next)} /></Field></>}
            </>}
            {step === 9 && <>
              <Field label={anamnesisFieldLabels['sexual_orientation'] ?? 'sexual_orientation'}><ChoiceGroup value={value('sexual_orientation')} onChange={next => set('sexual_orientation',next)} options={orientationOptions} /></Field><Field label={anamnesisFieldLabels['gender_identity'] ?? 'gender_identity'}><ChoiceGroup value={value('gender_identity')} onChange={next => set('gender_identity',next)} options={genderIdentityOptions} /></Field><Field label={anamnesisFieldLabels['sexual_activity'] ?? 'sexual_activity'}><ChoiceGroup value={value('sexual_activity')} onChange={next => set('sexual_activity',next)} options={sexualActivityOptions} /></Field>{value('sexual_activity') === 'Sim' && <Field label={anamnesisFieldLabels['sexual_frequency'] ?? 'sexual_frequency'}><ChoiceGroup value={value('sexual_frequency')} onChange={next => set('sexual_frequency',next)} options={sexualFrequencyOptions} /></Field>}<RangeAnswer label={anamnesisFieldLabels['sexual_satisfaction'] ?? 'sexual_satisfaction'} value={value('sexual_satisfaction')} onChange={next => set('sexual_satisfaction',next)} /><Field label={anamnesisFieldLabels['sexual_satisfaction_details'] ?? 'sexual_satisfaction_details'}><TextAnswer value={value('sexual_satisfaction_details')} onChange={next => set('sexual_satisfaction_details',next)} /></Field><Field label={anamnesisFieldLabels['sexual_difficulties'] ?? 'sexual_difficulties'}><ChoiceGroup value={value('sexual_difficulties')} onChange={next => set('sexual_difficulties',next)} options={sexualDifficultyOptions} /></Field>{value('sexual_difficulties') === 'Sim' && <Field label={anamnesisFieldLabels['sexual_difficulties_details'] ?? 'sexual_difficulties_details'}><TextAnswer value={value('sexual_difficulties_details')} onChange={next => set('sexual_difficulties_details',next)} /></Field>}
            </>}
            {step === 10 && <>
              <Field label={anamnesisFieldLabels['religion_belief'] ?? 'religion_belief'}><ChoiceGroup value={value('religion_belief')} onChange={next => set('religion_belief',next)} options={religionOptions} /></Field><Field label={anamnesisFieldLabels['spiritual_practice'] ?? 'spiritual_practice'}><ChoiceGroup value={value('spiritual_practice')} onChange={next => set('spiritual_practice',next)} options={yesNoOptions} /></Field>{value('spiritual_practice') === 'Sim' && <Field label={anamnesisFieldLabels['spiritual_frequency'] ?? 'spiritual_frequency'}><ChoiceGroup value={value('spiritual_frequency')} onChange={next => set('spiritual_frequency',next)} options={practiceFrequencyOptions} /></Field>}<Field label={anamnesisFieldLabels['spiritual_support'] ?? 'spiritual_support'}><TextAnswer value={value('spiritual_support')} onChange={next => set('spiritual_support',next)} rows={4} /></Field>
            </>}
            {step === 11 && <Field label={anamnesisFieldLabels['additional_observations'] ?? 'additional_observations'}><TextAnswer value={value('additional_observations')} onChange={next => set('additional_observations',next)} rows={7} /></Field>}
            {step === 12 && <>
              <div className="rounded-2xl border border-[#d9e5dc] bg-[#f8faf7] p-4 sm:p-5"><div className="mb-4 flex items-start gap-2 text-[#17675b]"><ShieldCheck className="mt-1 size-5 shrink-0" /><div><h2 className="font-semibold">TERMO DE CONSENTIMENTO E CIÊNCIA SOBRE O TRATAMENTO DE DADOS PESSOAIS</h2><p className="mt-1 text-sm">Dr. Frederick Parreira — Psicólogo · CRP 04/86194</p></div></div><p className="mb-4 text-xs font-semibold text-[#7d6b48]">Versão {consentVersion}</p><div className="max-h-[32rem] space-y-5 overflow-y-auto rounded-xl border border-[#e2e9e3] bg-white p-4 text-sm leading-7 text-[#42554d] sm:p-6">{consentSections.map(([heading, paragraphs]) => <section key={heading}><h3 className="mb-2 font-bold text-[#1d4f44]">{heading}</h3>{paragraphs.map((paragraph,index) => <p key={index} className="mt-2">{paragraph}</p>)}</section>)}</div><p className="mt-3 text-xs leading-5 text-[#718078]">O tratamento de dados poderá ter bases legais distintas conforme sua finalidade. O aceite não é uma autorização genérica para finalidades diferentes. A assinatura eletrônica não substitui outros requisitos legais de informação e consentimento.</p></div>
              <Field label="Confirmo que li o documento e estou ciente das informações apresentadas." required><label className="flex items-start gap-3 rounded-xl border border-[#d7e4db] bg-white p-4 text-sm leading-6 text-[#34574c]"><Checkbox checked={value('consent_accepted') === 'true'} onCheckedChange={checked => set('consent_accepted', checked === true ? 'true' : '')} className="mt-1 border-[#99b5a5] data-[state=checked]:bg-[#26786e]" />Li integralmente e confirmo ciência/aceite do termo, quando o consentimento for a base legal aplicável.</label></Field>
              <Field label="Nome completo como assinatura eletrônica" required><Input autoComplete="name" value={signedName} onChange={event => setSignedName(event.target.value)} className="border-[#d3dfd8]" /></Field><p className="text-xs leading-5 text-[#708079]">A confirmação registra esta versão do termo, horário e identificador da ficha após o envio.</p>
            </>}
          </div>}
          {reviewStage && <div className="mt-7 space-y-4"><p className="rounded-xl border border-[#d9e5dc] bg-[#f8faf7] p-4 text-sm leading-6 text-[#315e52]">Revise as respostas preenchidas. Campos opcionais não respondidos são indicados e não impedem o envio.</p>{anamnesisSteps.slice(0,12).map((title,index) => {const keys = Object.keys(answers).filter(key => sectionIndex(key) === index);const rows = keys.map(key => [key,answers[key]] as const).filter(([,answer]) => answer !== '' && (!Array.isArray(answer) || answer.length > 0));const unanswered = expectedKeys(index).filter(key => !answers[key] || (Array.isArray(answers[key]) && !(answers[key] as string[]).length));return <section key={title} className="rounded-2xl border border-[#d6e2db] bg-[#fbfcfa] p-4"><div className="flex items-center justify-between gap-3"><h2 className="font-semibold text-[#24584e]">{title}</h2><Button type="button" variant="outline" size="sm" onClick={() => jumpTo(index)}>Editar</Button></div>{rows.length ? <dl className="mt-4 space-y-3">{rows.map(([key,answer]) => <div key={key}><dt className="text-xs font-semibold text-[#67766f]">{anamnesisFieldLabels[key] ?? key}</dt><dd className="mt-1 whitespace-pre-wrap text-sm leading-6 text-[#243f38]">{formatAnswer(answer as AnswerValue)}</dd></div>)}</dl> : <p className="mt-3 text-sm text-[#718078]">Nenhuma resposta preenchida.</p>}<p className="mt-3 text-xs text-[#82918a]">{unanswered.length ? `${unanswered.length} campo(s) opcional(is) sem resposta.` : 'Campos obrigatórios desta etapa preenchidos.'}</p></section>;})}<section className="rounded-2xl border border-[#d6e2db] bg-[#fbfcfa] p-4"><div className="flex items-center justify-between gap-3"><h2 className="font-semibold text-[#24584e]">Consentimento e assinatura</h2><Button type="button" variant="outline" size="sm" onClick={() => jumpTo(12)}>Editar</Button></div><p className="mt-3 text-sm">Ciência confirmada: {value('consent_accepted') === 'true' ? 'Sim' : 'Não'} · Assinatura: {signedName || 'Não informada'} · Versão {consentVersion}</p></section></div>}
        </section>
        {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
        <div className="flex flex-col-reverse justify-between gap-3 sm:flex-row sm:items-center"><p role="status" className="text-xs text-[#73837b]">{saving ? 'Salvando…' : saveMessage}</p><div className="flex flex-wrap justify-between gap-2"><Button type="button" variant="outline" disabled={step === 0 || busy} onClick={() => {setError('');if(reviewStage){setReviewStage(false);setConfirmSubmit(false);}else setStep(current=>current-1);}} className="rounded-full border-[#c9d9d0] text-[#315e52]"><ArrowLeft className="mr-2 size-4" />Voltar</Button>{!reviewStage ? step < 12 ? <Button type="button" onClick={next} disabled={busy} className="rounded-full bg-[#17675b] px-6 hover:bg-[#12574d]">Próxima etapa<ArrowRight className="ml-2 size-4" /></Button> : <Button type="button" onClick={review} disabled={busy} className="rounded-full bg-[#17675b] px-6 hover:bg-[#12574d]">Revisar respostas<ArrowRight className="ml-2 size-4" /></Button> : !confirmSubmit ? <Button type="button" onClick={() => setConfirmSubmit(true)} className="rounded-full bg-[#17675b] px-6 hover:bg-[#12574d]">FINALIZAR E ENVIAR ANAMNESE<ArrowRight className="ml-2 size-4" /></Button> : <Button type="submit" disabled={busy} className="rounded-full bg-[#17675b] px-6 hover:bg-[#12574d]">{busy ? <LoaderCircle className="mr-2 size-4 animate-spin" /> : <Check className="mr-2 size-4" />}Confirmar envio</Button>}</div></div>
        {confirmSubmit && reviewStage && <div role="alertdialog" aria-live="assertive" className="rounded-xl border border-[#d7c89e] bg-[#fffaf0] p-4 text-sm text-[#634f2d]"><strong>Confirmar envio definitivo?</strong><p className="mt-1">Após o envio, esta ficha não poderá ser editada por esta chave.</p><Button type="button" variant="outline" className="mt-3 mr-2" onClick={() => setConfirmSubmit(false)}>Continuar revisando</Button><Button type="submit" disabled={busy} className="mt-3 bg-[#17675b]">Enviar agora</Button></div>}
      </form>
    </>}
    <footer className="mt-8 text-center text-[11px] leading-5 text-[#84918b]">As respostas são confidenciais e acessíveis apenas à equipe profissional autorizada. Esta anamnese não substitui consulta ou avaliação profissional e não é monitorada para emergências.</footer>
  </div></main>;
}

function sectionIndex(key: string) {
  if (['full_name','date_of_birth','cpf','phone','email','profession','civil_status','postal_code','street','neighborhood','street_number','address_complement','city','state','household','education'].includes(key)) return 0;
  if (['main_concern','onset','trigger_event','trigger_event_details','treatment_expectation','work_study_impact','social_impact','family_impact','life_impact_scale'].includes(key)) return 1;
  if (['symptoms','other_symptoms','anxiety_scale','stress_scale','quality_of_life_scale','self_esteem_scale'].includes(key)) return 2;
  if (['suicidal_thoughts_ever','death_thoughts_current','death_thoughts_frequency','suicide_plan','access_to_means','protective_factors','thoughts_intensity','self_harm_ever','self_harm_details'].includes(key)) return 3;
  if (['previous_treatment','previous_treatment_details','medication_use','medication_name_dose','medication_duration','medication_prescriber','medication_adherence','medication_benefit','physical_health_history','physical_health_details','hospitalizations','hospitalization_reason','hospitalization_year'].includes(key)) return 4;
  if (['childhood_adolescence','abuse_experiences','abuse_details','repeated_patterns','adult_professional_life'].includes(key)) return 5;
  if (['mother_relationship','father_relationship','parental_presence','childhood_warmth','critical_figure','family_mental_health'].includes(key)) return 6;
  if (['loneliness','inner_void','abandonment_fear','inadequacy','frustration','loss_of_control','impulsivity','insight','support_person','immediate_support','future_projection','desired_change'].includes(key)) return 7;
  if (['daily_routine','sleep','appetite','physical_activity','physical_activity_frequency','leisure','substances','substances_frequency','substances_details'].includes(key)) return 8;
  if (['sexual_orientation','gender_identity','sexual_activity','sexual_frequency','sexual_satisfaction','sexual_satisfaction_details','sexual_difficulties','sexual_difficulties_details'].includes(key)) return 9;
  if (['religion_belief','spiritual_practice','spiritual_frequency','spiritual_support'].includes(key)) return 10;
  if (key === 'additional_observations') return 11;
  return -1;
}
function expectedKeys(index: number) {
  const keys = [
    ['full_name','date_of_birth','cpf','phone','email','profession','civil_status','postal_code','street','neighborhood','street_number','address_complement','city','state','household','education'],
    ['main_concern','onset','trigger_event','trigger_event_details','treatment_expectation','work_study_impact','social_impact','family_impact','life_impact_scale'],
    ['symptoms','other_symptoms','anxiety_scale','stress_scale','quality_of_life_scale','self_esteem_scale'],
    ['suicidal_thoughts_ever','death_thoughts_current','death_thoughts_frequency','suicide_plan','access_to_means','protective_factors','thoughts_intensity','self_harm_ever','self_harm_details'],
    ['previous_treatment','previous_treatment_details','medication_use','medication_name_dose','medication_duration','medication_prescriber','medication_adherence','medication_benefit','physical_health_history','physical_health_details','hospitalizations','hospitalization_reason','hospitalization_year'],
    ['childhood_adolescence','abuse_experiences','abuse_details','repeated_patterns','adult_professional_life'],
    ['mother_relationship','father_relationship','parental_presence','childhood_warmth','critical_figure','family_mental_health'],
    ['loneliness','inner_void','abandonment_fear','inadequacy','frustration','loss_of_control','impulsivity','insight','support_person','immediate_support','future_projection','desired_change'],
    ['daily_routine','sleep','appetite','physical_activity','physical_activity_frequency','leisure','substances','substances_frequency','substances_details'],
    ['sexual_orientation','gender_identity','sexual_activity','sexual_frequency','sexual_satisfaction','sexual_satisfaction_details','sexual_difficulties','sexual_difficulties_details'],
    ['religion_belief','spiritual_practice','spiritual_frequency','spiritual_support'],
    ['additional_observations'],
  ];
  return keys[index] ?? [];
}
