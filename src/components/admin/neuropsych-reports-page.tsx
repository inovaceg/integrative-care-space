import { useEffect, useMemo, useState } from 'react';
import { Download, FilePlus2, History, Save, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/components/auth/auth-provider';
import { AdminLayout, PageIntro, SectionCard } from '@/components/admin/admin-ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { downloadDocumentPdf, type DocumentPage } from '@/lib/admin/document-layout';

type Patient = { id: string; nome: string; data_nascimento: string | null };
type Report = { id: string; paciente_id: string; title: string; status: 'rascunho' | 'finalizado'; sections: Record<string, string>; updated_at: string };
type Instrument = { id: string; name: string; area: string; public: string; purpose: string; version: string; satepsi_status: string; license: string };
const sections = ['Identificação','Descrição da demanda','Procedimentos realizados','Histórico clínico e informações relevantes','Instrumentos utilizados','Observações comportamentais','Resultados por domínio cognitivo','Análise integrada','Conclusão','Recomendações e encaminhamentos','Limitações da avaliação','Identificação e assinatura profissional'];
const areas = ['Inteligência e raciocínio','Atenção e concentração','Memória e aprendizagem','Funções executivas','Desenvolvimento e comportamento adaptativo','TDAH','TEA','Aspectos emocionais e personalidade'];

export default function NeuropsychReportsPage() {
  const { user } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [selected, setSelected] = useState<Report | null>(null);
  const [patientId, setPatientId] = useState('');
  const [content, setContent] = useState<Record<string, string>>({});
  const [title, setTitle] = useState('Laudo Neuropsicológico');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [failure, setFailure] = useState('');
  const [catalogName, setCatalogName] = useState('');
  const [catalogArea, setCatalogArea] = useState(areas[0]);
  const [catalogFields, setCatalogFields] = useState({ public: '', purpose: '', version: '', satepsi_status: 'A conferir', license: '' });
  const [score, setScore] = useState({ instrument_name: '', application_date: new Date().toISOString().slice(0,10), version: '', raw_score: '', standardized_score: '', percentile: '', classification: '', qualitative_notes: '', conditions: '' });
  const [sessions, setSessions] = useState<{id:string; session_date:string; notes:string; conditions:string}[]>([]);
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().slice(0,10));
  const [sessionNotes, setSessionNotes] = useState('');
  const patient = patients.find((item) => item.id === patientId);

  async function load() {
    if (!user) return;
    setFailure('');
    const [p, r, i] = await Promise.all([
      supabase.from('pacientes').select('id,nome,data_nascimento').eq('profissional_id', user.id).order('nome'),
      supabase.from('neuropsych_reports').select('*').eq('profissional_id', user.id).order('updated_at', { ascending: false }),
      supabase.from('neuropsych_instruments').select('*').eq('profissional_id', user.id).order('name'),
    ]);
    const error = p.error || r.error || i.error;
    if (error) { setFailure('Não foi possível carregar os dados. Verifique o acesso e tente novamente.'); return; }
    setPatients(p.data ?? []); setReports((r.data ?? []) as Report[]); setInstruments((i.data ?? []) as Instrument[]);
  }
  useEffect(() => { void load(); }, [user?.id]);

  async function loadRelated(reportId: string) {
    if (!user) return;
    const [res, ses] = await Promise.all([
      supabase.from('neuropsych_results').select('*').eq('report_id', reportId).eq('profissional_id', user.id),
      supabase.from('neuropsych_assessment_sessions').select('id,session_date,notes,conditions').eq('report_id', reportId).eq('profissional_id', user.id).order('session_date'),
    ]);
    if (!res.error && res.data?.length) setScore((old) => ({ ...old, ...res.data[0] }));
    setSessions(ses.data ?? []);
  }
  function newReport(id: string) { setSelected(null); setPatientId(id); setTitle('Laudo Neuropsicológico'); setContent(Object.fromEntries(sections.map((s) => [s, '']))); setSessions([]); setScore({ instrument_name: '', application_date: new Date().toISOString().slice(0,10), version: '', raw_score: '', standardized_score: '', percentile: '', classification: '', qualitative_notes: '', conditions: '' }); }
  async function editReport(report: Report) { setSelected(report); setPatientId(report.paciente_id); setTitle(report.title); setContent(report.sections ?? {}); await loadRelated(report.id); setNotice(''); }

  async function save(finalize = false) {
    if (!user || !patientId || (selected?.status === 'finalizado' && selected)) return;
    setBusy(true); setFailure(''); setNotice('');
    try {
      let reportId = selected?.id;
      if (reportId) {
        const { data: old } = await supabase.from('neuropsych_reports').select('sections,status').eq('id', reportId).eq('profissional_id', user.id).single();
        if (old) {
          const { count } = await supabase.from('neuropsych_report_versions').select('id', { count: 'exact', head: true }).eq('report_id', reportId).eq('profissional_id', user.id);
          const ver = await supabase.from('neuropsych_report_versions').insert({ report_id: reportId, profissional_id: user.id, version_number: (count ?? 0) + 1, sections: old.sections, status: old.status, created_by: user.id });
          if (ver.error) throw ver.error;
        }
        const { error } = await supabase.from('neuropsych_reports').update({ title, sections: content, status: finalize ? 'finalizado' : 'rascunho', finalized_at: finalize ? new Date().toISOString() : null, updated_at: new Date().toISOString() }).eq('id', reportId).eq('profissional_id', user.id).eq('status', 'rascunho');
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('neuropsych_reports').insert({ profissional_id: user.id, paciente_id: patientId, title, sections: content, status: 'rascunho' }).select().single();
        if (error) throw error;
        reportId = data.id;
        const { error: versionError } = await supabase.from('neuropsych_report_versions').insert({ report_id: reportId, profissional_id: user.id, version_number: 1, sections: content, status: data.status, created_by: user.id });
        if (versionError) throw versionError;
        if (finalize) {
          const { error: finalizeError } = await supabase.from('neuropsych_reports').update({ status: 'finalizado', finalized_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', reportId).eq('profissional_id', user.id);
          if (finalizeError) throw finalizeError;
        }
      }
      if (score.instrument_name && reportId) {
        const { error } = await supabase.from('neuropsych_results').insert({ ...score, report_id: reportId, profissional_id: user.id });
        if (error) throw error;
      }
      setNotice(finalize ? 'Laudo finalizado. A versão final não pode ser editada.' : 'Rascunho salvo com histórico de versão.');
      await load();
      if (finalize && reportId) { const latest = (await supabase.from('neuropsych_reports').select('*').eq('id', reportId).single()).data as Report; if (latest) setSelected(latest); }
      else if (reportId) setSelected({ id: reportId, paciente_id: patientId, title, status: 'rascunho', sections: content, updated_at: new Date().toISOString() });
    } catch { setFailure('Não foi possível salvar. Confira a conexão e suas permissões.'); }
    finally { setBusy(false); }
  }
  async function addSession() {
    if (!user || !selected || !patientId || !sessionDate) return;
    const { error } = await supabase.from('neuropsych_assessment_sessions').insert({ report_id: selected.id, profissional_id: user.id, paciente_id: patientId, session_date: sessionDate, notes: sessionNotes, conditions: '' });
    if (error) setFailure('Não foi possível registrar a sessão.'); else { setSessionNotes(''); await loadRelated(selected.id); }
  }
  async function saveInstrument() {
    if (!user || !catalogName.trim()) return;
    const { error } = await supabase.from('neuropsych_instruments').insert({ profissional_id: user.id, name: catalogName.trim(), area: catalogArea, ...catalogFields });
    if (error) setFailure('Não foi possível adicionar o instrumento.'); else { setCatalogName(''); setCatalogFields({ public:'',purpose:'',version:'',satepsi_status:'A conferir',license:'' }); await load(); }
  }
  async function updateInstrument(item: Instrument, field: keyof Instrument, value: string) {
    if (!user) return;
    const { error } = await supabase.from('neuropsych_instruments').update({ [field]: value, updated_at: new Date().toISOString() }).eq('id', item.id).eq('profissional_id', user.id);
    if (error) setFailure('Não foi possível atualizar o instrumento.'); else await load();
  }
  async function exportPdf() {
    if (!patient || !selected) return;
    const lines: DocumentPage = [{ text: 'LAUDO NEUROPSICOLÓGICO', x: 42, y: 50, size: 17, bold: true, color: '#123c3d' }, { text: `Profissional: Dr. Frederick Martins Parreira · CRP 04/86194`, x: 42, y: 78, size: 10 }, { text: `Paciente: ${patient.nome} · Nascimento: ${patient.data_nascimento ?? 'Não informado'}`, x: 42, y: 96, size: 10 }, { text: `Emitido em ${new Date().toLocaleDateString('pt-BR')}`, x: 42, y: 114, size: 9 }];
    let y = 150;
    for (const heading of sections) {
      lines.push({ text: heading.toUpperCase(), x: 42, y, size: 11, bold: true, color: '#21655f' }); y += 18;
      const body = content[heading] || 'Não informado.';
      for (const part of body.split('\n')) { lines.push({ text: part.slice(0, 160), x: 42, y, size: 9 }); y += 14; if (y > 760) { lines.push({ text: 'Continuação do conteúdo no editor do laudo.', x:42, y:790, size:8 }); break; } }
      y += 12;
    }
    lines.push({ text: 'Assinatura: __________________________________________', x: 120, y: Math.min(y + 24, 800), size: 10 }, { text: `Página 1 · ${new Date().toLocaleDateString('pt-BR')}`, x: 240, y: 820, size: 8, color: '#64748b' });
    await downloadDocumentPdf([lines], `laudo-neuropsicologico-${patient.nome.toLowerCase().replace(/[^a-z0-9]+/g,'-')}.pdf`, false, true);
  }
  const versions = useMemo(() => reports.filter((report) => report.paciente_id === patientId), [reports, patientId]);

  return <AdminLayout><PageIntro eyebrow="Documentação clínica" title="Laudos Neuropsicológicos" description="Elaboração manual, registro protegido e exportação de laudos." />
    <div className="mt-5 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4">
      <div className="min-w-56 flex-1"><Label htmlFor="laudo-patient">Paciente</Label><select id="laudo-patient" className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm" value={patientId} onChange={(e) => { setPatientId(e.target.value); setSelected(null); setContent({}); }}><option value="">Selecione um paciente</option>{patients.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}</select></div>
      <Button disabled={!patientId} onClick={() => newReport(patientId)} className="bg-[#2f8f82] text-white"><FilePlus2 className="mr-2 size-4"/>Novo laudo</Button>
      <div className="min-w-56 flex-1"><Label htmlFor="existing">Laudos anteriores</Label><select id="existing" className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm" value={selected?.id ?? ''} onChange={(e) => { const item = reports.find((r) => r.id === e.target.value); if (item) void editReport(item); }}><option value="">Selecionar laudo salvo</option>{versions.map((r) => <option key={r.id} value={r.id}>{r.title} · {r.status}</option>)}</select></div>
    </div>
    {failure && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{failure}</p>}{notice && <p role="status" className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
    {patientId && <div className="mt-5 space-y-5">
      <SectionCard title="Editor do laudo"><div className="space-y-4"><div><Label htmlFor="report-title">Título</Label><Input id="report-title" value={title} onChange={(e) => setTitle(e.target.value)} disabled={selected?.status === 'finalizado'} /></div>{sections.map((name) => <div key={name}><Label htmlFor={`sec-${name}`}>{name}</Label><Textarea id={`sec-${name}`} className="mt-1 min-h-24" value={content[name] ?? ''} onChange={(e) => setContent((old) => ({ ...old, [name]: e.target.value }))} disabled={selected?.status === 'finalizado'} /></div>)}
        <div className="flex flex-wrap gap-2"><Button disabled={busy || selected?.status === 'finalizado'} onClick={() => void save(false)} variant="outline"><Save className="mr-2 size-4"/>Salvar rascunho</Button><Button disabled={busy || selected?.status === 'finalizado'} onClick={() => void save(true)} className="bg-[#176b62] text-white"><ShieldCheck className="mr-2 size-4"/>Finalizar</Button>{selected && <Button variant="outline" onClick={() => void exportPdf()}><Download className="mr-2 size-4"/>Visualizar / exportar PDF</Button>}</div>
      </div></SectionCard>
      {selected && <SectionCard title="Sessões e resultados"><div className="grid gap-5 lg:grid-cols-2"><div className="space-y-2"><h3 className="font-medium">Sessões de avaliação</h3><Input type="date" value={sessionDate} onChange={(e) => setSessionDate(e.target.value)}/><Textarea placeholder="Notas da sessão" value={sessionNotes} onChange={(e) => setSessionNotes(e.target.value)}/><Button variant="outline" onClick={() => void addSession()}>Registrar sessão</Button>{sessions.map((s) => <p key={s.id} className="text-sm text-slate-600">{s.session_date} · {s.notes}</p>)}</div><div className="space-y-2"><h3 className="font-medium">Resultado registrado manualmente</h3><select className="h-10 w-full rounded-md border px-3" value={score.instrument_name} onChange={(e) => setScore({...score,instrument_name:e.target.value})}><option value="">Selecione instrumento</option>{instruments.map((i) => <option key={i.id} value={i.name}>{i.name}</option>)}</select>{(['application_date','version','raw_score','standardized_score','percentile','classification','qualitative_notes','conditions'] as const).map((field) => <div key={field}><Label>{({application_date:'Data de aplicação',version:'Versão',raw_score:'Escore bruto',standardized_score:'Escore padronizado',percentile:'Percentil',classification:'Classificação conforme manual',qualitative_notes:'Observações qualitativas',conditions:'Condições de aplicação'} as Record<string,string>)[field]}</Label><Input type={field === 'application_date' ? 'date' : 'text'} value={score[field]} onChange={(e) => setScore({...score,[field]:e.target.value})}/></div>)}<p className="text-xs text-slate-500">Escores e classificações são inseridos pelo profissional; nenhum cálculo psicométrico é realizado.</p></div></div></SectionCard>}
    </div>}
    <SectionCard title={`Catálogo profissional (${instruments.length})`}><p className="mb-4 text-sm text-slate-500">Catálogo individual do profissional. A lista de 55 instrumentos do planejamento não está disponível para carga prévia; cadastre os itens sem inserir conteúdo protegido.</p><div className="grid gap-3 md:grid-cols-2"><Input placeholder="Nome do instrumento" value={catalogName} onChange={(e) => setCatalogName(e.target.value)}/><select className="h-10 rounded-md border px-3" value={catalogArea} onChange={(e) => setCatalogArea(e.target.value)}>{areas.map((a)=><option key={a}>{a}</option>)}</select>{(['public','purpose','version','satepsi_status','license'] as const).map((f)=><Input key={f} placeholder={({public:'Público',purpose:'Finalidade',version:'Versão',satepsi_status:'Situação SATEPSI',license:'Licença'} as Record<string,string>)[f]} value={catalogFields[f]} onChange={(e)=>setCatalogFields({...catalogFields,[f]:e.target.value})}/>)}</div><Button className="mt-3" variant="outline" onClick={()=>void saveInstrument()}>Adicionar instrumento</Button><div className="mt-5 space-y-3">{instruments.map((i)=><div key={i.id} className="rounded-lg border p-3"><p className="font-semibold">{i.name} · {i.area}</p><div className="mt-2 grid gap-2 sm:grid-cols-2">{(['public','purpose','version','satepsi_status','license'] as const).map((f)=><Input key={f} aria-label={`${i.name}: ${f}`} value={i[f]} onChange={(e)=>void updateInstrument(i,f,e.target.value)}/>)}</div></div>)}</div></SectionCard>
    {reports.length > 0 && <SectionCard title="Histórico de versões"><div className="space-y-2">{reports.map((r)=><button key={r.id} className="flex w-full items-center gap-2 rounded-lg border p-3 text-left text-sm hover:bg-slate-50" onClick={()=>void editReport(r)}><History className="size-4 text-[#2f8f82]"/>{patients.find((p)=>p.id===r.paciente_id)?.nome} · {r.title} · {r.status} · {new Date(r.updated_at).toLocaleString('pt-BR')}</button>)}</div></SectionCard>}
  </AdminLayout>;
}
