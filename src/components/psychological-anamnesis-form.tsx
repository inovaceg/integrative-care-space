import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { AlertTriangle, ArrowLeft, ArrowRight, Check, Clipboard, LoaderCircle, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { loadPsychologicalAnamnesis, savePsychologicalAnamnesis, startPsychologicalAnamnesis, submitPsychologicalAnamnesis, type PsychologicalAnswers } from '@/lib/admin/psychological-anamnesis';
import { abuseOptions, anamnesisFieldLabels, anamnesisSteps, consentSections, symptomOptions, yesNoOptions } from '@/lib/admin/psychological-anamnesis-content';

const consentVersion = 'Versão 1.0 — 11 de novembro de 2026';
const emptyAnswers: PsychologicalAnswers = {};

function ageOnDate(dateValue: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) return null;
  const date = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== dateValue || date > new Date()) return null;
  const today = new Date();
  let age = today.getFullYear() - date.getFullYear();
  if (today.getMonth() < date.getMonth() || (today.getMonth() === date.getMonth() && today.getDate() < date.getDate())) age -= 1;
  return age;
}

function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return <div className="grid gap-2"><Label className="text-sm font-medium leading-6 text-[#173f3a]">{label}</Label>{children}{hint && <p className="text-xs leading-5 text-[#708079]">{hint}</p>}</div>;
}

function ChoiceGroup({ value, onChange, options }: { value: string; onChange: (value: string) => void; options: readonly string[] }) {
  return <div className="flex flex-wrap gap-2">{options.map(option => <Button key={option} type="button" variant={value === option ? 'default' : 'outline'} aria-pressed={value === option} className={value === option ? 'border-[#17675b] bg-[#17675b] text-white hover:bg-[#12574d]' : 'border-[#c9d9d0] bg-white text-[#345c52] hover:bg-[#eff6f2]'} onClick={() => onChange(value === option ? '' : option)}>{option}</Button>)}</div>;
}

function TextAnswer({ value, onChange, rows = 3, placeholder }: { value: string; onChange: (value: string) => void; rows?: number; placeholder?: string }) {
  return <Textarea rows={rows} value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} className="resize-y border-[#d3dfd8] bg-white focus-visible:ring-[#2f8f82]" />;
}

function RangeAnswer({ value, onChange, label }: { value: string; onChange: (value: string) => void; label: string }) {
  return <Field label={label} hint="Informe um valor de 0 a 10 ou deixe em branco se preferir não responder."><div className="flex items-center gap-3"><Input aria-label={label} type="number" min="0" max="10" step="1" inputMode="numeric" value={value} onChange={event => { const next = event.target.value; if (next === '') onChange(''); else if (/^\d{1,2}$/.test(next) && Number(next) <= 10) onChange(String(Number(next))); }} placeholder="0–10" className="w-28 border-[#d3dfd8] bg-white" /></div></Field>;
}

function Summary({ answers, birthDate }: { answers: PsychologicalAnswers; birthDate: string }) {
  const entries = Object.entries(answers).filter(([, value]) => value !== '' && (!Array.isArray(value) || value.length));
  return <details open className="rounded-2xl border border-[#d6e2db] bg-[#fbfcfa] p-4">
    <summary className="cursor-pointer font-semibold text-[#24584e]">Revisar respostas preenchidas</summary>
    <dl className="mt-4 space-y-3">{entries.map(([key, value]) => <div key={key} className="border-b border-[#e8eee9] pb-3 last:border-0"><dt className="text-xs font-semibold text-[#67766f]">{anamnesisFieldLabels[key] ?? key}</dt><dd className="mt-1 whitespace-pre-wrap text-sm leading-6 text-[#243f38]">{Array.isArray(value) ? value.join(', ') : String(value)}</dd></div>)}<div className="border-b border-[#e8eee9] pb-3"><dt className="text-xs font-semibold text-[#67766f]">Data de nascimento</dt><dd className="mt-1 text-sm">{new Date(`${birthDate}T12:00:00`).toLocaleDateString('pt-BR')}</dd></div></dl>
  </details>;
}

