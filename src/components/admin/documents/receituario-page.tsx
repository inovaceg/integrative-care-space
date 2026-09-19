import { useEffect, useState } from 'react';
import { flushSync } from 'react-dom';
import { FileText, Plus, Settings } from 'lucide-react';
import { useAuth } from '@/components/auth/auth-provider';
import { AdminLayout, PageIntro, SectionCard } from '@/components/admin/admin-ui';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { PatientForm, PrescriptionEditor, ExamRequestEditor, Field } from './document-fields';
import { ProfessionalAreaSelector, DocumentTypeSelector } from './document-selectors';
import { DocumentPreview, PrintDocument } from './document-preview';
import { DocumentHistory } from './document-history';
import { deleteDocument, emptyContent, getDocuments, professionalDocumentFooter, saveDocument, professionalAreas, today, type DocumentContent, type DocumentType, type ProfessionalArea, type ProfessionalDocument } from '@/lib/admin/documents';
import { documentFilename, downloadDocumentPdf, layoutDocument, type DocumentPage } from '@/lib/admin/document-layout';

export default function ReceituarioPage() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<ProfessionalDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [step, setStep] = useState(0);
  const [area, setArea] = useState<ProfessionalArea | null>(null);
  const [type, setType] = useState<DocumentType | null>(null);
  const [content, setContent] = useState<DocumentContent>(() => emptyContent());
  const [savedId, setSavedId] = useState<string>();
  const [dirty, setDirty] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const [pages, setPages] = useState<DocumentPage[]>([]);
  const [printPages, setPrintPages] = useState<DocumentPage[]>([]);
  const [preview, setPreview] = useState<{ pages: DocumentPage[]; filename: string; record?: ProfessionalDocument } | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [confirmation, setConfirmation] = useState<{ title: string; description: string; action: () => void } | null>(null);

  useEffect(() => {
    let active = true;
    getDocuments().then(rows => {
      if (!active) return;
      setDocuments(rows);
    }).catch(() => { if (active) setError('Não foi possível carregar os documentos. Verifique sua conexão e suas permissões.'); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (area && type && step === 3) setPages(layoutDocument(area, type, content, true));
    else setPages([]);
  }, [area, type, content, step]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  function change(value: DocumentContent) { setContent(value); setDirty(true); setReviewed(false); setMessage(''); }
  function start() {
    setContent(emptyContent(professionalDocumentFooter)); setArea(null); setType(null); setSavedId(undefined); setDirty(false); setReviewed(false); setStep(1); setError(''); setMessage('');
  }
  function confirmDiscard(action: () => void) {
    const hasContent = content.patient.name || content.patient.cpf || content.patient.birthDate || content.patient.phone || content.items.length || content.exams.length || content.text || content.guidance || content.clinicalNotes || content.patient.date !== today();
    if (!hasContent) { action(); return; }
    setConfirmation({ title: 'Descartar o conteúdo deste editor?', description: 'O conteúdo preenchido no formulário será descartado. Documentos já salvos no histórico não serão excluídos.', action });
  }
  function valid() {
    if (!content.patient.name.trim() || !content.patient.date) { setError('Preencha o nome completo do paciente e a data do atendimento.'); return false; }
    setError(''); return true;
  }
  function showPreview() {
    if (!area || !type || !valid()) return;
    setPreview({ pages: layoutDocument(area, type, content, true), filename: documentFilename(type, content) });
  }
  function print(lines: DocumentPage[], filename: string) {
    const originalTitle = document.title;
    flushSync(() => setPrintPages(lines));
    document.title = filename;
    const restore = () => { document.title = originalTitle; setPrintPages([]); };
    window.addEventListener('afterprint', restore, { once: true });
    window.print();
  }
  function download(lines: DocumentPage[], filename: string) {
    try { downloadDocumentPdf(lines, filename, true); } catch (failure) { setError(failure instanceof Error ? failure.message : 'Não foi possível gerar o PDF.'); }
  }
  async function persist(status: ProfessionalDocument['status']) {
    if (!area || !type || !valid()) return;
    if (status === 'Finalizado' && !reviewed) { setError('Confirme que revisou o conteúdo antes de finalizar.'); return; }
    setBusy(true);
    try {
      const record = await saveDocument(area, type, content, status, savedId);
      setDocuments(rows => [record, ...rows.filter(row => row.id !== record.id)]);
      setSavedId(record.id); setDirty(false);
      setMessage(status === 'Rascunho' ? 'Rascunho salvo com segurança.' : 'Documento finalizado. Para alterações, duplique e crie um novo documento.');
      if (status === 'Finalizado') { setStep(0); view(record); }
    } catch { setError('Não foi possível salvar. O conteúdo permanece no editor. Verifique sua conexão e permissão de acesso.'); }
    finally { setBusy(false); }
  }
  function view(record: ProfessionalDocument) {
    setError('');
    setPreview({ pages: layoutDocument(record.area, record.document_type, record.content, record.status === 'Rascunho'), filename: documentFilename(record.document_type, record.content), record });
  }
  function open(record: ProfessionalDocument, duplicate: boolean) {
    const copied = structuredClone(record.content);
    if (duplicate) copied.patient.date = today();
    setContent(copied); setArea(record.area); setType(record.document_type); setSavedId(duplicate ? undefined : record.id); setDirty(duplicate); setReviewed(false); setStep(3); setPreview(null); setMessage(duplicate ? 'Cópia aberta. Revise os dados antes de salvar ou emitir.' : 'Rascunho aberto para edição.'); setError('');
  }
  function remove(record: ProfessionalDocument) {
    setConfirmation({ title: 'Excluir documento?', description: 'Esta ação exclui permanentemente o documento selecionado. Não poderá ser desfeita.', action: () => {
      setBusy(true);
      deleteDocument(record.id).then(() => { setDocuments(rows => rows.filter(row => row.id !== record.id)); setMessage('Documento excluído.'); }).catch(() => setError('Não foi possível excluir o documento.')).finally(() => setBusy(false));
    } });
  }
  return <AdminLayout>
    <PageIntro eyebrow="Documentação profissional" title="Receituário" description="Criação e gerenciamento de documentos profissionais" action={step === 0 ? <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => setSettingsOpen(true)}><Settings className="size-4" />Dados do rodapé</Button><Button disabled={loading || busy} onClick={start} className="bg-[#2f8f82] text-white hover:bg-[#26796e]"><Plus className="size-4" /> Novo documento</Button></div> : undefined} />
    {error && <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {message && <p role="status" className="mb-4 rounded-lg border border-[#cce7df] bg-[#eff9f6] p-3 text-sm text-[#286a60]">{message}</p>}
    {step === 0 && <DocumentHistory documents={documents} loading={loading} onView={view} onPrint={record => print(layoutDocument(record.area, record.document_type, record.content, record.status === 'Rascunho'), documentFilename(record.document_type, record.content))} onDuplicate={record => open(record, true)} onDelete={remove} />}
    {step > 0 && <div className="mb-5 flex flex-wrap items-center justify-between gap-3 text-sm"><span className="text-slate-500">{step === 1 ? '1. Área profissional' : step === 2 ? '2. Tipo de documento' : '3. Elaboração e revisão'}</span><Button variant="ghost" disabled={busy} onClick={() => confirmDiscard(() => { setStep(0); setContent(emptyContent()); setDirty(false); })}>Cancelar</Button></div>}
    {step === 1 && <ProfessionalAreaSelector value={area} onChange={value => { setArea(value); setType(null); }} onContinue={() => setStep(2)} />}
    {step === 2 && area && <DocumentTypeSelector area={area} value={type} onChange={setType} onContinue={() => setStep(3)} onBack={() => setStep(1)} />}
    {step === 3 && area && type && <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#cce7df] bg-[#eff9f6] p-4"><div className="flex items-center gap-3"><FileText className="size-6 text-[#2f8f82]" /><div><p className="text-xs text-slate-500">Emitindo como:</p><strong>{professionalAreas[area].label} · {professionalAreas[area].registration}</strong><p className="text-sm text-slate-600">{type}</p></div></div><Button variant="outline" disabled={busy} onClick={() => setConfirmation({ title: 'Alterar área profissional?', description: 'Os dados do paciente serão preservados. O conteúdo clínico será limpo para evitar a mistura de documentos entre profissões.', action: () => { setContent({ ...emptyContent(content.footer), patient: content.patient }); setSavedId(undefined); setType(null); setArea(null); setStep(1); setDirty(true); setReviewed(false); } })}>Alterar área</Button></div>
      <p className="mb-5 text-sm leading-6 text-slate-500">Ferramenta de elaboração de documentos. Nenhum medicamento, dose, exame ou tratamento é sugerido automaticamente. Todo conteúdo deve ser informado e revisado pelo profissional responsável.</p>
      <div className="grid items-start gap-6 xl:grid-cols-2">
        <form id="professional-document-editor" autoComplete="off" className="min-w-0 space-y-5" onSubmit={event => { event.preventDefault(); void persist('Rascunho'); }}>
          <fieldset disabled={busy} className="min-w-0 space-y-5">
            <PatientForm patient={content.patient} onChange={patient => change({ ...content, patient })} />
            {type === 'Receituário' ? <PrescriptionEditor content={content} onChange={change} /> : type === 'Solicitação de Exames' ? <ExamRequestEditor exams={content.exams} notes={content.clinicalNotes} onChange={exams => change({ ...content, exams })} onNotes={clinicalNotes => change({ ...content, clinicalNotes })} /> : <SectionCard title={type}><Field label="Conteúdo do documento" multiline value={content.text} onChange={text => change({ ...content, text })} /></SectionCard>}
            <SectionCard title="Orientações adicionais"><Field label="Orientações ao paciente" multiline value={content.guidance} onChange={guidance => change({ ...content, guidance })} /></SectionCard>
            <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm leading-6"><input type="checkbox" className="mt-1 size-4 accent-[#2f8f82]" checked={reviewed} onChange={event => setReviewed(event.target.checked)} />Revisei os dados do paciente e todo o conteúdo deste documento, conforme minha área e atribuições profissionais.</label>
            <div className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-4">
              <Button type="submit">Salvar rascunho</Button>
              <Button type="button" variant="outline" onClick={showPreview}>Visualizar documento</Button>
              <Button type="button" variant="outline" onClick={() => { if (valid()) print(layoutDocument(area, type, content, true), documentFilename(type, content)); }}>Imprimir</Button>
              <Button type="button" variant="outline" onClick={() => { if (valid()) download(layoutDocument(area, type, content, true), documentFilename(type, content)); }}>Gerar PDF</Button>
              <Button type="button" disabled={!reviewed} onClick={() => setConfirmation({ title: 'Finalizar documento?', description: 'Após a finalização, o documento não poderá ser editado. Para corrigir, crie uma cópia, preservando o original no histórico.', action: () => void persist('Finalizado') })}>Finalizar</Button>
              <Button type="button" variant="ghost" onClick={() => confirmDiscard(() => { setContent(emptyContent(professionalDocumentFooter)); setSavedId(undefined); setDirty(false); setReviewed(false); })}>Limpar</Button>
              <Button type="button" variant="ghost" onClick={() => confirmDiscard(() => { setStep(0); setContent(emptyContent()); setDirty(false); })}>Cancelar</Button>
            </div>
          </fieldset>
        </form>
        <aside className="min-w-0"><DocumentPreview pages={pages} showBrand /></aside>
      </div>
    </>}
    <Dialog open={!!preview} onOpenChange={value => { if (!value) setPreview(null); }}><DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-4xl"><DialogHeader><DialogTitle>Visualizar documento</DialogTitle><DialogDescription>Documento privado. Revise o conteúdo e a identificação profissional.</DialogDescription></DialogHeader>{preview && <><div className="flex flex-wrap gap-2"><Button onClick={() => print(preview.pages, preview.filename)}>Imprimir</Button><Button variant="outline" onClick={() => download(preview.pages, preview.filename)}>Gerar PDF</Button>{preview.record?.status === 'Rascunho' && <Button variant="outline" onClick={() => open(preview.record!, false)}>Editar rascunho</Button>}</div>{preview.record && <p className="break-all text-xs text-slate-500">{preview.record.status} · Identificador: {preview.record.id} · Criado em {new Date(preview.record.created_at).toLocaleString('pt-BR')}</p>}<DocumentPreview pages={preview.pages} showBrand /></>}</DialogContent></Dialog>
    <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}><DialogContent><DialogHeader><DialogTitle>Dados do rodapé</DialogTitle><DialogDescription>Este bloco padronizado é aplicado aos documentos emitidos.</DialogDescription></DialogHeader><p className="whitespace-pre-line rounded-lg border border-slate-200 bg-slate-50 p-4 text-center text-sm leading-6 text-slate-700">{professionalDocumentFooter}</p></DialogContent></Dialog>
    <AlertDialog open={!!confirmation} onOpenChange={open => { if (!open) setConfirmation(null); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{confirmation?.title}</AlertDialogTitle><AlertDialogDescription>{confirmation?.description}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Voltar</AlertDialogCancel><AlertDialogAction onClick={() => { const action = confirmation?.action; setConfirmation(null); action?.(); }}>Confirmar</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    {(pages.length > 0 || preview || printPages.length > 0) && <PrintDocument pages={printPages.length ? printPages : preview?.pages ?? pages} showBrand />}
  </AdminLayout>;
}
