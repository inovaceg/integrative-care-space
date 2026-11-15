import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/components/auth/auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';

type Instrument = { id: string; name: string; areas: string[]; public: string; purpose: string; is_active: boolean };
type Report = { id: string; paciente_id: string; title: string };
type Assessment = { id: string; paciente_id: string; report_id: string | null; title: string; age_group: string; status: string; instrument_ids: string[]; intake: Record<string, string>; updated_at: string };

const ageGroups = ['criança', 'adolescente', 'adulto', 'idoso'] as const;
const intakeFields: Record<(typeof ageGroups)[number], [string, string[]][]> = {
  criança: [
    ['Identificação e contexto', ['Quem respondeu e vínculo com a criança', 'Composição familiar e cuidadores', 'Escola, ano e histórico escolar']],
    ['Desenvolvimento e saúde', ['Gestação, parto e período neonatal (relato do informante)', 'Marcos do desenvolvimento e linguagem', 'Sono, alimentação e saúde atual', 'Acompanhamentos e medicações relatados']],
    ['Funcionamento cotidiano', ['Comunicação e interação social observadas/relatadas', 'Atenção, organização e comportamento no cotidiano', 'Autonomia e atividades diárias', 'Pontos fortes, interesses e recursos de apoio']],
    ['Demanda', ['Queixa principal e início', 'Contextos em que ocorre e impacto percebido', 'Expectativas da família e da escola']],
  ],
  adolescente: [
    ['Identificação e contexto', ['Informante e vínculo', 'Composição familiar e rede de apoio', 'Escola, série e trajetória acadêmica']],
    ['Saúde e desenvolvimento', ['Histórico de desenvolvimento relatado', 'Sono, alimentação e saúde atual', 'Acompanhamentos e medicações relatados']],
    ['Funcionamento atual', ['Organização, atenção e rotina de estudos', 'Relações sociais e convivência', 'Autonomia e atividades diárias', 'Interesses, habilidades e fatores protetivos']],
    ['Demanda', ['Queixa principal e início', 'Contextos e impacto no cotidiano', 'Perspectiva do adolescente sobre a avaliação']],
  ],
  adulto: [
    ['Identificação e contexto', ['Escolaridade e trajetória acadêmica', 'Trabalho, ocupação e rotina', 'Composição familiar e rede de apoio']],
    ['Saúde e desenvolvimento', ['Histórico de desenvolvimento (relato retrospectivo)', 'Condições de saúde e acompanhamentos atuais', 'Sono, uso de substâncias e medicações relatados']],
    ['Funcionamento atual', ['Atenção, memória e organização no cotidiano', 'Autonomia e atividades instrumentais diárias', 'Relações, lazer e participação social', 'Habilidades, estratégias e recursos pessoais']],
    ['Demanda', ['Queixa principal e início', 'Contextos e impacto funcional percebido', 'Objetivos da avaliação']],
  ],
  idoso: [
    ['Identificação e contexto', ['Informante e vínculo, se aplicável', 'Escolaridade e ocupações ao longo da vida', 'Composição familiar e rede de apoio']],
    ['Saúde e desenvolvimento', ['Condições de saúde e acompanhamentos atuais', 'Sono, audição, visão e medicações relatados', 'Histórico de desenvolvimento e saúde relevante']],
    ['Funcionamento atual', ['Mudanças cognitivas percebidas e período de início', 'Autonomia nas atividades diárias', 'Humor, participação social e rotina', 'Habilidades preservadas e recursos de apoio']],
    ['Demanda', ['Queixa principal e fonte do relato', 'Contextos e impacto no cotidiano', 'Objetivos da avaliação']],
  ],
};