export function PsychologicalAnamnesisForm() {
  const [birthDate, setBirthDate] = useState('');
  const [resumeInput, setResumeInput] = useState('');
  const [resumeKey, setResumeKey] = useState('');
  const [answers, setAnswers] = useState<PsychologicalAnswers>(emptyAnswers);
  const [step, setStep] = useState(0);
  const [reviewStage, setReviewStage] = useState(false);
  const [screen, setScreen] = useState<'gate' | 'form' | 'underage' | 'submitted'>('gate');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [signedName, setSignedName] = useState('');
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const saveQueue = useRef<Promise<void>>(Promise.resolve());
  const birthAge = useMemo(() => ageOnDate(birthDate), [birthDate]);
  const value = (key: string) => String(answers[key] ?? '');
  const set = (key: string, next: string | string[] | number) => setAnswers(current => ({ ...current, [key]: next }));
  const progress = screen === 'form' ? ((step + 1) / anamnesisSteps.length) * 100 : 0;

  useEffect(() => {
    if (!resumeKey || screen !== 'form') return;
    const timer = window.setTimeout(() => {
      setSaving(true);
      setSaveMessage('Salvando com segurança…');
      const pendingSave = saveQueue.current.catch(() => undefined).then(async () => { await savePsychologicalAnamnesis(resumeKey, answers); });
      saveQueue.current = pendingSave;
      void pendingSave.then(() => setSaveMessage('Rascunho salvo com segurança.')).catch(() => setSaveMessage('Não foi possível salvar agora. Tente novamente.')).finally(() => setSaving(false));
    }, 1200);
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
    try {
      const result = await startPsychologicalAnamnesis(birthDate);
      setResumeKey(result.resumeKey);
      setAnswers({ date_of_birth: birthDate });
      setScreen('form');
    } catch {
      setError('Não foi possível iniciar a ficha. Tente novamente.');
    } finally { setBusy(false); }
  }

  async function resume() {
    const key = resumeInput.trim();
    if (!key) { setError('Digite sua chave de retomada.'); return; }
    setBusy(true); setError('');
    try {
      const result = await loadPsychologicalAnamnesis(key);
      if (ageOnDate(result.birthDate) === null || ageOnDate(result.birthDate)! < 18) throw new Error('Ficha indisponível.');
      setBirthDate(result.birthDate);
      setAnswers({ ...result.responses, date_of_birth: result.birthDate });
      setResumeKey(key);
      setScreen('form');
    } catch {
      setError('Não foi possível recuperar este rascunho. Confira a chave e tente novamente.');
    } finally { setBusy(false); }
  }

  async function copyResumeKey() {
    await navigator.clipboard.writeText(resumeKey);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  function toggleArray(key: string, item: string) {
    const current = Array.isArray(answers[key]) ? answers[key] as string[] : [];
    set(key, current.includes(item) ? current.filter(value => value !== item) : [...current, item]);
  }

  const currentRisk = value('death_thoughts_current') === 'Sim';
  const riskFollowup = currentRisk || value('suicidal_thoughts_ever') === 'Sim';
  const showAccessQuestion = value('suicide_plan') === 'Sim' || currentRisk;

  function goNext() {
    setError('');
    if (step < anamnesisSteps.length - 1) { setReviewStage(false); setStep(current => current + 1); formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  }

  function reviewAnswers() {
    if (!value('full_name').trim()) { setError('Informe seu nome completo na etapa Identificação.'); setStep(0); return; }
    if (!accepted) { setError('Confirme que leu, compreendeu e aceita o Termo de Consentimento.'); return; }
    const fullName = value('full_name').trim().replace(/\s+/g, ' ');
    if (!signedName.trim() || signedName.trim().replace(/\s+/g, ' ') !== fullName) { setError('Digite o mesmo nome completo informado na identificação para assinar.'); return; }
    setError('');
    setReviewStage(true);
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!value('full_name').trim()) { setError('Informe seu nome completo na etapa Identificação.'); setStep(0); return; }
    if (!accepted) { setError('Confirme que leu, compreendeu e aceita o Termo de Consentimento.'); return; }
    const fullName = value('full_name').trim().replace(/\s+/g, ' ');
    if (!signedName.trim() || signedName.trim().replace(/\s+/g, ' ') !== fullName) { setError('Digite o mesmo nome completo informado na identificação para assinar.'); return; }
    setBusy(true); setError('');
    try {
      const finalAnswers = { ...answers, date_of_birth: birthDate };
      await saveQueue.current.catch(() => undefined);
      await savePsychologicalAnamnesis(resumeKey, finalAnswers);
      await submitPsychologicalAnamnesis(resumeKey, finalAnswers, signedName.trim().replace(/\s+/g, ' '));
      setScreen('submitted');
    } catch {
      setError('Não foi possível enviar a ficha agora. Suas respostas permanecem salvas; tente novamente.');
    } finally { setBusy(false); }
  }

  if (screen === 'submitted') return <main className="grid min-h-screen place-items-center bg-[#f5f7f2] px-5 py-12"><section className="w-full max-w-lg rounded-3xl border border-[#d7e4db] bg-white p-8 text-center shadow-xl sm:p-10"><div className="mx-auto grid size-14 place-items-center rounded-full bg-[#e8f3ec] text-[#17675b]"><ShieldCheck className="size-7" /></div><h1 className="mt-5 font-display text-2xl font-semibold text-[#173f3a]">Ficha recebida</h1><p className="mt-3 text-sm leading-7 text-[#65756e]">Sua ficha foi enviada com segurança. Ela será analisada pelo profissional antes do atendimento. O preenchimento não substitui uma avaliação clínica completa.</p></section></main>;

  return <main className="min-h-screen bg-[radial-gradient(ellipse_at_top,_rgba(207,230,214,.62),_transparent_38%),#f5f7f2] px-4 py-7 sm:px-6 sm:py-10">
    <div className="mx-auto max-w-4xl">
      <header className="mb-7 flex items-center justify-between gap-4 rounded-2xl border border-white/80 bg-white/80 p-4 shadow-sm backdrop-blur sm:p-5"><div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#a0814d]">Anamnese Psicológica Digital</p><p className="mt-1 font-display text-lg font-semibold text-[#173f3a] sm:text-xl">Dr. Frederick Parreira</p><p className="mt-1 text-xs text-[#687873]">Psicólogo — CRP 04/86194</p></div><span className="hidden size-12 place-items-center rounded-full bg-[#075e54] font-display text-xl text-white sm:grid">Ψ</span></header>

      {screen === 'underage' ? <section className="mx-auto max-w-xl rounded-3xl border border-[#e4d8bd] bg-white p-7 shadow-lg sm:p-10"><div className="grid size-12 place-items-center rounded-full bg-[#fbf4e6] text-[#9b7941]"><AlertTriangle className="size-6" /></div><h1 className="mt-5 font-display text-2xl font-semibold text-[#173f3a]">Formulário específico necessário</h1><p className="mt-3 text-sm leading-7 text-[#65756e]">O formulário adulto não pode ser preenchido por menores de 18 anos. O atendimento de crianças e adolescentes exige um formulário específico e orientação da clínica. Entre em contato com a equipe para receber as instruções adequadas.</p><Button type="button" variant="outline" className="mt-6 rounded-full" onClick={() => { setScreen('gate'); setError(''); }}>Voltar</Button></section> : screen === 'gate' ? <section className="mx-auto max-w-xl rounded-3xl border border-white bg-white p-6 shadow-lg sm:p-9"><div className="mb-6"><p className="text-xs font-bold uppercase tracking-[.16em] text-[#347d68]">Antes de começar</p><h1 className="mt-2 font-display text-2xl font-semibold text-[#173f3a]">Confirme sua idade</h1><p className="mt-3 text-sm leading-6 text-[#65756e]">Esta versão da anamnese é exclusiva para pessoas com 18 anos ou mais. A data de nascimento será usada para validar o acesso.</p></div><Field label="Data de nascimento"><Input type="date" value={birthDate} max={new Date().toISOString().slice(0, 10)} onChange={event => { setBirthDate(event.target.value); setError(''); }} className="border-[#d3dfd8]" /></Field>{error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}<Button type="button" disabled={busy || !birthDate} onClick={() => void start()} className="mt-6 w-full rounded-full bg-[#17675b] hover:bg-[#12574d]">{busy ? <LoaderCircle className="mr-2 size-4 animate-spin" /> : null}Continuar</Button><div className="my-6 flex items-center gap-3 text-xs text-[#82918a]"><span className="h-px flex-1 bg-[#e3ebe5]" />Já começou?<span className="h-px flex-1 bg-[#e3ebe5]" /></div><Field label="Chave de retomada"><Input value={resumeInput} onChange={event => setResumeInput(event.target.value)} autoComplete="off" placeholder="Cole sua chave salva" className="border-[#d3dfd8]" /></Field><Button type="button" variant="outline" disabled={busy || !resumeInput.trim()} onClick={() => void resume()} className="mt-3 w-full rounded-full">Retomar preenchimento</Button></section> : <>
        <section className="mb-5 rounded-2xl border border-[#d7e4db] bg-white/90 p-4 shadow-sm sm:p-5"><div className="mb-2 flex items-center justify-between gap-4"><span className="text-xs font-semibold text-[#315e52]">Etapa {step + 1} de {anamnesisSteps.length}</span><span className="text-right text-xs font-medium text-[#73837b]">{anamnesisSteps[step]}</span></div><Progress value={progress} className="h-2 bg-[#e8efea] [&>div]:bg-[#26786e]" /></section>
        <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-[#eadfc9] bg-[#fffdf8] p-4 text-sm text-[#675940] sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="font-semibold">Chave para continuar depois</p><p className="mt-1 text-xs leading-5">Guarde esta chave em local seguro. Ela permite retomar seu rascunho. As respostas não ficam salvas no navegador.</p><code className="mt-2 block break-all rounded bg-white p-2 text-[11px] text-[#37554a]">{resumeKey}</code></div><Button type="button" variant="outline" onClick={() => void copyResumeKey()} className="shrink-0 rounded-full border-[#d8c8a6] text-[#735c34]"><Clipboard className="mr-2 size-4" />{copied ? 'Copiada' : 'Copiar chave'}</Button></div>

        <form ref={formRef} onSubmit={submit} className="space-y-5">
          <section className="rounded-3xl border border-white bg-white p-5 shadow-lg sm:p-8">
            <p className="text-xs font-bold uppercase tracking-[.18em] text-[#a0814d]">Etapa {step + 1}</p><h1 className="mt-2 font-display text-2xl font-semibold text-[#173f3a] sm:text-3xl">{anamnesisSteps[step]}</h1>
            <p className="mt-2 text-sm leading-6 text-[#718078]">Responda no seu ritmo. Você pode deixar perguntas sem resposta e retomar depois usando sua chave.</p>
            <div className="mt-7 space-y-7">
              {step === 0 && <>
                <Field label="Nome completo"><Input maxLength={200} autoComplete="name" value={value('full_name')} onChange={event => set('full_name', event.target.value)} className="border-[#d3dfd8]" /></Field>
                <Field label="Data de nascimento"><Input type="date" value={birthDate} readOnly className="border-[#d3dfd8] bg-[#f4f7f3]" /></Field>
                <div className="grid gap-6 sm:grid-cols-2"><Field label="CPF"><Input autoComplete="off" inputMode="numeric" value={value('cpf')} onChange={event => set('cpf', event.target.value)} className="border-[#d3dfd8]" /></Field><Field label="Telefone/WhatsApp"><Input type="tel" autoComplete="tel" value={value('phone')} onChange={event => set('phone', event.target.value)} className="border-[#d3dfd8]" /></Field><Field label="E-mail"><Input type="email" autoComplete="email" value={value('email')} onChange={event => set('email', event.target.value)} className="border-[#d3dfd8]" /></Field><Field label="Profissão"><Input value={value('profession')} onChange={event => set('profession', event.target.value)} className="border-[#d3dfd8]" /></Field><Field label="Estado civil"><Input value={value('civil_status')} onChange={event => set('civil_status', event.target.value)} className="border-[#d3dfd8]" /></Field></div>
                <div><h2 className="font-semibold text-[#24584e]">Endereço</h2><div className="mt-3 grid gap-4 sm:grid-cols-2"><Field label="CEP"><Input autoComplete="postal-code" value={value('postal_code')} onChange={event => set('postal_code', event.target.value)} className="border-[#d3dfd8]" /></Field><Field label="Logradouro"><Input autoComplete="street-address" value={value('street')} onChange={event => set('street', event.target.value)} className="border-[#d3dfd8]" /></Field><Field label="Bairro"><Input value={value('neighborhood')} onChange={event => set('neighborhood', event.target.value)} className="border-[#d3dfd8]" /></Field><Field label="Número"><Input value={value('street_number')} onChange={event => set('street_number', event.target.value)} className="border-[#d3dfd8]" /></Field><Field label="Complemento"><Input value={value('address_complement')} onChange={event => set('address_complement', event.target.value)} className="border-[#d3dfd8]" /></Field><Field label="Cidade"><Input autoComplete="address-level2" value={value('city')} onChange={event => set('city', event.target.value)} className="border-[#d3dfd8]" /></Field><Field label="Estado"><Input autoComplete="address-level1" value={value('state')} onChange={event => set('state', event.target.value)} className="border-[#d3dfd8]" /></Field></div></div>
                <Field label="Com quem mora?"><TextAnswer value={value('household')} onChange={next => set('household', next)} /></Field>
                <Field label="Escolaridade"><Input value={value('education')} onChange={event => set('education', event.target.value)} className="border-[#d3dfd8]" /></Field>
              </>}
              {step === 1 && <>
                {(['main_concern', 'onset', 'trigger_event', 'treatment_expectation', 'work_study_impact', 'social_impact', 'family_impact'] as const).map((key, index) => <Field key={key} label={anamnesisFieldLabels[key]}>{key === 'onset' ? <Input value={value(key)} onChange={event => set(key, event.target.value)} className="border-[#d3dfd8]" /> : <TextAnswer value={value(key)} onChange={next => set(key, next)} rows={index === 0 ? 5 : 3} />}</Field>)}
                <RangeAnswer label={anamnesisFieldLabels.life_impact_scale} value={value('life_impact_scale')} onChange={next => set('life_impact_scale', next)} />
              </>}
              {step === 2 && <>
                <Field label={anamnesisFieldLabels.symptoms}><div className="grid gap-2 sm:grid-cols-2">{symptomOptions.map(item => <label key={item} className="flex min-h-12 items-center gap-3 rounded-xl border border-[#e1e9e3] px-3 py-2 text-sm text-[#38594e]"><Checkbox checked={(Array.isArray(answers.symptoms) ? answers.symptoms : []).includes(item)} onCheckedChange={() => toggleArray('symptoms', item)} className="border-[#99b5a5] data-[state=checked]:bg-[#26786e]" />{item}</label>)}</div></Field>
                <div><p className="mb-2 text-sm font-semibold text-[#24584e]">Complementos:</p><Field label={anamnesisFieldLabels.other_symptoms}><TextAnswer value={value('other_symptoms')} onChange={next => set('other_symptoms', next)} rows={4} /></Field></div>
                <div className="space-y-5"><p className="text-sm font-semibold text-[#24584e]">Considerando a última semana, avalie de 0 a 10:</p>
                <RangeAnswer label={anamnesisFieldLabels.anxiety_scale} value={value('anxiety_scale')} onChange={next => set('anxiety_scale', next)} />
                <RangeAnswer label={anamnesisFieldLabels.stress_scale} value={value('stress_scale')} onChange={next => set('stress_scale', next)} />
                <RangeAnswer label={anamnesisFieldLabels.quality_of_life_scale} value={value('quality_of_life_scale')} onChange={next => set('quality_of_life_scale', next)} />
                <RangeAnswer label={anamnesisFieldLabels.self_esteem_scale} value={value('self_esteem_scale')} onChange={next => set('self_esteem_scale', next)} />
                </div>
              </>}
              {step === 3 && <>
                <div className="rounded-2xl border border-[#e6d9c0] bg-[#fffaf0] p-4 text-sm leading-6 text-[#634f2d]"><AlertTriangle className="mb-2 size-5" /><p>Este formulário não é monitorado em tempo real. Se você estiver em perigo imediato, procure uma UPA ou pronto-socorro, ligue para o SAMU pelo 192, ligue gratuitamente para o CVV pelo 188 ou peça ajuda agora a alguém de confiança.</p></div>
                <Field label={anamnesisFieldLabels.suicidal_thoughts_ever}><ChoiceGroup value={value('suicidal_thoughts_ever')} onChange={next => set('suicidal_thoughts_ever', next)} options={yesNoOptions} /></Field>
                <Field label={anamnesisFieldLabels.death_thoughts_current}><ChoiceGroup value={value('death_thoughts_current')} onChange={next => set('death_thoughts_current', next)} options={yesNoOptions} /></Field>
                {currentRisk && <Field label={anamnesisFieldLabels.death_thoughts_frequency}><TextAnswer value={value('death_thoughts_frequency')} onChange={next => set('death_thoughts_frequency', next)} /></Field>}
                {riskFollowup && <Field label={anamnesisFieldLabels.suicide_plan}><ChoiceGroup value={value('suicide_plan')} onChange={next => set('suicide_plan', next)} options={yesNoOptions} /></Field>}
                {showAccessQuestion && <Field label={anamnesisFieldLabels.access_to_means}><ChoiceGroup value={value('access_to_means')} onChange={next => set('access_to_means', next)} options={yesNoOptions} /></Field>}
                {riskFollowup && <Field label={anamnesisFieldLabels.protective_factors}><TextAnswer value={value('protective_factors')} onChange={next => set('protective_factors', next)} /></Field>}
                {riskFollowup && <RangeAnswer label={anamnesisFieldLabels.thoughts_intensity} value={value('thoughts_intensity')} onChange={next => set('thoughts_intensity', next)} />}
                <Field label={anamnesisFieldLabels.self_harm_ever}><ChoiceGroup value={value('self_harm_ever')} onChange={next => set('self_harm_ever', next)} options={yesNoOptions} /></Field>
                {value('self_harm_ever') === 'Sim' && <Field label={anamnesisFieldLabels.self_harm_details}><TextAnswer value={value('self_harm_details')} onChange={next => set('self_harm_details', next)} rows={4} /></Field>}
                {currentRisk && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-900"><strong>Se você está em perigo agora</strong>, não espere uma resposta por este formulário. Ligue 192, procure uma UPA/pronto-socorro, ligue 188 (CVV) ou chame imediatamente uma pessoa de confiança.</div>}
              </>}
              {step === 4 && <>
                <Field label={anamnesisFieldLabels.previous_treatment}><ChoiceGroup value={value('previous_treatment')} onChange={next => set('previous_treatment', next)} options={yesNoOptions} /></Field>
                {value('previous_treatment') === 'Não' ? <Field label={anamnesisFieldLabels.previous_treatment_details} hint="Se nunca fez, escreva “NUNCA FIZ”."><Input value={value('previous_treatment_details')} onChange={event => set('previous_treatment_details', event.target.value)} className="border-[#d3dfd8]" /></Field> : value('previous_treatment') === 'Sim' && <Field label="Conte sobre terapias ou medicações psiquiátricas anteriores."><TextAnswer value={value('previous_treatment_details')} onChange={next => set('previous_treatment_details', next)} /></Field>}
                <Field label={anamnesisFieldLabels.medication_use}><ChoiceGroup value={value('medication_use')} onChange={next => set('medication_use', next)} options={yesNoOptions} /></Field>
                {value('medication_use') === 'Sim' && <div className="grid gap-5 rounded-2xl bg-[#f5f8f4] p-4 sm:grid-cols-2"><Field label={anamnesisFieldLabels.medication_name_dose}><TextAnswer value={value('medication_name_dose')} onChange={next => set('medication_name_dose', next)} /></Field><Field label={anamnesisFieldLabels.medication_duration}><Input value={value('medication_duration')} onChange={event => set('medication_duration', event.target.value)} className="border-[#d3dfd8]" /></Field><Field label={anamnesisFieldLabels.medication_prescriber}><Input value={value('medication_prescriber')} onChange={event => set('medication_prescriber', event.target.value)} className="border-[#d3dfd8]" /></Field><Field label={anamnesisFieldLabels.medication_adherence}><ChoiceGroup value={value('medication_adherence')} onChange={next => set('medication_adherence', next)} options={yesNoOptions} /></Field><Field label={anamnesisFieldLabels.medication_benefit}><ChoiceGroup value={value('medication_benefit')} onChange={next => set('medication_benefit', next)} options={yesNoOptions} /></Field></div>}
                <Field label={anamnesisFieldLabels.physical_health_history}><TextAnswer value={value('physical_health_history')} onChange={next => set('physical_health_history', next)} rows={4} /></Field>
                <Field label={anamnesisFieldLabels.hospitalizations}><ChoiceGroup value={value('hospitalizations')} onChange={next => set('hospitalizations', next)} options={yesNoOptions} /></Field>
                {value('hospitalizations') === 'Sim' && <Field label={anamnesisFieldLabels.hospitalization_details}><TextAnswer value={value('hospitalization_details')} onChange={next => set('hospitalization_details', next)} /></Field>}
              </>}
              {step === 5 && <>
                <Field label={anamnesisFieldLabels.childhood_adolescence}><TextAnswer value={value('childhood_adolescence')} onChange={next => set('childhood_adolescence', next)} rows={5} /></Field>
                <Field label={anamnesisFieldLabels.abuse_experiences}><div className="grid gap-2 sm:grid-cols-2">{abuseOptions.map(item => <label key={item} className="flex min-h-12 items-center gap-3 rounded-xl border border-[#e1e9e3] px-3 py-2 text-sm"><Checkbox checked={(Array.isArray(answers.abuse_experiences) ? answers.abuse_experiences : []).includes(item)} onCheckedChange={() => toggleArray('abuse_experiences', item)} className="border-[#99b5a5] data-[state=checked]:bg-[#26786e]" />{item}</label>)}</div></Field>
                {Array.isArray(answers.abuse_experiences) && answers.abuse_experiences.length > 0 && <Field label={anamnesisFieldLabels.abuse_details}><TextAnswer value={value('abuse_details')} onChange={next => set('abuse_details', next)} rows={4} /></Field>}
                <Field label={anamnesisFieldLabels.repeated_patterns}><TextAnswer value={value('repeated_patterns')} onChange={next => set('repeated_patterns', next)} /></Field>
                <Field label={anamnesisFieldLabels.adult_professional_life}><TextAnswer value={value('adult_professional_life')} onChange={next => set('adult_professional_life', next)} rows={4} /></Field>
              </>}
              {step === 6 && <>
                {(['mother_relationship', 'father_relationship', 'parental_presence', 'childhood_warmth', 'critical_figure', 'family_mental_health'] as const).map(key => <Field key={key} label={anamnesisFieldLabels[key]}><TextAnswer value={value(key)} onChange={next => set(key, next)} rows={key === 'family_mental_health' ? 4 : 3} /></Field>)}
              </>}
              {step === 7 && <>
                {(['loneliness', 'inner_void', 'abandonment_fear', 'inadequacy', 'frustration', 'loss_of_control', 'impulsivity'] as const).map(key => <Field key={key} label={anamnesisFieldLabels[key]}><TextAnswer value={value(key)} onChange={next => set(key, next)} rows={2} /></Field>)}
                <Field label={anamnesisFieldLabels.insight}><ChoiceGroup value={value('insight')} onChange={next => set('insight', next)} options={['Sim', 'Parcialmente', 'Não']} /></Field>
                {(['support_person', 'immediate_support', 'future_projection', 'desired_change'] as const).map(key => <Field key={key} label={anamnesisFieldLabels[key]}><TextAnswer value={value(key)} onChange={next => set(key, next)} rows={key === 'future_projection' || key === 'desired_change' ? 4 : 3} /></Field>)}
              </>}
              {step === 8 && <>
                {(['daily_routine', 'sleep', 'appetite'] as const).map(key => <Field key={key} label={anamnesisFieldLabels[key]}><TextAnswer value={value(key)} onChange={next => set(key, next)} rows={4} /></Field>)}
                <Field label={anamnesisFieldLabels.physical_activity}><TextAnswer value={value('physical_activity')} onChange={next => set('physical_activity', next)} /></Field>
                <Field label={anamnesisFieldLabels.leisure}><TextAnswer value={value('leisure')} onChange={next => set('leisure', next)} /></Field>
                <Field label={anamnesisFieldLabels.substances}><TextAnswer value={value('substances')} onChange={next => set('substances', next)} /></Field>
              </>}
              {step === 9 && <>
                {(['sexual_orientation', 'gender_identity', 'sexual_activity', 'sexual_satisfaction', 'sexual_difficulties'] as const).map(key => <Field key={key} label={anamnesisFieldLabels[key]}><TextAnswer value={value(key)} onChange={next => set(key, next)} rows={key === 'sexual_difficulties' ? 4 : 2} /></Field>)}
              </>}
              {step === 10 && <>
                {(['religion_belief', 'spiritual_practice', 'spiritual_frequency', 'spiritual_support'] as const).map(key => <Field key={key} label={anamnesisFieldLabels[key]}><TextAnswer value={value(key)} onChange={next => set(key, next)} rows={key === 'spiritual_support' ? 4 : 2} /></Field>)}
              </>}
              {step === 11 && <Field label={anamnesisFieldLabels.additional_observations}><TextAnswer value={value('additional_observations')} onChange={next => set('additional_observations', next)} rows={7} /></Field>}
              {step === 12 && !reviewStage && <>
                <div className="rounded-2xl border border-[#d9e5dc] bg-[#f8faf7] p-4 sm:p-5"><div className="mb-4 flex items-start gap-2 text-[#17675b]"><ShieldCheck className="mt-1 size-5 shrink-0" /><div><h2 className="font-semibold">TERMO DE CONSENTIMENTO E CIÊNCIA SOBRE O TRATAMENTO DE DADOS PESSOAIS</h2><p className="mt-1 text-sm">Dr. Frederick Parreira — Psicólogo</p><p className="text-sm">CRP 04/86194</p></div></div><p className="mb-4 text-xs font-semibold text-[#7d6b48]">{consentVersion}</p><div className="max-h-[30rem] space-y-5 overflow-y-auto rounded-xl border border-[#e2e9e3] bg-white p-4 text-sm leading-7 text-[#42554d] sm:p-6">{consentSections.map(([heading, paragraphs]) => <section key={heading}><h3 className="mb-2 font-bold text-[#1d4f44]">{heading}</h3>{paragraphs.map((paragraph, index) => <p key={index} className="mt-2">{paragraph}</p>)}</section>)}<section><h3 className="mb-2 font-bold text-[#1d4f44]">IDENTIFICAÇÃO DO PACIENTE</h3><p>Nome completo: __________________________________</p><p>Data: ____ / ____ / ______</p><p>Assinatura eletrônica (nome completo): ______________________________</p></section><hr /><p><strong>Dr. Frederick Parreira</strong><br />Psicólogo — CRP 04/86194<br />Documento elaborado para utilização no processo de anamnese psicológica digital.</p></div><p className="mt-3 text-xs leading-5 text-[#718078]">A assinatura eletrônica registrada nesta página não substitui outros requisitos legais de consentimento e informação.</p></div>
                <Field label="Confirma que leu, compreendeu e aceita o Termo de Consentimento para Tratamento de Dados Pessoais?"><label className="flex items-start gap-3 rounded-xl border border-[#d7e4db] bg-white p-4 text-sm leading-6 text-[#34574c]"><Checkbox checked={accepted} onCheckedChange={checked => setAccepted(checked === true)} className="mt-1 border-[#99b5a5] data-[state=checked]:bg-[#26786e]" />Li, compreendi e aceito o Termo de Consentimento.</label></Field>
                <Field label="Digite seu nome completo como assinatura eletrônica"><Input autoComplete="name" value={signedName} onChange={event => setSignedName(event.target.value)} className="border-[#d3dfd8]" /></Field>
                <p className="text-xs leading-5 text-[#708079]">O registro guardará a data e o horário de envio e a versão do termo aceito. A ficha não substitui uma avaliação clínica completa.</p>
              </>}
              {step === 12 && reviewStage && <><p className="rounded-xl border border-[#d9e5dc] bg-[#f8faf7] p-4 text-sm leading-6 text-[#315e52]">Confira suas respostas abaixo. Se quiser alterar algo, volte à etapa correspondente; suas respostas preenchidas serão preservadas.</p><Summary answers={answers} birthDate={birthDate} /><div className="rounded-xl border border-[#d9e5dc] bg-white p-4 text-sm leading-6 text-[#42554d]"><p><strong>Termo aceito:</strong> {accepted ? 'Sim' : 'Não'}</p><p><strong>Assinatura eletrônica:</strong> {signedName}</p><p><strong>Versão:</strong> {consentVersion}</p></div></>}
            </div>
          </section>

          {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
          <div className="flex flex-col-reverse justify-between gap-3 sm:flex-row sm:items-center"><p role="status" className="text-xs text-[#73837b]">{saving ? 'Salvando…' : saveMessage}</p><div className="flex flex-wrap justify-between gap-2"><Button type="button" variant="outline" disabled={step === 0 || busy} onClick={() => { setError(''); if (step === 12 && reviewStage) setReviewStage(false); else { setReviewStage(false); setStep(current => current - 1); } formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }} className="rounded-full border-[#c9d9d0] text-[#315e52]"><ArrowLeft className="mr-2 size-4" />Anterior</Button>{step < anamnesisSteps.length - 1 ? <Button type="button" onClick={goNext} disabled={busy} className="rounded-full bg-[#17675b] px-6 hover:bg-[#12574d]">Próximo<ArrowRight className="ml-2 size-4" /></Button> : reviewStage ? <Button type="submit" disabled={busy} className="rounded-full bg-[#17675b] px-6 hover:bg-[#12574d]">{busy ? <LoaderCircle className="mr-2 size-4 animate-spin" /> : <Check className="mr-2 size-4" />}Confirmar e enviar</Button> : <Button type="button" onClick={reviewAnswers} disabled={busy} className="rounded-full bg-[#17675b] px-6 hover:bg-[#12574d]">Revisar respostas<ArrowRight className="ml-2 size-4" /></Button>}</div></div>
        </form>
      </>}
      <footer className="mt-8 text-center text-[11px] leading-5 text-[#84918b]">As respostas são confidenciais e acessíveis apenas à equipe profissional autorizada. Não inclua detalhes de emergência esperando uma resposta imediata.</footer>
    </div>
  </main>;
}
