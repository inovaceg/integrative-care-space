import { useEffect, useMemo, useRef, useState } from 'react';
import { Download, FilePlus2, History, Save, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/components/auth/auth-provider';
import { AdminLayout, PageIntro, SectionCard } from '@/components/admin/admin-ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { NeuropsychAssessmentWorkspace } from '@/components/admin/neuropsych-assessment-workspace';
import { NeuropsychCatalogGuide } from '@/components/admin/neuropsych-catalog-guide';
import { Asrs18IdentificationForm, Asrs18Questionnaire, asrs18ContentKey, asrs18IdentificationKey, formatAsrs18Responses, type Asrs18Identification } from '@/components/admin/asrs18-questionnaire';
import { supabase } from '@/integrations/supabase/client';
import { downloadDocumentPdf } from '@/lib/admin/document-layout';
import { buildNeuropsychReportPages, neuropsychReportFilename } from '@/lib/admin/neuropsych-report-pdf';

type Patient = { id: string; nome: string; data_nascimento: string | null };
type Report = { id: string; paciente_id: string; title: string; status: 'rascunho' | 'finalizado'; sections: Record<string, string>; updated_at: string };
type Instrument = { id: string; name: string; area: string; areas: string[]; aliases: string[]; is_active: boolean; public: string; purpose: string; version: string; satepsi_status: string; license: string };
const sections = ['Identificação','Descrição da demanda','Procedimentos realizados','Histórico clínico e informações relevantes','Instrumentos utilizados','Observações comportamentais','Resultados por domínio cognitivo','Análise integrada','Conclusão','Recomendações e encaminhamentos','Limitações da avaliação','Identificação e assinatura profissional'];
const areas = ['Inteligência e raciocínio','Atenção e concentração','Memória e aprendizagem','Funções executivas','Desenvolvimento e comportamento adaptativo','TDAH','TEA','Aspectos emocionais e personalidade'];
function patientAge(dateOfBirth: string | null) {
  if (!dateOfBirth) return '';
  const birth = new Date(`${dateOfBirth}T00:00:00`);
  if (Number.isNaN(birth.getTime())) return '';
  const today = new Date();
  const age = today.getFullYear() - birth.getFullYear() - (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate()) ? 1 : 0);
  return `${age} anos`;
}
function readAsrs18Identification(value: string | undefined): Partial<Asrs18Identification> {
  try {
    const parsed: unknown = JSON.parse(value ?? '{}');
    return parsed && typeof parsed === 'object' ? parsed as Partial<Asrs18Identification> : {};
  } catch {
    return {};
  }
}
const recommendationsSection = 'Recomendações e encaminhamentos';
function recommendationFields(value: string) {
  const lines = value.split('\n');
  return [...lines.slice(0, 9), lines.slice(9).join('\n'), ...Array.from({ length: Math.max(0, 10 - lines.length) }, () => '')].slice(0, 10);
}
function updateRecommendation(value: string, index: number, nextValue: string) {
  const fields = recommendationFields(value);
  fields[index] = nextValue;
  return fields.join('\n');
}
const sectionGuidance: Record<string, string> = {
  'Identificação': 'Registre os dados necessários para identificar a pessoa avaliada e o período da avaliação. Exemplo: nome completo, idade na data da avaliação e escolaridade. Evite dados que não sejam necessários.',
  'Descrição da demanda': 'Descreva quem solicitou a avaliação, a queixa apresentada e a pergunta que a avaliação pretende esclarecer. Exemplo: “A família procurou avaliação devido a dificuldades relatadas de atenção no contexto escolar.”',
  'Procedimentos realizados': 'Registre entrevistas, fontes de informação, sessões e procedimentos efetivamente realizados, com datas ou período. Exemplo: “Entrevista inicial em 12/03/2025 e quatro sessões de avaliação entre março e abril.”',
  'Histórico clínico e informações relevantes': 'Inclua apenas informações relatadas ou documentadas que sejam pertinentes à demanda. Identifique a fonte quando possível. Exemplo: “Segundo relato do responsável, houve acompanhamento fonoaudiológico na infância.”',
  'Instrumentos utilizados': 'Informe instrumentos, versões efetivamente aplicadas e datas, sem reproduzir itens, estímulos ou materiais protegidos. Exemplo: “Instrumento X, versão indicada no manual consultado, aplicado em 18/03/2025.”',
  'Observações comportamentais': 'Descreva comportamentos observáveis durante as sessões e o contexto em que ocorreram. Exemplo: “Solicitou repetição das instruções em duas tarefas; manteve-se na atividade durante o restante da sessão.”',
  'Resultados por domínio cognitivo': 'Registre resultados por domínio com referência à fonte e ao manual utilizado. Não calcule nem classifique automaticamente. Exemplo: “Atenção: resultados e observações descritos conforme protocolo e manual consultados.”',
  'Análise integrada': 'Articule os dados obtidos, considerando convergências, diferenças, contexto e limitações. Exemplo: “Os achados desta tarefa devem ser considerados junto à entrevista e às demais fontes.”',
  'Conclusão': 'Escreva a conclusão profissional baseada nos dados desta avaliação; não use diagnóstico ou conclusão automática. Exemplo: “À luz dos procedimentos descritos, observou-se...”',
  'Recomendações e encaminhamentos': 'Liste orientações pertinentes e encaminhamentos decididos pelo profissional. Exemplo: “Considerar discussão dos achados com a equipe assistente, mediante concordância da pessoa avaliada.”',
  'Limitações da avaliação': 'Informe condições que possam limitar o alcance dos resultados. Exemplo: “A análise considerou as informações disponíveis até a data de emissão.”',
  'Identificação e assinatura profissional': 'Confira nome, profissão, número de registro, local e data; assine apenas após revisão final. Exemplo: “Dr(a). Nome Sobrenome · CRP 00/00000 · Município/UF · data.”',
};
const sessionDraftKey = '__session_draft';
const scoreGuidance: Record<string, string> = {
  application_date: 'Data em que o instrumento foi aplicado. Exemplo: 18/03/2025.', version: 'Transcreva a versão usada conforme o material/manual licenciado. Não estime. Exemplo: “edição indicada no protocolo”.', raw_score: 'Registre o valor bruto conforme a correção autorizada. Exemplo ilustrativo: “42”.', standardized_score: 'Registre apenas o valor padronizado fornecido pela correção/manual. Exemplo ilustrativo: “105”.', percentile: 'Transcreva o percentil consultado no manual autorizado. Exemplo ilustrativo: “63”.', classification: 'Informe a classificação exatamente conforme o manual aplicável; não use classificação automática. Exemplo: “classificação indicada pelo manual”.', qualitative_notes: 'Descreva observações qualitativas do profissional. Exemplo: “pediu repetição da instrução antes de iniciar”.', conditions: 'Registre condições que influenciaram a aplicação. Exemplo: “sessão realizada em sala silenciosa; pausa breve solicitada”.',
};