const adultResponseExamples: Record<string, string> = {
  'Escolaridade e trajetória acadêmica': 'Exemplo ilustrativo: “Ensino superior completo; relata ter concluído a graduação em [área].”',
  'Trabalho, ocupação e rotina': 'Exemplo ilustrativo: “Atua como [ocupação]; descreve uma rotina com [atividades/horários relevantes].”',
  'Composição familiar e rede de apoio': 'Exemplo ilustrativo: “Reside com [pessoas que autoriza registrar] e identifica [rede de apoio].”',
  'Histórico de desenvolvimento (relato retrospectivo)': 'Exemplo ilustrativo: “Segundo relato da própria pessoa, não há lembranças ou informações disponíveis sobre [aspecto]; indicar a fonte e as lacunas do relato.”',
  'Condições de saúde e acompanhamentos atuais': 'Exemplo ilustrativo: “Relata acompanhamento com [profissional/serviço] por [motivo referido], iniciado aproximadamente em [período].”',
  'Sono, uso de substâncias e medicações relatados': 'Exemplo ilustrativo: “Refere dormir em média [horas] por noite; informa uso de [medicação/substância] conforme relato.” Registrar somente o necessário.',
  'Atenção, memória e organização no cotidiano': 'Exemplo ilustrativo: “Refere dificuldade para [atividade cotidiana específica], principalmente em [contexto]; relata que isso ocorre [frequência aproximada].”',
  'Autonomia e atividades instrumentais diárias': 'Exemplo ilustrativo: “Relata realizar [atividade] de forma independente e solicitar apoio para [atividade], quando necessário.”',
  'Relações, lazer e participação social': 'Exemplo ilustrativo: “Descreve participação em [atividade de lazer/convivência] com frequência [referida] e contato com [rede social].”',
  'Habilidades, estratégias e recursos pessoais': 'Exemplo ilustrativo: “Identifica [habilidade/recurso] como útil para lidar com [situação cotidiana].”',
  'Queixa principal e início': 'Exemplo ilustrativo: “A própria pessoa relata [dificuldade/queixa] desde aproximadamente [período], percebida inicialmente em [contexto].”',
  'Contextos e impacto funcional percebido': 'Exemplo ilustrativo: “Refere que a dificuldade aparece em [contextos] e interfere em [atividade/rotina], segundo sua percepção.”',
  'Objetivos da avaliação': 'Exemplo ilustrativo: “Compreender o perfil de funcionamento relacionado à demanda e subsidiar o planejamento de [objetivo acordado].”',
};

