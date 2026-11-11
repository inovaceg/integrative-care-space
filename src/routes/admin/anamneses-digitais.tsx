import { useEffect, useMemo, useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { AlertTriangle, ChevronDown, ChevronUp, LoaderCircle, Pencil, Printer, RefreshCw, Save, Search, ShieldCheck, Trash2, X } from 'lucide-react';
import { useAuth } from '@/components/auth/auth-provider';
import { AdminLayout, PageIntro } from '@/components/admin/admin-ui';
import { AnamnesisAnswerEditor } from '@/components/admin/anamnesis-answer-editor';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { deletePsychologicalAnamnesis, getPsychologicalAnamnesis, listPsychologicalAnamneses, updatePsychologicalAnamnesis, type AnamnesisSubmission, type PsychologicalAnswers } from '@/lib/admin/psychological-anamnesis';
import { anamnesisFieldLabels, anamnesisSteps } from '@/lib/admin/psychological-anamnesis-content';

export const Route = createFileRoute('/admin/anamneses-digitais')({
  head: () => ({ meta: [{ title: 'Anamneses psicológicas digitais | Área Administrativa' }, { name: 'robots', content: 'noindex, nofollow' }] }),
  component: DigitalAnamnesesPage,
});

function display(value: unknown) {
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
  return typeof value === 'string' || typeof value === 'number' ? String(value) : '';
}

const safetyReportKeys = [
  'suicidal_thoughts_ever',
  'death_thoughts_current',
  'death_thoughts_frequency',
  'suicide_plan',
  'access_to_means',
  'protective_factors',
  'thoughts_intensity',
  'self_harm_ever',
  'self_harm_details',
];

function safetyReportEntries(responses: AnamnesisSubmission['responses']) {
  return safetyReportKeys.flatMap(key => {
    const answer = responses?.[key];
    if (answer === undefined || answer === '' || (Array.isArray(answer) && answer.length === 0)) return [];
    return [[key, answer] as const];
  });
}

const preliminaryReportGroups = [
  { title: 'Queixa e impacto', keys: ['main_concern', 'onset', 'trigger_event', 'treatment_expectation', 'work_study_impact', 'social_impact', 'family_impact', 'life_impact_scale'] },
  { title: 'Sintomas e autoavaliações', keys: ['symptoms', 'other_symptoms', 'anxiety_scale', 'stress_scale', 'quality_of_life_scale', 'self_esteem_scale'] },
  { title: 'Segurança', keys: safetyReportKeys },
  { title: 'Saúde e tratamentos', keys: ['previous_treatment', 'previous_treatment_details', 'medication_use', 'medication_name_dose', 'medication_duration', 'medication_prescriber', 'medication_adherence', 'medication_benefit', 'physical_health_history', 'hospitalizations', 'hospitalization_details'] },
  { title: 'História pessoal e familiar', keys: ['childhood_adolescence', 'abuse_experiences', 'abuse_details', 'repeated_patterns', 'adult_professional_life', 'mother_relationship', 'father_relationship', 'parental_presence', 'childhood_warmth', 'critical_figure', 'family_mental_health'] },
  { title: 'Mundo interno, apoio e mudança', keys: ['loneliness', 'inner_void', 'abandonment_fear', 'inadequacy', 'frustration', 'loss_of_control', 'impulsivity', 'insight', 'support_person', 'immediate_support', 'future_projection', 'desired_change'] },
  { title: 'Hábitos de vida', keys: ['daily_routine', 'sleep', 'appetite', 'physical_activity', 'leisure', 'substances'] },
  { title: 'Sexualidade e espiritualidade', keys: ['sexual_orientation', 'gender_identity', 'sexual_activity', 'sexual_satisfaction', 'sexual_difficulties', 'religion_belief', 'spiritual_practice', 'spiritual_frequency', 'spiritual_support'] },
  { title: 'Observações adicionais', keys: ['additional_observations'] },
] as const;

function reportEntries(responses: AnamnesisSubmission['responses'], keys: readonly string[]) {
  return keys.flatMap(key => {
    const answer = responses?.[key];
    if (answer === undefined || answer === '' || (Array.isArray(answer) && answer.length === 0)) return [];
    return [[key, answer] as const];
  });
}

function DigitalAnamnesesPage() {
  const { isAdmin, isLoading: authLoading } = useAuth();
  const [items, setItems] = useState<AnamnesisSubmission[]>([]);
  const [selected, setSelected] = useState<AnamnesisSubmission | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState('');
  const [nameFilter, setNameFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [editing, setEditing] = useState(false);
  const [editAnswers, setEditAnswers] = useState<PsychologicalAnswers>({});
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    setLoading(true); setError('');
    try {
      const result = await listPsychologicalAnamneses();
      setItems(result.submissions);
    } catch {
      setError('Não foi possível carregar as fichas autorizadas. Verifique sua sessão e tente novamente.');
    } finally { setLoading(false); }
  }

  useEffect(() => { if (!authLoading && isAdmin) void load(); }, [authLoading, isAdmin]);

  async function open(id: string) {
    if (selected?.id === id) { setSelected(null); setEditing(false); return; }
    setEditing(false);
    setDetailLoading(true); setError('');
    try {
      const result = await getPsychologicalAnamnesis(id);
      setSelected(result.submission);
    } catch {
      setError('Não foi possível abrir esta ficha.');
    } finally { setDetailLoading(false); }
  }

  function startEditing() {
    if (!selected) return;
    setEditAnswers({ ...(selected.responses ?? {}) });
    setEditing(true);
  }

  async function saveEdits() {
    if (!selected) return;
    setSavingEdit(true); setError('');
    try {
      const result = await updatePsychologicalAnamnesis(selected.id, editAnswers);
      setSelected(result.submission);
      setItems(current => current.map(item => item.id === result.submission.id ? { ...item, patient_name: result.submission.patient_name, contact_email: result.submission.contact_email, contact_phone: result.submission.contact_phone, risk_review_required: result.submission.risk_review_required } : item));
      setEditing(false);
    } catch { setError('Não foi possível salvar as alterações desta ficha.'); } finally { setSavingEdit(false); }
  }

  async function deleteSelected() {
    if (!selected || !window.confirm(`Excluir definitivamente a anamnese de ${selected.patient_name || 'esta pessoa'}? Esta ação não pode ser desfeita.`)) return;
    setDeleting(true); setError('');
    try {
      await deletePsychologicalAnamnesis(selected.id);
      setItems(current => current.filter(item => item.id !== selected.id));
      setSelected(null); setEditing(false);
    } catch { setError('Não foi possível excluir esta ficha.'); } finally { setDeleting(false); }
  }

  const reportGroups = selected ? preliminaryReportGroups.map(group => ({ ...group, entries: reportEntries(selected.responses, group.keys) })).filter(group => group.entries.length > 0) : [];
  const visibleItems = useMemo(() => items.filter(item => {
    const matchesName = (item.patient_name ?? '').toLocaleLowerCase('pt-BR').includes(nameFilter.trim().toLocaleLowerCase('pt-BR'));
    const matchesDate = !dateFilter || item.submitted_at?.slice(0, 10) === dateFilter;
    return matchesName && matchesDate;
  }), [items, nameFilter, dateFilter]);

  return <AdminLayout>
    <PageIntro eyebrow="Prontuários protegidos" title="Anamneses psicológicas digitais" description="Fichas enviadas pelo formulário digital, acessíveis somente a profissionais autenticados e autorizados." action={<div className="flex gap-2"><Button variant="outline" onClick={() => void load()} disabled={loading} className="gap-2"><RefreshCw className="size-4" />Atualizar</Button>{selected && <Button variant="outline" onClick={() => window.print()} className="gap-2"><Printer className="size-4" />Imprimir / PDF</Button>}</div>} />
    <div className="mt-6 space-y-4 print:mt-0 print:space-y-0">
      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 print:hidden">{error}</p>}
      {!loading && items.length > 0 && <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-[1fr_220px] print:hidden"><label className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><Input aria-label="Buscar pelo nome" placeholder="Buscar pelo nome" value={nameFilter} onChange={event => setNameFilter(event.target.value)} className="pl-9" /></label><Input aria-label="Filtrar por data de envio" type="date" value={dateFilter} onChange={event => setDateFilter(event.target.value)} /></div>}
      {loading || authLoading ? <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-12 text-sm text-slate-500"><LoaderCircle className="mr-2 size-4 animate-spin" />Carregando fichas...</div> : items.length === 0 ? <Card className="border-slate-200"><CardContent className="p-10 text-center"><ShieldCheck className="mx-auto size-8 text-[#26786e]" /><h2 className="mt-3 font-medium text-slate-800">Nenhuma ficha enviada</h2><p className="mt-1 text-sm text-slate-500">As novas respostas aparecerão aqui após o envio.</p></CardContent></Card> : visibleItems.length === 0 ? <Card className="border-slate-200 print:hidden"><CardContent className="p-8 text-center text-sm text-slate-500">Nenhuma ficha corresponde aos filtros.</CardContent></Card> : visibleItems.map(item => <Card key={item.id} className="overflow-hidden border-slate-200 shadow-sm print:border-0 print:shadow-none"><CardContent className="p-0"><button type="button" onClick={() => void open(item.id)} className="flex w-full flex-col items-start justify-between gap-3 p-4 text-left hover:bg-slate-50 sm:flex-row sm:items-center sm:p-5 print:hidden"><span className="min-w-0"><span className="block truncate font-semibold text-slate-800">{item.patient_name || 'Nome não informado'}</span><span className="mt-1 block text-sm text-slate-500">Enviada em {item.submitted_at ? new Date(item.submitted_at).toLocaleString('pt-BR') : '—'}</span></span><span className="flex items-center gap-2">{item.risk_review_required && <Badge className="border-amber-200 bg-amber-50 text-amber-900"><AlertTriangle className="mr-1 size-3" />Revisar resposta de segurança</Badge>}{selected?.id === item.id ? <ChevronUp className="size-4 text-slate-500" /> : <ChevronDown className="size-4 text-slate-500" />}</span></button>
        {detailLoading && selected?.id !== item.id && <div className="border-t border-slate-100 px-5 py-4 text-sm text-slate-500"><LoaderCircle className="mr-2 inline size-4 animate-spin" />Carregando resposta…</div>}
        {selected?.id === item.id && <div className="space-y-6 border-t border-slate-200 bg-[#fbfcfb] p-4 sm:p-6">
          <div className="flex flex-wrap justify-end gap-2 print:hidden">{editing ? <><Button type="button" variant="outline" disabled={savingEdit} onClick={() => setEditing(false)}><X className="mr-2 size-4" />Cancelar edição</Button><Button type="button" disabled={savingEdit} onClick={() => void saveEdits()} className="gap-2 bg-[#17675b] hover:bg-[#12574d]">{savingEdit ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}Salvar alterações</Button></> : <Button type="button" variant="outline" onClick={startEditing} className="gap-2"><Pencil className="size-4" />Editar anamnese</Button>}<Button type="button" variant="destructive" disabled={deleting} onClick={() => void deleteSelected()} className="gap-2">{deleting ? <LoaderCircle className="size-4 animate-spin" /> : <Trash2 className="size-4" />}Excluir ficha</Button></div>
          {editing ? <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5"><div><h3 className="font-display text-lg font-semibold text-[#24584e]">Editar respostas</h3><p className="mt-1 text-sm text-slate-600">A assinatura, o consentimento e a data de nascimento são preservados como registro original.</p></div><AnamnesisAnswerEditor answers={editAnswers} onChange={(key, value) => setEditAnswers(current => ({ ...current, [key]: value }))} /><div className="flex justify-end"><Button type="button" disabled={savingEdit} onClick={() => void saveEdits()} className="gap-2 bg-[#17675b] hover:bg-[#12574d]">{savingEdit ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}Salvar alterações</Button></div></section> : <>
          {selected.risk_review_required && <section className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-950"><div className="flex items-start gap-3"><AlertTriangle className="mt-0.5 size-5 shrink-0" /><div><h3 className="font-semibold">Relatório prévio de respostas de segurança</h3><p className="mt-1 text-sm leading-6">Há resposta(s) afirmativa(s) na seção de segurança. Confira os registros abaixo e revise a ficha completa com prioridade profissional. Este resumo reproduz respostas do paciente; não é diagnóstico nem classificação automática de risco.</p></div></div><dl className="mt-4 space-y-3 border-t border-amber-200 pt-4">{safetyReportEntries(selected.responses).map(([key, answer]) => <div key={key}><dt className="text-xs font-semibold text-amber-900">{anamnesisFieldLabels[key]}</dt><dd className="mt-1 whitespace-pre-wrap text-sm leading-6 text-amber-950">{display(answer)}</dd></div>)}</dl></section>}
          <section className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm sm:grid-cols-2"><p><strong>Data de nascimento:</strong> {new Date(`${selected.birth_date}T12:00:00`).toLocaleDateString('pt-BR')}</p><p><strong>Telefone:</strong> {selected.contact_phone || 'Não informado'}</p><p><strong>E-mail:</strong> {selected.contact_email || 'Não informado'}</p><p><strong>Assinatura:</strong> {selected.signed_name || '—'}</p><p><strong>Termo aceito:</strong> {selected.consent_version || '—'}</p><p><strong>Consentimento registrado:</strong> {selected.consented_at ? new Date(selected.consented_at).toLocaleString('pt-BR') : '—'}</p></section>
          <section className="rounded-2xl border border-[#cbded3] bg-white p-4 sm:p-5"><div className="border-b border-slate-200 pb-3"><h3 className="font-display text-lg font-semibold text-[#24584e]">Relatório preliminar — análise descritiva da anamnese</h3><p className="mt-1 text-sm leading-6 text-slate-600">Organiza queixa, impacto, sintomas, segurança e contexto a partir das respostas registradas, para apoiar a leitura profissional. Não infere dados ausentes, não produz diagnóstico nem substitui a análise clínica do profissional.</p></div>{reportGroups.length ? <div className="mt-4 grid gap-4 lg:grid-cols-2">{reportGroups.map(group => <section key={group.title} className="rounded-xl border border-slate-200 bg-[#fbfcfb] p-4"><h4 className="mb-3 font-semibold text-slate-800">{group.title}</h4><dl className="space-y-3">{group.entries.map(([key, answer]) => <div key={key}><dt className="text-xs font-semibold text-slate-500">{anamnesisFieldLabels[key]}</dt><dd className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-800">{display(answer)}</dd></div>)}</dl></section>)}</div> : <p className="mt-4 text-sm text-slate-500">Nenhuma resposta clínica foi preenchida para compor esta síntese.</p>}</section>
          {anamnesisSteps.slice(0, 12).map((title, index) => {
            const entries = Object.entries(selected.responses ?? {}).filter(([key, answer]) => key !== 'date_of_birth' && answer !== '' && (!Array.isArray(answer) || answer.length) && sectionFor(key) === index);
            if (!entries.length) return null;
            return <section key={title}><h3 className="mb-3 border-b border-slate-200 pb-2 font-display text-lg font-semibold text-[#24584e]">{title}</h3><dl className="space-y-3">{entries.map(([key, answer]) => <div key={key}><dt className="text-xs font-semibold text-slate-500">{anamnesisFieldLabels[key] ?? key}</dt><dd className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-800">{display(answer)}</dd></div>)}</dl></section>;
          })}
        </>}
        </div>}
      </CardContent></Card>)}
    </div>
  </AdminLayout>;
}

function sectionFor(key: string) {
  if (['full_name', 'date_of_birth', 'cpf', 'phone', 'email', 'profession', 'civil_status', 'postal_code', 'street', 'neighborhood', 'street_number', 'address_complement', 'city', 'state', 'household', 'education'].includes(key)) return 0;
  if (['main_concern', 'onset', 'trigger_event', 'trigger_event_details', 'treatment_expectation', 'work_study_impact', 'social_impact', 'family_impact', 'life_impact_scale'].includes(key)) return 1;
  if (['symptoms', 'other_symptoms', 'anxiety_scale', 'stress_scale', 'quality_of_life_scale', 'self_esteem_scale'].includes(key)) return 2;
  if (['suicidal_thoughts_ever', 'death_thoughts_current', 'death_thoughts_frequency', 'suicide_plan', 'access_to_means', 'protective_factors', 'thoughts_intensity', 'self_harm_ever', 'self_harm_details'].includes(key)) return 3;
  if (['previous_treatment', 'previous_treatment_details', 'medication_use', 'medication_name_dose', 'medication_duration', 'medication_prescriber', 'medication_adherence', 'medication_benefit', 'physical_health_history', 'physical_health_details', 'hospitalizations', 'hospitalization_details', 'hospitalization_reason', 'hospitalization_year'].includes(key)) return 4;
  if (['childhood_adolescence', 'abuse_experiences', 'abuse_details', 'repeated_patterns', 'adult_professional_life'].includes(key)) return 5;
  if (['mother_relationship', 'father_relationship', 'parental_presence', 'childhood_warmth', 'critical_figure', 'family_mental_health'].includes(key)) return 6;
  if (['loneliness', 'inner_void', 'abandonment_fear', 'inadequacy', 'frustration', 'loss_of_control', 'impulsivity', 'insight', 'support_person', 'immediate_support', 'future_projection', 'desired_change'].includes(key)) return 7;
  if (['daily_routine', 'sleep', 'appetite', 'physical_activity', 'physical_activity_frequency', 'leisure', 'substances', 'substances_frequency', 'substances_details'].includes(key)) return 8;
  if (['sexual_orientation', 'gender_identity', 'sexual_activity', 'sexual_frequency', 'sexual_satisfaction', 'sexual_satisfaction_details', 'sexual_difficulties', 'sexual_difficulties_details'].includes(key)) return 9;
  if (['religion_belief', 'spiritual_practice', 'spiritual_frequency', 'spiritual_support'].includes(key)) return 10;
  if (key === 'additional_observations') return 11;
  return -1;
}