export default function NeuropsychReportsPage() {
  const { user } = useAuth();
  const restoredSelection = useRef(false);
  const reportDirty = useRef(0);
  const reportAutoSaveInProgress = useRef(false);
  const saveOnExit = useRef<() => void>(() => undefined);
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
  const [catalogFields, setCatalogFields] = useState({ public: '', purpose: '', version: '', satepsi_status: 'Pendente de conferência', license: '' });
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogAreaFilter, setCatalogAreaFilter] = useState('Todas as áreas');
  const [catalogPublicFilter, setCatalogPublicFilter] = useState('');
  const [catalogPurposeFilter, setCatalogPurposeFilter] = useState('');
  const [catalogStatusFilter, setCatalogStatusFilter] = useState('todos');
  const [instrumentDrafts, setInstrumentDrafts] = useState<Record<string, Partial<Instrument>>>({});
  const [batteryInstrumentIds, setBatteryInstrumentIds] = useState<string[]>([]);
  const [resultId, setResultId] = useState('');
  const [score, setScore] = useState({ instrument_id: '', instrument_name: '', application_date: new Date().toISOString().slice(0,10), version: '', raw_score: '', standardized_score: '', percentile: '', classification: '', qualitative_notes: '', conditions: '' });
  const [sessions, setSessions] = useState<{id:string; session_date:string; notes:string; conditions:string}[]>([]);
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().slice(0,10));
  const [sessionNotes, setSessionNotes] = useState('');
  const [linkedAssessments, setLinkedAssessments] = useState<{title:string; age_group:string; status:string; instrument_ids:string[]; intake:Record<string,string>}[]>([]);
  const patient = patients.find((item) => item.id === patientId);
  const savedAsrs18Identification = readAsrs18Identification(content[asrs18IdentificationKey]);
  const asrs18Identification: Asrs18Identification = {
    author: savedAsrs18Identification.author ?? String(user?.user_metadata?.['full_name'] ?? user?.user_metadata?.['name'] ?? user?.email ?? ''),
    requester: savedAsrs18Identification.requester ?? '',
    purpose: savedAsrs18Identification.purpose ?? '',
    patientName: patient?.nome ?? '',
    birthDate: patient?.data_nascimento ? new Date(`${patient.data_nascimento}T00:00:00`).toLocaleDateString('pt-BR') : '',
    age: patientAge(patient?.data_nascimento ?? null),
  };

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
    const patientRows = p.data ?? [];
    const reportRows = (r.data ?? []) as Report[];
    setPatients(patientRows); setReports(reportRows); setInstruments((i.data ?? []) as Instrument[]);
    if (!restoredSelection.current && typeof window !== 'undefined') {
      restoredSelection.current = true;
      const savedPatientId = window.sessionStorage.getItem(`neuropsych:last-patient:${user.id}`);
      const savedReportId = window.sessionStorage.getItem(`neuropsych:last-report:${user.id}`);
      const savedPatient = patientRows.find((item) => item.id === savedPatientId);
      const savedReport = reportRows.find((item) => item.id === savedReportId && item.paciente_id === savedPatientId);
      if (savedPatient) setPatientId(savedPatient.id);
      if (savedReport) {
        setSelected(savedReport); setPatientId(savedReport.paciente_id); setTitle(savedReport.title); setContent(savedReport.sections ?? {}); restoreSessionDraft(savedReport.sections ?? {});
        void loadRelated(savedReport.id);
      }
    }
  }
  useEffect(() => { restoredSelection.current = false; void load(); }, [user?.id]);
  function restoreSessionDraft(sectionsData: Record<string, string>) {
    const raw = sectionsData[sessionDraftKey];
    if (!raw) { setSessionNotes(''); return; }
    try {
      const draft = JSON.parse(raw) as { date?: string; notes?: string };
      if (draft.date) setSessionDate(draft.date);
      setSessionNotes(draft.notes ?? '');
    } catch { setSessionNotes(''); }
  }
  useEffect(() => {
    if (!user || !restoredSelection.current || typeof window === 'undefined') return;
    const patientKey = `neuropsych:last-patient:${user.id}`;
    const reportKey = `neuropsych:last-report:${user.id}`;
    if (patientId) window.sessionStorage.setItem(patientKey, patientId); else window.sessionStorage.removeItem(patientKey);
    if (selected?.id) window.sessionStorage.setItem(reportKey, selected.id); else window.sessionStorage.removeItem(reportKey);
  }, [patientId, selected?.id, user?.id]);

  async function loadRelated(reportId: string) {
    if (!user) return;
    const [res, ses, assessments] = await Promise.all([
      supabase.from('neuropsych_results').select('*').eq('report_id', reportId).eq('profissional_id', user.id),
      supabase.from('neuropsych_assessment_sessions').select('id,session_date,notes,conditions').eq('report_id', reportId).eq('profissional_id', user.id).order('session_date'),
      supabase.from('neuropsych_assessments').select('title,age_group,status,instrument_ids,intake').eq('report_id', reportId).eq('profissional_id', user.id),
    ]);
    if (!res.error && res.data?.length) { setResultId(res.data[0].id); setScore((old) => ({ ...old, ...res.data[0] })); }
    else setResultId('');
    setSessions(ses.data ?? []);
    setLinkedAssessments((assessments.data ?? []) as {title:string; age_group:string; status:string; instrument_ids:string[]; intake:Record<string,string>}[]);
  }
  function newReport(id: string) { reportDirty.current = 0; setSelected(null); setPatientId(id); setTitle('Laudo Neuropsicológico'); setContent(Object.fromEntries(sections.map((s) => [s, '']))); setSessions([]); setLinkedAssessments([]); setResultId(''); setSessionDate(new Date().toISOString().slice(0,10)); setSessionNotes(''); setScore({ instrument_id: '', instrument_name: '', application_date: new Date().toISOString().slice(0,10), version: '', raw_score: '', standardized_score: '', percentile: '', classification: '', qualitative_notes: '', conditions: '' }); }
  async function editReport(report: Report) { reportDirty.current = 0; setSelected(report); setPatientId(report.paciente_id); setTitle(report.title); setContent(report.sections ?? {}); restoreSessionDraft(report.sections ?? {}); await loadRelated(report.id); setNotice(''); }

  async function save(finalize = false, automatic = false) {
    if (!user || !patientId || (selected?.status === 'finalizado' && selected)) return;
    if (automatic && reportAutoSaveInProgress.current) return;
    if (automatic) reportAutoSaveInProgress.current = true;
    const savedRevision = reportDirty.current;
    const sectionsToSave = { ...content, [sessionDraftKey]: JSON.stringify({ date: sessionDate, notes: sessionNotes }) };
    if (!automatic) { setBusy(true); setFailure(''); setNotice(''); } else { setFailure(''); setNotice('Salvando rascunho…'); }
    try {
      let reportId = selected?.id;
      let persistedReport: Report | null = selected;
      if (reportId) {
        const { data: old, error: loadError } = await supabase.from('neuropsych_reports').select('sections,status,updated_at').eq('id', reportId).eq('profissional_id', user.id).single();
        if (loadError) throw loadError;
        if (!old || old.updated_at !== selected?.updated_at) throw new Error('Rascunho alterado em outro local; recarregue antes de salvar.');
        if (old && !automatic) {
          const { count } = await supabase.from('neuropsych_report_versions').select('id', { count: 'exact', head: true }).eq('report_id', reportId).eq('profissional_id', user.id);
          const ver = await supabase.from('neuropsych_report_versions').insert({ report_id: reportId, profissional_id: user.id, version_number: (count ?? 0) + 1, sections: old.sections, status: old.status, created_by: user.id });
          if (ver.error) throw ver.error;
        }
        const { data: updated, error } = await supabase.from('neuropsych_reports').update({ title, sections: sectionsToSave, status: finalize ? 'finalizado' : 'rascunho', finalized_at: finalize ? new Date().toISOString() : null, updated_at: new Date().toISOString() }).eq('id', reportId).eq('profissional_id', user.id).eq('status', 'rascunho').eq('updated_at', old.updated_at).select('*').single();
        if (error) throw error;
        persistedReport = updated as Report;
      } else {
        const { data, error } = await supabase.from('neuropsych_reports').insert({ profissional_id: user.id, paciente_id: patientId, title, sections: sectionsToSave, status: 'rascunho' }).select().single();
        if (error) throw error;
        reportId = data.id;
        persistedReport = data as Report;
        if (!automatic) {
          const { error: versionError } = await supabase.from('neuropsych_report_versions').insert({ report_id: reportId, profissional_id: user.id, version_number: 1, sections: content, status: data.status, created_by: user.id });
          if (versionError) throw versionError;
        }
        if (finalize) {
          const { error: finalizeError } = await supabase.from('neuropsych_reports').update({ status: 'finalizado', finalized_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', reportId).eq('profissional_id', user.id);
          if (finalizeError) throw finalizeError;
        }
      }
      if (score.instrument_name && reportId) {
        const resultPayload = { ...score, instrument_id: score.instrument_id || null, report_id: reportId, profissional_id: user.id };
        const resultQuery = resultId
          ? await supabase.from('neuropsych_results').update(resultPayload).eq('id', resultId).eq('profissional_id', user.id)
          : await supabase.from('neuropsych_results').insert(resultPayload).select('id').single();
        if (resultQuery.error) throw resultQuery.error;
        if (!resultId && resultQuery.data) setResultId(resultQuery.data.id);
      }
      if (automatic) {
        if (persistedReport) setSelected(persistedReport);
        if (reportDirty.current === savedRevision) reportDirty.current = 0;
        setNotice('Rascunho salvo automaticamente.');
        if (reportDirty.current !== savedRevision) window.setTimeout(() => void save(false, true), 2000);
        return;
      }
      setNotice(finalize ? 'Laudo finalizado. A versão final não pode ser editada.' : 'Rascunho salvo com histórico de versão.');
      await load();
      if (finalize && reportId) { const latest = (await supabase.from('neuropsych_reports').select('*').eq('id', reportId).single()).data as Report; if (latest) setSelected(latest); }
      else if (persistedReport) setSelected(persistedReport);
      if (reportDirty.current === savedRevision) reportDirty.current = 0;
    } catch { setFailure('Não foi possível salvar. Confira a conexão e suas permissões.'); }
    finally { if (automatic) reportAutoSaveInProgress.current = false; else setBusy(false); }
  }
  saveOnExit.current = () => {
    if (patientId && reportDirty.current && selected?.status !== 'finalizado') void save(false, true);
  };
  useEffect(() => {
    const flush = () => saveOnExit.current();
    window.addEventListener('pagehide', flush);
    return () => { window.removeEventListener('pagehide', flush); flush(); };
  }, []);
  useEffect(() => {
    if (!patientId || !reportDirty.current || busy || selected?.status === 'finalizado') return;
    const timer = window.setTimeout(() => { void save(false, true); }, 2000);
    return () => window.clearTimeout(timer);
  }, [busy, content, patientId, score, selected?.id, selected?.status, sessionDate, sessionNotes, title]);
  useEffect(() => {
    const retry = () => { if (reportDirty.current) void save(false, true); };
    window.addEventListener('online', retry);
    return () => window.removeEventListener('online', retry);
  }, [content, patientId, score, selected?.id, selected?.status, sessionDate, sessionNotes, title]);

  async function addSession() {
    if (!user || !selected || !patientId || !sessionDate) return;
    const { error } = await supabase.from('neuropsych_assessment_sessions').insert({ report_id: selected.id, profissional_id: user.id, paciente_id: patientId, session_date: sessionDate, notes: sessionNotes, conditions: '' });
    if (error) setFailure('Não foi possível registrar a sessão.'); else { setSessionNotes(''); await loadRelated(selected.id); }
  }
  async function saveInstrument() {
    if (!user || !catalogName.trim()) return;
    const { error } = await supabase.from('neuropsych_instruments').insert({ profissional_id: user.id, name: catalogName.trim(), area: catalogArea, areas: [catalogArea], ...catalogFields, satepsi_status: 'Pendente de conferência' });
    if (error) setFailure('Não foi possível adicionar o instrumento.'); else { setCatalogName(''); setCatalogFields({ public:'',purpose:'',version:'',satepsi_status:'Pendente de conferência',license:'' }); await load(); }
  }
  function updateInstrument(item: Instrument, field: keyof Instrument, value: string | string[] | boolean) {
    setInstrumentDrafts((drafts) => ({ ...drafts, [item.id]: { ...drafts[item.id], [field]: value } }));
  }
  async function saveInstrumentEdits(item: Instrument) {
    if (!user) return;
    const draft = instrumentDrafts[item.id];
    if (!draft) return;
    const { error } = await supabase.from('neuropsych_instruments').update({ ...draft, updated_at: new Date().toISOString() }).eq('id', item.id).eq('profissional_id', user.id);
    if (error) setFailure('Não foi possível atualizar o instrumento.'); else { setInstrumentDrafts((drafts) => { const next = { ...drafts }; delete next[item.id]; return next; }); await load(); }
  }
  async function exportPdf() {
    if (!patient || !selected) return;
    const emittedAt = new Date().toLocaleDateString('pt-BR');
    const asrs18Summary = formatAsrs18Responses(content[asrs18ContentKey] ?? '');
    const reportSections: [string, string][] = [
      ['Laudo Psicológico de Avaliação Neuropsicológica', 'Laudo realizado de acordo com as Resoluções 06/2019, 01/2009 e 31/2022, do Conselho Federal de Psicologia (CFP), que orientam a elaboração de documentos escritos decorrentes de avaliação psicológica e o registro documental profissional. A interpretação e análise devem considerar dados obtidos por métodos, técnicas e instrumentos reconhecidos cientificamente para uso profissional.'],
      ['1. Identificação', ''],
      ['1.1. Identificação do Laudo', `Autoria: ${asrs18Identification.author || 'Não informada'}${user?.user_metadata?.crp ? ` (CRP ${user.user_metadata.crp})` : ''}\nSolicitante: ${asrs18Identification.requester || 'Preencha aqui'}\nFinalidade: ${asrs18Identification.purpose || 'Preencha aqui'}`],
      ['1.2. Identificação do Paciente', `Nome: ${patient.nome}\nData de Nascimento: ${asrs18Identification.birthDate || 'Não informada'}\nIdade: ${asrs18Identification.age || 'Não informada'}`],
      ['2. Descrição da Demanda', content['Descrição da demanda'] || 'Descreva a queixa principal, sintomas ou dificuldades observadas, fonte do relato e contexto.'],
      ['3. Procedimentos', content['Procedimentos realizados'] || 'Descreva os instrumentos formais e não privativos utilizados, bem como os procedimentos efetivamente realizados.'],
      ['4. Análise', ''],
      ['4.1. Anamnese', content['Histórico clínico e informações relevantes'] || ''],
      ['4.1.1. História Pessoal e Desenvolvimento', content['História Pessoal e Desenvolvimento'] || 'Descreva o desenvolvimento, marcos relevantes, contexto educacional e eventos significativos.'],
      ['4.1.2. Contexto Familiar e Relacional', content['Contexto Familiar e Relacional'] || 'Descreva a dinâmica familiar, histórico familiar pertinente e relações sociais.'],
      ['4.1.3. Histórico Médico e Psiquiátrico', content['Histórico Médico e Psiquiátrico'] || 'Registre condições prévias, medicações em uso e sintomas relatados.'],
      ['4.1.4. Fatores Psicossociais e Ambientais', content['Fatores Psicossociais e Ambientais'] || 'Descreva fatores de estresse e aspectos culturais ou socioeconômicos pertinentes.'],
      ['4.2. Instrumentos, observações e resultados', [content['Instrumentos utilizados'], content['Observações comportamentais'], content['Resultados por domínio cognitivo'], content['Análise integrada']].filter(Boolean).join('\n\n')],
      ['5. Conclusão', content['Conclusão'] || 'Descreva os aspectos significativos observados, os principais achados, habilidades preservadas ou dificuldades e a relação com a demanda.'],
      ['6. Sugestões de encaminhamento', (content[recommendationsSection] ?? '').split('\n').filter((line) => line.trim()).map((line) => `- ${line}`).join('\n') || '- Encaminhamento 1\n- Encaminhamento 2\n- Encaminhamento 3\n- Encaminhamento 4'],
      ['Assinatura e observações', `______________________________\n${asrs18Identification.author || 'Profissional responsável'}\nCIDADE, ${emittedAt}\n\n- Não pode ser utilizado para fins diferentes do apontado no item de identificação do documento.\n- Tem caráter sigiloso; o uso após a entrega é de responsabilidade de quem o recebe.\n- A análise isolada deste laudo não tem valor diagnóstico e deve ser considerada em conjunto com os dados clínicos e demais informações pertinentes.`],
      ['7. Referências Bibliográficas', content['Referências Bibliográficas'] || 'Preencha as referências consultadas.'],
      ['8. Termo de entrega', 'Eu, ________________________________________, portador(a) do documento de identidade nº __________________, declaro que recebi em ____/____/______ o(s) seguinte(s) documento(s)/material(is):\n- ________________________________________\n- ________________________________________\n- ________________________________________\n\nCidade: ______________________   Data: ____/____/______\n______________________________________________\nAssinatura do Responsável\n______________________________________________\nProfissional responsável'],
    ];
    if (asrs18Summary) reportSections.push(['ASRS-18 — respostas registradas', asrs18Summary]);
    const pages = buildNeuropsychReportPages({
      patientName: patient.nome,
      birthDate: patient.data_nascimento,
      reportTitle: title,
      emittedAt,
      draft: selected.status !== 'finalizado',
      sections: reportSections,
      linkedAssessments: linkedAssessments.map((assessment) => ({
        ...assessment,
        instruments: instruments.filter((item) => assessment.instrument_ids.includes(item.id)).map((item) => item.name),
      })),
      sessions,
      result: score.instrument_name ? score : null,
    });
    await downloadDocumentPdf(pages, neuropsychReportFilename(patient.nome), false, true);
  }
  const versions = useMemo(() => reports.filter((report) => report.paciente_id === patientId), [reports, patientId]);
  const visibleInstruments = useMemo(() => instruments.filter((item) => {
    const query = catalogSearch.trim().toLocaleLowerCase('pt-BR');
    const matchesText = !query || [item.name, ...item.aliases, item.area, ...item.areas].some((text) => text.toLocaleLowerCase('pt-BR').includes(query));
    const matchesArea = catalogAreaFilter === 'Todas as áreas' || item.areas.includes(catalogAreaFilter);
    const matchesPublic = !catalogPublicFilter.trim() || item.public.toLocaleLowerCase('pt-BR').includes(catalogPublicFilter.trim().toLocaleLowerCase('pt-BR'));
    const matchesPurpose = !catalogPurposeFilter.trim() || item.purpose.toLocaleLowerCase('pt-BR').includes(catalogPurposeFilter.trim().toLocaleLowerCase('pt-BR'));
    const matchesStatus = catalogStatusFilter === 'todos' || (catalogStatusFilter === 'ativos' ? item.is_active : !item.is_active);
    return matchesText && matchesArea && matchesPublic && matchesPurpose && matchesStatus && batteryInstrumentIds.includes(item.id);
  }), [batteryInstrumentIds, catalogAreaFilter, catalogPublicFilter, catalogPurposeFilter, catalogSearch, catalogStatusFilter, instruments]);

  return <AdminLayout><PageIntro eyebrow="Documentação clínica" title="Laudos Neuropsicológicos" description="Elaboração manual, registro protegido e exportação de laudos." />
    <div className="mt-5"><NeuropsychCatalogGuide /></div>
    <div className="mt-5 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4">
      <div className="min-w-56 flex-1"><Label htmlFor="laudo-patient">Paciente</Label><select id="laudo-patient" className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm" value={patientId} onChange={(e) => { if (e.target.value) newReport(e.target.value); else { setPatientId(''); setSelected(null); setContent({}); setSessions([]); setLinkedAssessments([]); setResultId(''); } }}><option value="">Selecione um paciente</option>{patients.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}</select></div>
      <Button disabled={!patientId} onClick={() => newReport(patientId)} className="bg-[#2f8f82] text-white"><FilePlus2 className="mr-2 size-4"/>Novo laudo</Button>
      <div className="min-w-56 flex-1"><Label htmlFor="existing">Laudos anteriores</Label><select id="existing" className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm" value={selected?.id ?? ''} onChange={(e) => { const item = reports.find((r) => r.id === e.target.value); if (item) void editReport(item); }}><option value="">Selecionar laudo salvo</option>{versions.map((r) => <option key={r.id} value={r.id}>{r.title} · {r.status}</option>)}</select></div>
    </div>
    {failure && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{failure}</p>}{notice && <p role="status" className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
    <div className="mt-5"><NeuropsychAssessmentWorkspace instruments={instruments} reports={reports} patientId={patientId} onInstrumentSelectionChange={setBatteryInstrumentIds} /></div>
    {patientId && <div className="mt-5 space-y-5" onChange={() => { reportDirty.current += 1; }} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget) && reportDirty.current) void save(false, true); }}>
      <SectionCard title="Editor do laudo"><div className="space-y-4"><div><Label htmlFor="report-title">Título</Label><Input id="report-title" value={title} onChange={(e) => setTitle(e.target.value)} disabled={selected?.status === 'finalizado'} /><p className="mt-1 text-xs text-slate-500">Nome interno para localizar o documento. Exemplo: “Avaliação neuropsicológica — março/2025”.</p></div>{sections.filter((name) => name !== 'Conclusão' && name !== recommendationsSection).map((name) => name === 'Descrição da demanda' ? <div key={name}><Label>{name}</Label><Asrs18IdentificationForm value={asrs18Identification} onChange={(value) => setContent((current) => ({ ...current, [asrs18IdentificationKey]: JSON.stringify(value) }))} disabled={selected?.status === 'finalizado'} /></div> : <div key={name}><Label htmlFor={`sec-${name}`}>{name}</Label><p className="mt-1 text-xs leading-relaxed text-slate-600">{sectionGuidance[name]}</p><Textarea id={`sec-${name}`} className="mt-1 min-h-24" placeholder="Escreva somente informações revisadas pelo profissional. O exemplo acima é ilustrativo e não é inserido automaticamente." value={content[name] ?? ''} onChange={(e) => setContent((old) => ({ ...old, [name]: e.target.value }))} disabled={selected?.status === 'finalizado'} /></div>)}<Asrs18Questionnaire value={content[asrs18ContentKey] ?? ''} onChange={(value) => setContent((current) => ({ ...current, [asrs18ContentKey]: value, [asrs18IdentificationKey]: current[asrs18IdentificationKey] ?? JSON.stringify(asrs18Identification) }))} disabled={selected?.status === 'finalizado'} /><SectionCard title="Conclusão"><div className="grid gap-4"><Textarea id="report-conclusion" aria-label="Conclusão do laudo" className="min-h-[28rem]" placeholder="Apresente uma síntese dos resultados e interpretações da avaliação, destacando as principais funções cognitivas e emocionais observadas." value={content['Conclusão'] ?? ''} onChange={(event) => setContent((current) => ({ ...current, 'Conclusão': event.target.value }))} disabled={selected?.status === 'finalizado'} /><div className="flex justify-end"><Button type="button" onClick={() => void save(false)} disabled={busy || selected?.status === 'finalizado'} className="min-w-48 bg-[#2f8f82] text-white hover:bg-[#26796e]"><Save className="mr-2 size-4" />Salvar</Button></div></div></SectionCard><SectionCard title="Sugestões de encaminhamento"><div className="grid gap-4">{recommendationFields(content[recommendationsSection] ?? '').map((suggestion, index) => <Input key={index} aria-label={`Sugestão de encaminhamento ${index + 1}`} value={suggestion} onChange={(event) => setContent((current) => ({ ...current, [recommendationsSection]: updateRecommendation(current[recommendationsSection] ?? '', index, event.target.value) }))} placeholder="Escreva a sugestão que você quer que apareça no laudo." disabled={selected?.status === 'finalizado'} />)}<div className="flex justify-end"><Button type="button" onClick={() => void save(false)} disabled={busy || selected?.status === 'finalizado'} className="min-w-48 bg-[#2f8f82] text-white hover:bg-[#26796e]"><Save className="mr-2 size-4" />Salvar</Button></div></div></SectionCard>
        <div className="flex flex-wrap gap-2"><Button disabled={busy || selected?.status === 'finalizado'} onClick={() => void save(false)} variant="outline"><Save className="mr-2 size-4"/>Salvar rascunho</Button><Button disabled={busy || selected?.status === 'finalizado'} onClick={() => void save(true)} className="bg-[#176b62] text-white"><ShieldCheck className="mr-2 size-4"/>Finalizar</Button>{selected && <Button variant="outline" onClick={() => void exportPdf()}><Download className="mr-2 size-4"/>Visualizar / exportar PDF</Button>}</div>
      </div></SectionCard>
      {selected && <SectionCard title="Sessões e resultados"><div className="grid gap-5 lg:grid-cols-2"><div className="space-y-2"><h3 className="font-medium">Sessões de avaliação</h3><p className="text-xs text-slate-600">Data: dia da sessão. Notas: síntese objetiva do que foi realizado, sem dados desnecessários. Exemplo: “18/03/2025 — entrevista de avaliação”.</p><Input type="date" value={sessionDate} onChange={(e) => setSessionDate(e.target.value)}/><Textarea placeholder="Exemplo ilustrativo: entrevista de avaliação e revisão dos documentos apresentados." value={sessionNotes} onChange={(e) => setSessionNotes(e.target.value)}/><Button variant="outline" onClick={() => void addSession()}>Registrar sessão</Button>{sessions.map((s) => <p key={s.id} className="text-sm text-slate-600">{s.session_date} · {s.notes}</p>)}</div><div className="space-y-2"><h3 className="font-medium">Resultado registrado manualmente</h3><p className="text-xs leading-relaxed text-slate-600">Preencha conforme o manual e os registros originais; nada é calculado automaticamente. Exemplos meramente ilustrativos: data “18/03/2025”; versão “conforme identificação do manual”; bruto “42”; padronizado “105”; percentil “63”; classificação “transcrição da categoria do manual”; observações “solicitou repetição da instrução”; condições “sala silenciosa, com pausa breve”. Não use estes exemplos como resultados reais.</p><select className="h-10 w-full rounded-md border px-3" value={score.instrument_id} onChange={(e) => { const item=instruments.find((i)=>i.id===e.target.value); setScore({...score,instrument_id:item?.id ?? '',instrument_name:item?.name ?? ''}); }}><option value="">Selecione instrumento</option>{instruments.filter((i)=>i.is_active).map((i) => <option key={i.id} value={i.id}>{i.name} · {i.areas.join(', ')}</option>)}</select>{(['application_date','version','raw_score','standardized_score','percentile','classification','qualitative_notes','conditions'] as const).map((field) => <div key={field}><Label>{({application_date:'Data de aplicação',version:'Versão',raw_score:'Escore bruto',standardized_score:'Escore padronizado',percentile:'Percentil',classification:'Classificação conforme manual',qualitative_notes:'Observações qualitativas',conditions:'Condições de aplicação'} as Record<string,string>)[field]}</Label><Input type={field === 'application_date' ? 'date' : 'text'} value={score[field]} onChange={(e) => setScore({...score,[field]:e.target.value})}/></div>)}<p className="text-xs text-slate-500">Escores e classificações são inseridos pelo profissional; nenhum cálculo psicométrico é realizado.</p></div></div></SectionCard>}
    </div>}
    <SectionCard title={`Catálogo profissional (${instruments.length})`}><p className="mb-2 text-sm text-slate-600">Preencha apenas com dados verificados na documentação do instrumento; os exemplos abaixo são orientativos, não dados reais.</p><div className="mb-4 rounded-lg bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">Nome: nome oficial, por exemplo “WISC-IV”. Área(s): áreas relacionadas, por exemplo “Inteligência e raciocínio”. Público: faixa descrita na fonte oficial, sem inferir idades. Finalidade: objetivo descrito na fonte oficial, sem reproduzir itens. Versão: identificação exata da edição consultada, não estimar. SATEPSI: situação conferida na consulta oficial; até essa checagem, mantenha “Pendente de conferência”. Licença: situação de aquisição/uso confirmada pelo profissional, por exemplo “licença institucional confirmada”; não assumir que há licença. Ativo: define se aparece para seleção em novos resultados.</div><div className="grid gap-3 md:grid-cols-2"><Input placeholder="Nome oficial (ex.: WISC-IV)" value={catalogName} onChange={(e) => setCatalogName(e.target.value)}/><select className="h-10 rounded-md border px-3" value={catalogArea} onChange={(e) => setCatalogArea(e.target.value)}>{areas.map((a)=><option key={a}>{a}</option>)}</select></div><Button className="mt-3" variant="outline" onClick={()=>void saveInstrument()}>Adicionar instrumento</Button><div className="mt-5 grid gap-3 md:grid-cols-3"><Input placeholder="Buscar nome ou área" value={catalogSearch} onChange={(e)=>setCatalogSearch(e.target.value)}/><select className="h-10 rounded-md border px-3" value={catalogAreaFilter} onChange={(e)=>setCatalogAreaFilter(e.target.value)}><option>Todas as áreas</option>{areas.map((a)=><option key={a}>{a}</option>)}</select><Input aria-label="Filtrar público" placeholder="Filtrar por público" value={catalogPublicFilter} onChange={(e)=>setCatalogPublicFilter(e.target.value)}/><Input aria-label="Filtrar finalidade" placeholder="Filtrar por finalidade" value={catalogPurposeFilter} onChange={(e)=>setCatalogPurposeFilter(e.target.value)}/><select className="h-10 rounded-md border px-3" value={catalogStatusFilter} onChange={(e)=>setCatalogStatusFilter(e.target.value)}><option value="todos">Ativos e inativos</option><option value="ativos">Ativos</option><option value="inativos">Inativos</option></select></div><div className="mt-4 space-y-3">{visibleInstruments.map((i)=>{const d={...i,...instrumentDrafts[i.id]}; return <div key={i.id} className="rounded-lg border p-3"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-semibold">{i.name} <span className="text-sm font-normal text-slate-500">{d.areas.join(' · ')}</span></p><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={d.is_active} onChange={(e)=>updateInstrument(i,'is_active',e.target.checked)}/>Ativo</label></div><div className="mt-2 grid gap-2 sm:grid-cols-2"><Input aria-label={`${i.name}: áreas`} placeholder="Áreas (separadas por vírgula)" value={d.areas.join(', ')} onChange={(e)=>updateInstrument(i,'areas',e.target.value.split(',').map(v=>v.trim()).filter(Boolean))}/>{(['public','purpose','version','satepsi_status','license'] as const).map((f)=><Input key={f} aria-label={`${i.name}: ${f}`} title={({public:'Público: transcreva o recorte indicado pela fonte oficial; não inferir.',purpose:'Finalidade: resuma a descrição oficial sem reproduzir material protegido.',version:'Versão: transcreva a identificação da edição consultada.',satepsi_status:'SATEPSI: registre somente após consulta oficial; padrão é Pendente de conferência.',license:'Licença: informe somente condição confirmada de aquisição/uso.'} as Record<string,string>)[f]} placeholder={({public:'Público conforme fonte oficial',purpose:'Finalidade conforme fonte oficial',version:'Edição confirmada',satepsi_status:'Pendente de conferência',license:'Licença confirmada'} as Record<string,string>)[f]} value={d[f]} onChange={(e)=>updateInstrument(i,f,e.target.value)}/>)}</div><Button className="mt-2" size="sm" variant="outline" disabled={!instrumentDrafts[i.id]} onClick={()=>void saveInstrumentEdits(i)}>Salvar alterações</Button></div>})}{visibleInstruments.length===0&&<p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">Nenhum instrumento corresponde aos filtros.</p>}</div></SectionCard>
    {reports.length > 0 && <SectionCard title="Histórico de versões"><div className="space-y-2">{reports.map((r)=><button key={r.id} className="flex w-full items-center gap-2 rounded-lg border p-3 text-left text-sm hover:bg-slate-50" onClick={()=>void editReport(r)}><History className="size-4 text-[#2f8f82]"/>{patients.find((p)=>p.id===r.paciente_id)?.nome} · {r.title} · {r.status} · {new Date(r.updated_at).toLocaleString('pt-BR')}</button>)}</div></SectionCard>}
  </AdminLayout>;
}