export function NeuropsychAssessmentWorkspace({ instruments, reports, patientId, onInstrumentSelectionChange }: { instruments: Instrument[]; reports: Report[]; patientId: string; onInstrumentSelectionChange: (ids: string[]) => void }) {
  const { user } = useAuth();
  const dirtyRevision = useRef(0);
  const saveInProgress = useRef(false);
  const [items, setItems] = useState<Assessment[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [currentUpdatedAt, setCurrentUpdatedAt] = useState('');
  const [reportId, setReportId] = useState('');
  const [title, setTitle] = useState('Avaliação neuropsicológica');
  const [ageGroup, setAgeGroup] = useState<(typeof ageGroups)[number]>('adulto');
  const [status, setStatus] = useState('rascunho');
  const [instrumentIds, setInstrumentIds] = useState<string[]>([]);
  const [intake, setIntake] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');

  async function load() {
    if (!user) return;
    const { data, error } = await supabase.from('neuropsych_assessments').select('*').eq('profissional_id', user.id).order('updated_at', { ascending: false });
    if (error) { setMessage('Não foi possível carregar as avaliações.'); return; }
    setItems((data ?? []) as Assessment[]);
  }
  useEffect(() => { void load(); }, [user?.id]);
  useEffect(() => { dirtyRevision.current = 0; setSelectedId(''); setCurrentUpdatedAt(''); setReportId(''); setTitle('Avaliação neuropsicológica'); setAgeGroup('adulto'); setStatus('rascunho'); setInstrumentIds([]); setIntake({}); }, [patientId]);
  useEffect(() => { onInstrumentSelectionChange(instrumentIds); }, [instrumentIds, onInstrumentSelectionChange]);

  function startNew() {
    dirtyRevision.current = 0;
    setSelectedId(''); setCurrentUpdatedAt(''); setReportId(''); setTitle('Avaliação neuropsicológica'); setAgeGroup('adulto'); setStatus('rascunho'); setInstrumentIds([]); setIntake({}); setMessage('');
  }
  function open(item: Assessment) {
    dirtyRevision.current = 0;
    setSelectedId(item.id); setCurrentUpdatedAt(item.updated_at); setReportId(item.report_id ?? ''); setTitle(item.title); setAgeGroup(item.age_group as (typeof ageGroups)[number]); setStatus(item.status); setInstrumentIds(item.instrument_ids ?? []); setIntake(item.intake ?? {}); setMessage('');
  }
  useEffect(() => {
    if (!user || !patientId || selectedId || !items.length || typeof window === 'undefined') return;
    const savedId = window.sessionStorage.getItem(`neuropsych:last-assessment:${user.id}`);
    const saved = items.find((item) => item.id === savedId && item.paciente_id === patientId);
    if (saved) { setSelectedId(saved.id); setCurrentUpdatedAt(saved.updated_at); setReportId(saved.report_id ?? ''); setTitle(saved.title); setAgeGroup(saved.age_group as (typeof ageGroups)[number]); setStatus(saved.status); setInstrumentIds(saved.instrument_ids ?? []); setIntake(saved.intake ?? {}); }
  }, [items, patientId, selectedId, user?.id]);
  useEffect(() => {
    if (!user || !patientId || !items.length || typeof window === 'undefined') return;
    const key = `neuropsych:last-assessment:${user.id}`;
    if (selectedId) window.sessionStorage.setItem(key, selectedId); else window.sessionStorage.removeItem(key);
  }, [items.length, patientId, selectedId, user?.id]);
  useEffect(() => {
    if (!patientId || !dirtyRevision.current) return;
    const timer = window.setTimeout(() => { void save(true); }, 2000);
    return () => window.clearTimeout(timer);
  }, [ageGroup, intake, instrumentIds, patientId, reportId, selectedId, status, title]);
  useEffect(() => {
    const retry = () => { if (dirtyRevision.current) void save(true); };
    window.addEventListener('online', retry);
    return () => window.removeEventListener('online', retry);
  }, [ageGroup, intake, instrumentIds, patientId, reportId, selectedId, status, title]);
  async function save(automatic = false) {
    if (!user || !patientId || !title.trim()) { setMessage('Selecione um paciente e informe o título.'); return; }
    if (saveInProgress.current) return;
    saveInProgress.current = true;
    if (automatic) setMessage('Salvando rascunho…');
    const savedRevision = dirtyRevision.current;
    const payload = { profissional_id: user.id, paciente_id: patientId, report_id: reportId || null, title: title.trim(), age_group: ageGroup, status, instrument_ids: instrumentIds, intake, updated_at: new Date().toISOString() };
    const query = selectedId
      ? await supabase.from('neuropsych_assessments').update(payload).eq('id', selectedId).eq('profissional_id', user.id).eq('updated_at', currentUpdatedAt).select().single()
      : await supabase.from('neuropsych_assessments').insert(payload).select().single();
    if (query.error) {
      saveInProgress.current = false;
      setMessage(`Não foi possível salvar: ${query.error.message}`);
      return;
    }
    const saved = query.data as Assessment;
    setSelectedId(saved.id);
    setCurrentUpdatedAt(saved.updated_at);
    if (dirtyRevision.current === savedRevision) dirtyRevision.current = 0;
    setMessage(automatic ? 'Rascunho salvo automaticamente.' : 'Avaliação salva.'); await load();
    saveInProgress.current = false;
    if (automatic && dirtyRevision.current !== savedRevision) window.setTimeout(() => void save(true), 2000);
  }

  const availableReports = reports.filter((report) => report.paciente_id === patientId);
  return <section className="rounded-xl border border-slate-200 bg-white p-5" onChange={() => { dirtyRevision.current += 1; }} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget) && dirtyRevision.current) void save(true); }}>
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-display text-lg font-semibold">Central de Avaliação</h2><p className="mt-1 text-sm text-slate-600">Baterias e anamneses originais vinculadas ao paciente e, opcionalmente, ao laudo.</p></div><Button variant="outline" onClick={startNew} disabled={!patientId}>Nova avaliação</Button></div>
    {items.length > 0 && <div className="mt-4"><Label htmlFor="assessment-saved">Avaliações salvas</Label><select id="assessment-saved" className="mt-1 h-10 w-full rounded-md border px-3" value={selectedId} onChange={(event) => { const item = items.find((entry) => entry.id === event.target.value); if (item) open(item); else startNew(); }}><option value="">Criar nova avaliação</option>{items.filter((item) => item.paciente_id === patientId).map((item) => <option key={item.id} value={item.id}>{item.title} · {item.age_group} · {item.status}</option>)}</select></div>}
    <div className="mt-4 grid gap-4 md:grid-cols-2">
      <div><Label htmlFor="assessment-title">Título</Label><Input id="assessment-title" className="mt-1" value={title} onChange={(event) => setTitle(event.target.value)} /></div>
      <div><Label htmlFor="assessment-age">Faixa etária do formulário</Label><select id="assessment-age" className="mt-1 h-10 w-full rounded-md border px-3" value={ageGroup} onChange={(event) => { setAgeGroup(event.target.value as (typeof ageGroups)[number]); setIntake({}); }}><option value="criança">Criança</option><option value="adolescente">Adolescente</option><option value="adulto">Adulto</option><option value="idoso">Idoso</option></select></div>
      <div><Label htmlFor="assessment-status">Situação</Label><select id="assessment-status" className="mt-1 h-10 w-full rounded-md border px-3" value={status} onChange={(event) => setStatus(event.target.value)}><option value="rascunho">Rascunho</option><option value="em_andamento">Em andamento</option><option value="concluida">Concluída</option></select></div>
      <div className="md:col-span-2"><Label htmlFor="assessment-report">Vincular ao laudo (opcional)</Label><select id="assessment-report" className="mt-1 h-10 w-full rounded-md border px-3" value={reportId} onChange={(event) => setReportId(event.target.value)}><option value="">Sem laudo associado</option>{availableReports.map((report) => <option key={report.id} value={report.id}>{report.title}</option>)}</select></div>
    </div>
    <div className="mt-5"><h3 className="font-medium">Bateria personalizada</h3><p className="my-2 text-xs text-slate-600">Selecione instrumentos conforme decisão profissional. Nenhum item de teste, escore ou norma é fornecido pelo sistema.</p><div className="grid gap-2 sm:grid-cols-2">{instruments.filter((instrument) => instrument.is_active).map((instrument) => <label key={instrument.id} className="flex items-start gap-2 rounded-lg border p-3 text-sm"><input type="checkbox" className="mt-1" checked={instrumentIds.includes(instrument.id)} onChange={(event) => setInstrumentIds((current) => event.target.checked ? [...current, instrument.id] : current.filter((id) => id !== instrument.id))} /><span><span className="font-medium">{instrument.name}</span><span className="block text-xs text-slate-500">{instrument.areas.join(' · ')}</span></span></label>)}</div></div>
    <div className="mt-5 space-y-5"><div><h3 className="font-medium">Anamnese original · {ageGroup}</h3><p className="my-2 text-xs text-slate-600">Roteiro aberto para registro profissional; perguntas não são instrumentos psicométricos. Identifique a fonte do relato e registre apenas informações pertinentes.</p>{intakeFields[ageGroup].map(([group, fields]) => <fieldset key={group} className="mb-4 rounded-lg border p-4"><legend className="px-1 text-sm font-medium">{group}</legend>{ageGroup === 'adulto' && <p className="mb-3 text-xs text-slate-600">Modelos ilustrativos para orientar o registro; substitua pelos dados relatados e não os utilize como respostas reais.</p>}<div className="grid gap-3 md:grid-cols-2">{fields.map((field) => <div key={field}><Label htmlFor={`intake-${field}`}>{field}</Label><Textarea id={`intake-${field}`} className="mt-1 min-h-20" placeholder={ageGroup === 'adulto' ? adultResponseExamples[field] ?? '' : ''} value={intake[field] ?? ''} onChange={(event) => setIntake((current) => ({ ...current, [field]: event.target.value }))} /></div>)}</div></fieldset>)}</div></div>
    {message && <p role="status" className="mt-4 text-sm text-slate-700">{message}</p>}
    <Button className="mt-4 bg-[#176b62] text-white" onClick={() => void save()} disabled={!patientId}>Salvar avaliação e bateria</Button>
  </section>;
}
