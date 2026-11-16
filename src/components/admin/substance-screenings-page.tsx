import { useEffect, useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { AlertTriangle, ArrowDownToLine, ClipboardList, ExternalLink, Search, ShieldCheck } from 'lucide-react';
import { AdminLayout, PageIntro, SectionCard } from '@/components/admin/admin-ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { downloadDocumentPdf, type DocumentPage } from '@/lib/admin/document-layout';

type Screening = { id: string; professional_id: string; patient_name: string; birth_date: string; age_group: 'child' | 'adolescent' | 'adult'; modality: string; status: 'draft' | 'pending' | 'in_progress' | 'completed'; answers: Record<string, unknown>; urgent_alert: boolean; created_at: string; updated_at: string; submitted_at: string | null };
type Instrument = { id: string; name: string; version: string; target_audience: string; purpose: string; technical_reference: string; brazilian_validation_status: string; use_license: string; authorized_mode: string; review_status: string };
const substanceNames = ['Álcool', 'Tabaco e nicotina', 'Maconha e derivados', 'Cocaína', 'Crack', 'Anfetaminas e estimulantes', 'Ecstasy e outras drogas sintéticas', 'Opioides', 'Benzodiazepínicos e sedativos', 'Medicamentos sem prescrição ou usados de modo diferente', 'Inalantes e solventes', 'Alucinógenos', 'Outras substâncias', 'Não sabe identificar'];
const instrumentDefaults = [
  { name: 'ASSIST', version: 'Pendente de conferência', target_audience: 'Adultos; confirmar faixa etária no manual', purpose: 'Rastreamento relacionado ao uso de substâncias', technical_reference: 'WHO ASSIST Working Group. The Alcohol, Smoking and Substance Involvement Screening Test (ASSIST): manual for use in primary care. 2010.', brazilian_validation_status: 'Versão brasileira pendente de verificação', use_license: 'Verificar condições e autorização de uso', authorized_mode: 'Não configurado; não aplicar neste módulo', review_status: 'Pendente de conferência' },
  { name: 'AUDIT', version: 'Pendente de conferência', target_audience: 'Adultos; confirmar faixa etária no manual', purpose: 'Rastreamento relacionado ao consumo de álcool', technical_reference: 'Babor TF et al. AUDIT: The Alcohol Use Disorders Identification Test. Guidelines for Use in Primary Care. 2nd ed. WHO, 2001.', brazilian_validation_status: 'Versão brasileira pendente de verificação', use_license: 'Verificar condições e autorização de uso', authorized_mode: 'Não configurado; não aplicar neste módulo', review_status: 'Pendente de conferência' },
  { name: 'CRAFFT', version: 'Pendente de conferência', target_audience: 'Adolescentes; confirmar faixa etária no manual', purpose: 'Rastreamento relacionado ao uso de substâncias em adolescentes', technical_reference: 'Knight JR et al. A new brief screen for adolescent substance abuse. Arch Pediatr Adolesc Med. 1999;153(6):591–596.', brazilian_validation_status: 'Versão brasileira pendente de verificação', use_license: 'Verificar condições e autorização de uso', authorized_mode: 'Não configurado; não aplicar neste módulo', review_status: 'Pendente de conferência' },
  { name: 'DAST-10', version: 'Pendente de conferência', target_audience: 'Adultos; confirmar faixa etária no manual', purpose: 'Rastreamento relacionado a drogas que não sejam álcool', technical_reference: 'Skinner HA. The Drug Abuse Screening Test. Addictive Behaviors. 1982;7(4):363–371.', brazilian_validation_status: 'Versão brasileira pendente de verificação', use_license: 'Verificar condições e autorização de uso', authorized_mode: 'Não configurado; não aplicar neste módulo', review_status: 'Pendente de conferência' },
];
const tabs = ['Visão geral', 'Nova triagem', 'Avaliações recebidas', 'Pacientes em acompanhamento', 'Histórico de avaliações', 'Indicadores de risco', 'Relatórios em PDF', 'Instrumentos de rastreamento', 'Configurações'] as const;
type Tab = typeof tabs[number];
function ageLabel(value: Screening['age_group']) { return value === 'child' ? 'Criança' : value === 'adolescent' ? 'Adolescente' : 'Adulto'; }
function statusLabel(value: Screening['status']) { return value === 'draft' ? 'Rascunho' : value === 'pending' ? 'Pendente' : value === 'in_progress' ? 'Em andamento' : 'Concluída'; }
function flattenAnswers(value: unknown, prefix = ''): [string, string][] {
  if (!value || typeof value !== 'object') return [];
  return Object.entries(value as Record<string, unknown>).flatMap(([key, answer]) => {
    const label = prefix ? `${prefix} · ${key}` : key;
    if (answer && typeof answer === 'object' && !Array.isArray(answer)) return flattenAnswers(answer, label);
    const text = Array.isArray(answer) ? answer.join(', ') : String(answer ?? '');
    return text.trim() ? [[label, text] as [string, string]] : [];
  });
}
function pdfWrap(text: string, max = 93) {
  return text.split('\n').flatMap((paragraph) => {
    if (!paragraph) return [''];
    const result: string[] = [];
    let line = '';
    for (const word of paragraph.split(/\s+/)) {
      if (!line || `${line} ${word}`.length <= max) line = line ? `${line} ${word}` : word;
      else { result.push(line); line = word; }
    }
    if (line) result.push(line);
    return result;
  });
}
function reportPages(item: Screening): DocumentPage[] {
  const pages: DocumentPage[] = [[]];
  let page = pages[0];
  let y = 56;
  const add = (text: string, bold = false, size = 9.5, color = '#334155') => {
    for (const line of pdfWrap(text)) {
      if (y > 730) { page = []; pages.push(page); y = 56; }
      page.push({ text: line, x: 42, y, size, bold, color });
      y += size * 1.55;
    }
  };
  const heading = (value: string) => { y += 5; add(value, true, 12, '#123c3d'); };
  add('RELATÓRIO INDIVIDUAL DE TRIAGEM — USO DE SUBSTÂNCIAS', true, 15, '#123c3d');
  add('Documento de triagem para revisão profissional. Não constitui laudo psicológico, diagnóstico ou classificação de dependência.', false, 9, '#64748b');
  heading('1. Identificação');
  add(`Nome: ${item.patient_name || 'Não informado'} · Nascimento: ${item.birth_date || 'Não informado'} · Faixa etária: ${ageLabel(item.age_group)}`);
  add(`Data de preenchimento/envio: ${item.submitted_at ? new Date(item.submitted_at).toLocaleString('pt-BR') : 'Rascunho'} · Modalidade: ${item.modality === 'online' ? 'Online' : 'Assistida por profissional'}`);
  heading('2. Motivo e respostas relatadas');
  const answers = item.answers ?? {};
  const substances = Array.isArray(answers.substances) ? answers.substances.join(', ') : 'Não informado';
  add(`Substâncias selecionadas pela pessoa/responsável: ${substances || 'Nenhuma selecionada'}`);
  const responses = flattenAnswers(answers).filter(([key]) => key !== 'substances' && key !== 'safety');
  responses.forEach(([key, value]) => add(`${key.replaceAll('_', ' ')}: ${value}`));
  heading('3. Indicadores de segurança');
  const safety = answers.safety && typeof answers.safety === 'object' ? Object.entries(answers.safety as Record<string, unknown>).filter(([, active]) => active).map(([key]) => key.replaceAll('_', ' ')) : [];
  add(item.urgent_alert ? `Alerta de segurança sinalizado: ${safety.join(', ') || 'requer revisão profissional imediata'}.` : 'Nenhum alerta de segurança foi sinalizado no formulário. A ausência de alerta não substitui avaliação clínica.');
  heading('4. Revisão profissional');
  add('Respostas da pessoa avalianda ou responsável registradas no formulário. Indicadores de triagem não equivalem a avaliação clínica. Recomenda-se revisar os relatos em contexto profissional e combinar próximos passos com a pessoa e, conforme idade e segurança, seu responsável.');
  add(`Situação do acompanhamento: ${statusLabel(item.status)}.`);
  add('Juiz de Fora - MG, data de emissão: ' + new Date().toLocaleDateString('pt-BR'));
  y += 24;
  add('______________________________________________');
  add('Dr. Frederick Martins Parreira · Psicólogo — CRP 04/86194');
  return pages;
}

export function SubstanceScreeningsPage() {
  const { userId } = useUserId();
  const [rows, setRows] = useState<Screening[]>([]);
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [selected, setSelected] = useState<Screening | null>(null);
  const [tab, setTab] = useState<Tab>('Visão geral');
  const [search, setSearch] = useState('');
  const [ageFilter, setAgeFilter] = useState('all');
  const [substanceFilter, setSubstanceFilter] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [notice, setNotice] = useState('');
  const [failure, setFailure] = useState('');

  async function load() {
    if (!userId) return;
    const { data, error } = await supabase.from('substance_screenings').select('id,professional_id,patient_name,birth_date,age_group,modality,status,answers,urgent_alert,created_at,updated_at,submitted_at').eq('professional_id', userId).order('updated_at', { ascending: false });
    if (error) { setFailure('Não foi possível carregar as avaliações. Confirme seu acesso profissional.'); return; }
    setRows((data ?? []) as Screening[]);
    setFailure('');
  }
  async function loadInstruments() {
    if (!userId) return;
    let { data, error } = await supabase.from('substance_screening_instruments').select('*').eq('professional_id', userId).order('name');
    if (error) { setFailure('Não foi possível carregar o catálogo de instrumentos.'); return; }
    if (!data?.length) {
      const inserted = await supabase.from('substance_screening_instruments').upsert(instrumentDefaults.map((item) => ({ ...item, professional_id: userId })), { onConflict: 'professional_id,name' }).select('*');
      if (inserted.error) { setFailure('Não foi possível preparar o catálogo de instrumentos.'); return; }
      data = inserted.data;
    }
    setInstruments((data ?? []) as Instrument[]);
  }
  useEffect(() => { void load(); void loadInstruments(); }, [userId]);

  async function changeStatus(item: Screening, status: Screening['status']) {
    const { error } = await supabase.from('substance_screenings').update({ status, updated_at: new Date().toISOString() }).eq('id', item.id).eq('professional_id', userId);
    if (error) { setFailure('Não foi possível atualizar a situação.'); return; }
    setNotice('Situação atualizada.');
    await load();
  }
  async function saveInstrument(item: Instrument) {
    const { error } = await supabase.from('substance_screening_instruments').update({ version: item.version, target_audience: item.target_audience, purpose: item.purpose, technical_reference: item.technical_reference, brazilian_validation_status: item.brazilian_validation_status, use_license: item.use_license, authorized_mode: item.authorized_mode, review_status: item.review_status, updated_at: new Date().toISOString() }).eq('id', item.id).eq('professional_id', userId);
    if (error) setFailure('Não foi possível salvar as informações do instrumento.');
    else setNotice('Catálogo atualizado. A aplicação de instrumentos continua desabilitada até conferência profissional.');
  }
  async function exportPdf(item: Screening) {
    try { await downloadDocumentPdf(reportPages(item), `triagem-substancias-${item.patient_name || 'paciente'}`.toLowerCase().replace(/[^a-z0-9-]+/g, '-'), false, true); }
    catch { setFailure('Não foi possível gerar o PDF direto. Use a opção de impressão do navegador para salvar como PDF.'); }
  }

  const filtered = useMemo(() => rows.filter((item) => {
    const query = search.trim().toLocaleLowerCase('pt-BR');
    const date = (item.submitted_at ?? item.created_at).slice(0, 10);
    const substances = Array.isArray(item.answers?.substances) ? item.answers.substances as string[] : [];
    return (!query || item.patient_name.toLocaleLowerCase('pt-BR').includes(query))
      && (ageFilter === 'all' || item.age_group === ageFilter)
      && (substanceFilter === 'all' || substances.includes(substanceFilter))
      && (!from || date >= from) && (!to || date <= to);
  }), [ageFilter, from, rows, search, substanceFilter, to]);
  const urgentCount = rows.filter((item) => item.urgent_alert).length;
  const pendingCount = rows.filter((item) => item.status === 'pending').length;
  const inProgressCount = rows.filter((item) => item.status === 'in_progress').length;
  const completedCount = rows.filter((item) => item.status === 'completed').length;
  const rowsForTab = tab === 'Pacientes em acompanhamento' ? filtered.filter((item) => item.status === 'in_progress') : tab === 'Avaliações recebidas' ? filtered.filter((item) => item.status === 'pending') : tab === 'Indicadores de risco' ? filtered.filter((item) => item.urgent_alert) : filtered;

  return <AdminLayout><PageIntro eyebrow="Núcleo de avaliação de substâncias" title="Triagem e acompanhamento" description="Registros de triagem para revisão profissional. Não há diagnóstico ou classificação automática." />
    <div className="mt-5 flex gap-2 overflow-x-auto pb-2">{tabs.map((item) => <Button key={item} size="sm" variant={tab === item ? 'default' : 'outline'} className={tab === item ? 'shrink-0 bg-[#17675b] text-white' : 'shrink-0'} onClick={() => { setTab(item); setSelected(null); }}>{item}</Button>)}</div>
    {failure && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{failure}</p>}{notice && <p role="status" className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
    {tab === 'Nova triagem' && <SectionCard title="Iniciar uma nova triagem"><div className="space-y-4"><p className="text-sm leading-6 text-slate-600">Abra o formulário público para iniciar uma triagem assistida ou encaminhar o link à pessoa. O fluxo será escolhido automaticamente pela data de nascimento.</p><Button asChild className="bg-[#17675b] text-white"><Link to="/triagem-substancias" target="_blank"><ExternalLink className="mr-2 size-4"/>Iniciar minha avaliação</Link></Button></div></SectionCard>}
    {tab === 'Instrumentos de rastreamento' && <SectionCard title="Catálogo administrativo de instrumentos"><p className="mb-4 text-sm leading-6 text-slate-600">As perguntas, gabaritos, pontos de corte e pontuação não são incluídos. A aplicação permanece indisponível até que versão, validação, licença e modalidade sejam conferidas.</p><div className="space-y-4">{instruments.map((item) => <article key={item.id} className="space-y-3 rounded-xl border border-slate-200 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-semibold">{item.name}</h2><span className="rounded-full bg-amber-50 px-3 py-1 text-xs text-amber-900">{item.review_status}</span></div><div className="grid gap-3 sm:grid-cols-2"><div><Label>Versão</Label><Input value={item.version} onChange={(event) => setInstruments((all) => all.map((row) => row.id === item.id ? { ...row, version: event.target.value } : row))}/></div><div><Label>Público-alvo</Label><Input value={item.target_audience} onChange={(event) => setInstruments((all) => all.map((row) => row.id === item.id ? { ...row, target_audience: event.target.value } : row))}/></div><div><Label>Finalidade</Label><Input value={item.purpose} onChange={(event) => setInstruments((all) => all.map((row) => row.id === item.id ? { ...row, purpose: event.target.value } : row))}/></div><div><Label>Referência técnica</Label><Input value={item.technical_reference} onChange={(event) => setInstruments((all) => all.map((row) => row.id === item.id ? { ...row, technical_reference: event.target.value } : row))}/></div><div><Label>Validação brasileira</Label><Input value={item.brazilian_validation_status} onChange={(event) => setInstruments((all) => all.map((row) => row.id === item.id ? { ...row, brazilian_validation_status: event.target.value } : row))}/></div><div><Label>Condições de uso/licença</Label><Input value={item.use_license} onChange={(event) => setInstruments((all) => all.map((row) => row.id === item.id ? { ...row, use_license: event.target.value } : row))}/></div><div><Label>Modalidade autorizada</Label><Input value={item.authorized_mode} onChange={(event) => setInstruments((all) => all.map((row) => row.id === item.id ? { ...row, authorized_mode: event.target.value } : row))}/></div><div><Label>Situação de conferência</Label><Input value={item.review_status} onChange={(event) => setInstruments((all) => all.map((row) => row.id === item.id ? { ...row, review_status: event.target.value } : row))}/></div></div><Button variant="outline" size="sm" onClick={() => void saveInstrument(item)}>Salvar informações</Button></article>)}</div></SectionCard>}
    {tab !== 'Nova triagem' && tab !== 'Instrumentos de rastreamento' && <>
      {tab === 'Visão geral' && <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{[['Total de triagens', rows.length], ['Pendentes', pendingCount], ['Em andamento', inProgressCount], ['Alertas de segurança', urgentCount], ['Concluídas', completedCount]].map(([label, value]) => <article key={label} className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p></article>)}</div>}
      {tab === 'Configurações' && <SectionCard title="Privacidade e funcionamento"><div className="space-y-3 text-sm leading-6 text-slate-600"><p className="flex gap-2"><ShieldCheck className="mt-1 size-4 shrink-0 text-emerald-700"/>Respostas públicas ficam no Supabase, em tabela com RLS, e não são expostas na URL. A retomada é feita por uma chave guardada apenas na sessão do navegador.</p><p>Os registros são atribuídos ao profissional com papel doctor configurado no Supabase. Somente esse profissional pode consultar os dados na área autenticada.</p><p>O formulário interrompe a triagem ao sinalizar risco urgente e orienta o uso do SAMU 192. O alerta é registrado para revisão profissional.</p><p>Compartilhamento de relatórios ou envio a terceiros não está habilitado neste módulo.</p></div></SectionCard>}
      <SectionCard title={tab === 'Relatórios em PDF' ? 'Relatórios individuais' : tab === 'Indicadores de risco' ? 'Alertas sinalizados (não diagnósticos)' : tab === 'Histórico de avaliações' ? 'Histórico' : 'Avaliações'}><div className="grid gap-3 md:grid-cols-5"><div className="md:col-span-2"><Label htmlFor="substance-search">Buscar por nome</Label><div className="relative mt-1"><Search className="absolute left-3 top-2.5 size-4 text-slate-400"/><Input id="substance-search" className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nome"/></div></div><div><Label htmlFor="substance-age-filter">Faixa etária</Label><select id="substance-age-filter" className="mt-1 h-10 w-full rounded-md border px-3 text-sm" value={ageFilter} onChange={(event) => setAgeFilter(event.target.value)}><option value="all">Todas</option><option value="child">Crianças</option><option value="adolescent">Adolescentes</option><option value="adult">Adultos</option></select></div><div><Label htmlFor="substance-name-filter">Substância</Label><select id="substance-name-filter" className="mt-1 h-10 w-full rounded-md border px-3 text-sm" value={substanceFilter} onChange={(event) => setSubstanceFilter(event.target.value)}><option value="all">Todas</option>{substanceNames.map((name) => <option key={name}>{name}</option>)}</select></div><div className="grid grid-cols-2 gap-2"><div><Label htmlFor="substance-from">De</Label><Input id="substance-from" type="date" value={from} onChange={(event) => setFrom(event.target.value)}/></div><div><Label htmlFor="substance-to">Até</Label><Input id="substance-to" type="date" value={to} onChange={(event) => setTo(event.target.value)}/></div></div></div>
        <div className="mt-4 space-y-2">{rowsForTab.map((item) => <article key={item.id} className={`rounded-xl border p-4 ${item.urgent_alert ? 'border-red-200 bg-red-50/50' : 'border-slate-200'}`}><div className="flex flex-wrap items-center justify-between gap-3"><button type="button" className="flex min-w-0 items-start gap-3 text-left" onClick={() => setSelected(selected?.id === item.id ? null : item)}><span className={`mt-1 grid size-9 shrink-0 place-items-center rounded-lg ${item.urgent_alert ? 'bg-red-100 text-red-700' : 'bg-[#e5f4f0] text-[#26786e]'}`}>{item.urgent_alert ? <AlertTriangle className="size-5"/> : <ClipboardList className="size-5"/>}</span><span><strong className="block">{item.patient_name || 'Nome não informado'} · {ageLabel(item.age_group)}</strong><span className="text-xs text-slate-500">{statusLabel(item.status)} · {new Date(item.updated_at).toLocaleString('pt-BR')}{item.urgent_alert ? ' · Alerta de segurança' : ''}</span></span></button><div className="flex flex-wrap gap-2"><select aria-label={`Situação ${item.patient_name}`} className="h-9 rounded-md border bg-white px-2 text-xs" value={item.status} onChange={(event) => void changeStatus(item, event.target.value as Screening['status'])}><option value="pending">Pendente</option><option value="in_progress">Em andamento</option><option value="completed">Concluída</option></select>{(tab === 'Relatórios em PDF' || selected?.id === item.id) && <Button size="sm" variant="outline" onClick={() => void exportPdf(item)}><ArrowDownToLine className="mr-2 size-4"/>PDF</Button>}</div></div>{selected?.id === item.id && <div className="mt-4 border-t border-slate-200 pt-4"><h3 className="font-semibold">Respostas registradas</h3><p className="mt-1 text-xs text-slate-500">Relato da pessoa ou responsável; não representa interpretação clínica.</p>{item.urgent_alert && <p className="mt-3 rounded-lg bg-red-100 p-3 text-sm font-medium text-red-900">Alerta de segurança: priorizar revisão profissional. O formulário exibiu orientação de emergência.</p>}<dl className="mt-3 grid gap-3 sm:grid-cols-2">{flattenAnswers(item.answers).map(([key, value]) => <div key={key} className="rounded-lg bg-slate-50 p-3"><dt className="text-xs font-medium text-slate-500">{key.replaceAll('_', ' ')}</dt><dd className="mt-1 whitespace-pre-wrap text-sm text-slate-800">{value}</dd></div>)}</dl><div className="mt-3 flex gap-2"><Button size="sm" variant="outline" onClick={() => void exportPdf(item)}><ArrowDownToLine className="mr-2 size-4"/>Exportar relatório</Button></div></div>}</article>)}{!rowsForTab.length && <p className="rounded-xl bg-slate-50 p-5 text-sm text-slate-500">Nenhuma triagem corresponde aos filtros.</p>}</div></SectionCard>
    </>}
  </AdminLayout>;
}

function useUserId() {
  const [userId, setUserId] = useState<string | undefined>();
  useEffect(() => { void supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id)); }, []);
  return { userId };
}
