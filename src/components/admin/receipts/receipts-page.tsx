import { useEffect, useRef, useState, type FormEvent } from 'react';
import { flushSync } from 'react-dom';
import { ReceiptPatientEditor } from './receipt-patient-editor';
import { Download, Pencil, Printer } from 'lucide-react';
import { useAuth } from '@/components/auth/auth-provider';
import { AdminLayout, PageIntro, SearchInput, SectionCard } from '@/components/admin/admin-ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DocumentPreview, PrintDocument } from '@/components/admin/documents/document-preview';
import { fetchPatient, fetchPatientOptions, type PatientOption } from '@/lib/admin/records';
import { today } from '@/lib/admin/documents';
import { downloadDocumentPdf, type DocumentPage } from '@/lib/admin/document-layout';
import { layoutReceipt } from '@/lib/admin/receipt-layout';
import { createReceiptDraft, fetchReceipts, finalizeReceipt, paymentMethods, receiptPageSize, type Receipt, type ReceiptArea } from '@/lib/admin/receipts';
import { ReceiptHistory } from './receipt-history';

const selectClass = 'h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm';

export default function ReceiptsPage() {
  const { user } = useAuth();
  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [reload, setReload] = useState(0);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [patientId, setPatientId] = useState('');
  const [patient, setPatient] = useState<{ nome: string; cpf: string | null } | null>(null);
  const [patientLoading, setPatientLoading] = useState(false);
  const [patientError, setPatientError] = useState('');
  const [editingPatientId, setEditingPatientId] = useState<string | null>(null);
  const [area, setArea] = useState<ReceiptArea>('Psicologia');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(today);
  const [method, setMethod] = useState('Pix');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [preview, setPreview] = useState<{ receipt: Receipt; pages: DocumentPage[] } | null>(null);
  const [printPages, setPrintPages] = useState<DocumentPage[]>([]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    setLoading(true); setLoadFailed(false); setError('');
    Promise.all([fetchPatientOptions(user.id), fetchReceipts(user.id)]).then(([result, rows]) => {
      if (result.error) throw result.error;
      if (!active) return;
      setPatients(result.data ?? []); setReceipts(rows); setOffset(rows.length); setHasMore(rows.length === receiptPageSize);
    }).catch(() => { if (active) { setLoadFailed(true); setError('Não foi possível carregar os pacientes e recibos. Tente novamente.'); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user?.id, reload]);

  useEffect(() => {
    setPatient(null); setPatientError('');
    if (!patientId || !user) { setPatientLoading(false); return; }
    let active = true;
    setPatientLoading(true);
    fetchPatient(user.id, patientId).then(({ data, error }) => {
      if (error || !data) throw new Error();
      if (active) setPatient(data);
    }).catch(() => { if (active) setPatientError('Não foi possível buscar os dados. Selecione o paciente novamente.'); })
      .finally(() => { if (active) setPatientLoading(false); });
    return () => { active = false; };
  }, [patientId, user?.id]);

  function show(receipt: Receipt) { setPreview({ receipt, pages: layoutReceipt(receipt) }); }
  function replaceReceipt(receipt: Receipt) { setReceipts(rows => rows.map(row => row.id === receipt.id ? receipt : row)); }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!user || !patient || lock.current) return;
    lock.current = true; setBusy(true); setError(''); setMessage('');
    try {
      const draft = await createReceiptDraft(user.id, { patientId, area, amount: Number(amount), paymentDate: date, paymentMethod: method });
      setReceipts(rows => [draft, ...rows]); setOffset(value => value + 1);
      setPatientId(''); setAmount('');
      const receipt = await finalizeReceipt(user.id, draft.id);
      replaceReceipt(receipt); setMessage('Recibo salvo e finalizado. Você já pode gerar o PDF ou imprimir.'); show(receipt);
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Não foi possível salvar o recibo.'); }
    finally { lock.current = false; setBusy(false); }
  }

  async function finalize(receipt: Receipt) {
    if (!user || lock.current || !window.confirm('Finalizar este recibo? Após finalizar, os dados não poderão ser alterados.')) return;
    lock.current = true; setBusy(true); setError(''); setMessage('');
    try { const saved = await finalizeReceipt(user.id, receipt.id); replaceReceipt(saved); show(saved); setMessage('Recibo finalizado.'); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Não foi possível finalizar.'); }
    finally { lock.current = false; setBusy(false); }
  }

  async function loadMore() {
    if (!user || lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try {
      const rows = await fetchReceipts(user.id, offset);
      setReceipts(current => [...current, ...rows.filter(row => !current.some(item => item.id === row.id))]);
      setOffset(value => value + rows.length); setHasMore(rows.length === receiptPageSize);
    } catch { setError('Não foi possível carregar mais recibos. Tente novamente.'); }
    finally { lock.current = false; setBusy(false); }
  }

  function download() {
    if (!preview) return;
    try { downloadDocumentPdf(preview.pages, preview.receipt.receipt_number, true); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Não foi possível gerar o PDF.'); setPreview(null); }
  }
  function print() {
    if (!preview) return;
    flushSync(() => setPrintPages(preview.pages));
    const title = document.title;
    document.title = preview.receipt.receipt_number;
    window.addEventListener('afterprint', () => { document.title = title; setPrintPages([]); }, { once: true });
    window.print();
  }
  const query = search.trim().toLocaleLowerCase('pt-BR');
  const filtered = receipts.filter(receipt => `${receipt.receipt_number} ${receipt.patient_name} ${receipt.patient_cpf}`.toLocaleLowerCase('pt-BR').includes(query));

  return <AdminLayout>
    <PageIntro eyebrow="Documentação de pagamentos" title="Recibos" description="Emita recibos de consultas e consulte o histórico da sua conta." />
    {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</p>}
    {message && <p role="status" className="mb-4 rounded-lg bg-emerald-50 p-4 text-sm text-emerald-800">{message}</p>}
    {loading ? <p role="status">Carregando pacientes e recibos...</p> : loadFailed ? <Button onClick={() => setReload(value => value + 1)}>Tentar novamente</Button> : <div className="space-y-6">
      <SectionCard title="Novo recibo">
        <form onSubmit={save} autoComplete="off"><fieldset disabled={busy} className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <div className="space-y-2 md:col-span-2 xl:col-span-3">
            <Label htmlFor="receipt-patient">Paciente cadastrado</Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <select id="receipt-patient" className={selectClass} required value={patientId} onChange={event => setPatientId(event.target.value)}><option value="">Selecione um paciente</option>{patients.map(item => <option key={item.id} value={item.id}>{item.nome}</option>)}</select>
              <Button type="button" variant="outline" disabled={!patientId || patientLoading || busy} onClick={() => setEditingPatientId(patientId)} className="h-10 shrink-0"><Pencil className="size-4" />Alterar cadastro</Button>
            </div>
            {patientId && <p className="text-xs text-slate-500">Edite o cadastro aqui mesmo, sem sair do recibo. Nome e CPF serão atualizados ao salvar.</p>}
            {!patients.length && <p className="text-sm text-slate-500">Cadastre um paciente no módulo Pacientes para emitir recibos.</p>}
          </div>
          <div className="space-y-2"><Label htmlFor="receipt-name">Nome do paciente</Label><Input id="receipt-name" readOnly value={patient?.nome ?? ''} placeholder={patientLoading ? 'Buscando...' : 'Preenchido pelo cadastro'} /></div>
          <div className="space-y-2"><Label htmlFor="receipt-cpf">CPF (opcional)</Label><Input id="receipt-cpf" readOnly value={patient?.cpf ?? ''} placeholder="Não informado" /></div>
          <div className="space-y-2"><Label htmlFor="receipt-area">Área</Label><select id="receipt-area" className={selectClass} value={area} onChange={event => setArea(event.target.value as ReceiptArea)}><option>Psicologia</option><option>Biomedicina</option></select></div>
          <div className="space-y-2"><Label htmlFor="receipt-amount">Valor da consulta (R$)</Label><Input id="receipt-amount" type="number" inputMode="decimal" min="0.01" max="999999999.99" step="0.01" required value={amount} onChange={event => setAmount(event.target.value)} placeholder="0,00" /></div>
          <div className="space-y-2"><Label htmlFor="receipt-date">Data do pagamento</Label><Input id="receipt-date" type="date" required value={date} onChange={event => setDate(event.target.value)} /></div>
          <div className="space-y-2"><Label htmlFor="receipt-method">Forma de pagamento</Label><select id="receipt-method" className={selectClass} value={method} onChange={event => setMethod(event.target.value)}>{paymentMethods.map(value => <option key={value}>{value}</option>)}</select></div>
          <div className="space-y-3 md:col-span-2 xl:col-span-3">
            {patientError && <p role="alert" className="text-sm text-red-700">{patientError}</p>}
            <p className="text-sm text-slate-500">Confira os dados antes de salvar. O recibo finalizado preserva os dados da emissão e não pode ser editado. Este documento não substitui obrigações fiscais, como o Receita Saúde, quando aplicável.</p>
            <Button type="submit" disabled={!patient || patientLoading || busy} className="bg-[#2f8f82] hover:bg-[#26796e]">{busy ? 'Salvando...' : 'Salvar e emitir recibo'}</Button>
          </div>
        </fieldset></form>
      </SectionCard>
      <SectionCard title="Histórico de recibos">
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar nos recibos carregados por nome, CPF ou número" />
        <ReceiptHistory receipts={filtered} busy={busy} onView={show} onFinalize={receipt => void finalize(receipt)} />
        {hasMore && <Button variant="outline" disabled={busy} className="mt-4" onClick={() => void loadMore()}>Carregar mais recibos</Button>}
      </SectionCard>
    </div>}
    {editingPatientId && <ReceiptPatientEditor key={editingPatientId} patientId={editingPatientId} onClose={() => setEditingPatientId(null)} onSaved={updated => {
      setPatient(updated);
      setPatients(rows => rows.map(row => row.id === updated.id ? { ...row, nome: updated.nome } : row));
      setPatientError('');
      setMessage('Cadastro do paciente atualizado com sucesso.');
      setEditingPatientId(null);
    }} />}
    <Dialog open={!!preview} onOpenChange={open => { if (!open) setPreview(null); }}><DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-4xl"><DialogHeader><DialogTitle>Recibo {preview?.receipt.receipt_number}</DialogTitle><DialogDescription>Confira os dados antes de compartilhar com o paciente. A assinatura deve ser feita pelo profissional responsável.</DialogDescription></DialogHeader>{preview && <><div className="flex flex-wrap gap-2"><Button onClick={download}><Download className="size-4" />Gerar PDF</Button><Button variant="outline" onClick={print}><Printer className="size-4" />Imprimir</Button></div><DocumentPreview pages={preview.pages} showBrand /></>}</DialogContent></Dialog>
    {printPages.length > 0 && <PrintDocument pages={printPages} showBrand />}
  </AdminLayout>;
}
