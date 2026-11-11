import { useEffect, useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { AlertTriangle, ChevronDown, ChevronUp, LoaderCircle, RefreshCw, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/components/auth/auth-provider';
import { AdminLayout, PageIntro } from '@/components/admin/admin-ui';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { getPsychologicalAnamnesis, listPsychologicalAnamneses, type AnamnesisSubmission } from '@/lib/admin/psychological-anamnesis';
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

function DigitalAnamnesesPage() {
  const { isAdmin, isLoading: authLoading } = useAuth();
  const [items, setItems] = useState<AnamnesisSubmission[]>([]);
  const [selected, setSelected] = useState<AnamnesisSubmission | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState('');

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
    if (selected?.id === id) { setSelected(null); return; }
    setDetailLoading(true); setError('');
    try {
      const result = await getPsychologicalAnamnesis(id);
      setSelected(result.submission);
    } catch {
      setError('Não foi possível abrir esta ficha.');
    } finally { setDetailLoading(false); }
  }

  return <AdminLayout>
    <PageIntro eyebrow="Prontuários protegidos" title="Anamneses psicológicas digitais" description="Fichas enviadas pelo formulário digital, acessíveis somente a profissionais autenticados e autorizados." action={<Button variant="outline" onClick={() => void load()} disabled={loading} className="gap-2"><RefreshCw className="size-4" />Atualizar</Button>} />
    <div className="mt-6 space-y-4">
      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {loading || authLoading ? <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-12 text-sm text-slate-500"><LoaderCircle className="mr-2 size-4 animate-spin" />Carregando fichas...</div> : items.length === 0 ? <Card className="border-slate-200"><CardContent className="p-10 text-center"><ShieldCheck className="mx-auto size-8 text-[#26786e]" /><h2 className="mt-3 font-medium text-slate-800">Nenhuma ficha enviada</h2><p className="mt-1 text-sm text-slate-500">As novas respostas aparecerão aqui após o envio.</p></CardContent></Card> : items.map(item => <Card key={item.id} className="overflow-hidden border-slate-200 shadow-sm"><CardContent className="p-0"><button type="button" onClick={() => void open(item.id)} className="flex w-full flex-col items-start justify-between gap-3 p-4 text-left hover:bg-slate-50 sm:flex-row sm:items-center sm:p-5"><span className="min-w-0"><span className="block truncate font-semibold text-slate-800">{item.patient_name || 'Nome não informado'}</span><span className="mt-1 block text-sm text-slate-500">Enviada em {item.submitted_at ? new Date(item.submitted_at).toLocaleString('pt-BR') : '—'}</span></span><span className="flex items-center gap-2">{item.risk_review_required && <Badge className="border-amber-200 bg-amber-50 text-amber-900"><AlertTriangle className="mr-1 size-3" />Revisar resposta de segurança</Badge>}{selected?.id === item.id ? <ChevronUp className="size-4 text-slate-500" /> : <ChevronDown className="size-4 text-slate-500" />}</span></button>
        {detailLoading && selected?.id !== item.id && <div className="border-t border-slate-100 px-5 py-4 text-sm text-slate-500"><LoaderCircle className="mr-2 inline size-4 animate-spin" />Carregando resposta…</div>}
        {selected?.id === item.id && <div className="space-y-6 border-t border-slate-200 bg-[#fbfcfb] p-4 sm:p-6">
          {selected.risk_review_required && <div className="flex gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-950"><AlertTriangle className="mt-0.5 size-5 shrink-0" /><p><strong>Revisar resposta de segurança.</strong> Esta sinalização privada indica apenas que uma ou mais respostas relacionadas a segurança foram afirmativas; não é diagnóstico nem classificação automática de risco.</p></div>}
          <section className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm sm:grid-cols-2"><p><strong>Data de nascimento:</strong> {new Date(`${selected.birth_date}T12:00:00`).toLocaleDateString('pt-BR')}</p><p><strong>Telefone:</strong> {selected.contact_phone || 'Não informado'}</p><p><strong>E-mail:</strong> {selected.contact_email || 'Não informado'}</p><p><strong>Assinatura:</strong> {selected.signed_name || '—'}</p><p><strong>Termo aceito:</strong> {selected.consent_version || '—'}</p><p><strong>Consentimento registrado:</strong> {selected.consented_at ? new Date(selected.consented_at).toLocaleString('pt-BR') : '—'}</p></section>
          {anamnesisSteps.slice(0, 12).map((title, index) => {
            const entries = Object.entries(selected.responses ?? {}).filter(([key, answer]) => key !== 'date_of_birth' && answer !== '' && (!Array.isArray(answer) || answer.length) && sectionFor(key) === index);
            if (!entries.length) return null;
            return <section key={title}><h3 className="mb-3 border-b border-slate-200 pb-2 font-display text-lg font-semibold text-[#24584e]">{title}</h3><dl className="space-y-3">{entries.map(([key, answer]) => <div key={key}><dt className="text-xs font-semibold text-slate-500">{anamnesisFieldLabels[key] ?? key}</dt><dd className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-800">{display(answer)}</dd></div>)}</dl></section>;
          })}
        </div>}
      </CardContent></Card>)}
    </div>
  </AdminLayout>;
}

function sectionFor(key: string) {
  if (['full_name', 'date_of_birth', 'cpf', 'phone', 'email', 'profession', 'civil_status', 'postal_code', 'street', 'neighborhood', 'street_number', 'address_complement', 'city', 'state', 'household', 'education'].includes(key)) return 0;
  if (['main_concern', 'onset', 'trigger_event', 'treatment_expectation', 'work_study_impact', 'social_impact', 'family_impact', 'life_impact_scale'].includes(key)) return 1;
  if (['symptoms', 'other_symptoms', 'anxiety_scale', 'stress_scale', 'quality_of_life_scale', 'self_esteem_scale'].includes(key)) return 2;
  if (['suicidal_thoughts_ever', 'death_thoughts_current', 'death_thoughts_frequency', 'suicide_plan', 'access_to_means', 'protective_factors', 'thoughts_intensity', 'self_harm_ever', 'self_harm_details'].includes(key)) return 3;
  if (['previous_treatment', 'previous_treatment_details', 'medication_use', 'medication_name_dose', 'medication_duration', 'medication_prescriber', 'medication_adherence', 'medication_benefit', 'physical_health_history', 'hospitalizations', 'hospitalization_details'].includes(key)) return 4;
  if (['childhood_adolescence', 'abuse_experiences', 'abuse_details', 'repeated_patterns', 'adult_professional_life'].includes(key)) return 5;
  if (['mother_relationship', 'father_relationship', 'parental_presence', 'childhood_warmth', 'critical_figure', 'family_mental_health'].includes(key)) return 6;
  if (['loneliness', 'inner_void', 'abandonment_fear', 'inadequacy', 'frustration', 'loss_of_control', 'impulsivity', 'insight', 'support_person', 'immediate_support', 'future_projection', 'desired_change'].includes(key)) return 7;
  if (['daily_routine', 'sleep', 'appetite', 'physical_activity', 'leisure', 'substances'].includes(key)) return 8;
  if (['sexual_orientation', 'gender_identity', 'sexual_activity', 'sexual_satisfaction', 'sexual_difficulties'].includes(key)) return 9;
  if (['religion_belief', 'spiritual_practice', 'spiritual_frequency', 'spiritual_support'].includes(key)) return 10;
  if (key === 'additional_observations') return 11;
  return -1;
}
