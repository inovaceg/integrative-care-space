import { createFileRoute } from "@tanstack/react-router";
import { ArrowDown, ArrowUp, CalendarDays, FileDown, Loader2, Pencil, Plus, Scale, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { AdminLayout, AdminNotice, EmptyState, PageIntro, SectionCard } from "@/components/admin/admin-ui";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DocumentPreview } from "@/components/admin/documents/document-preview";
import { downloadDocumentPdf, type DocumentPage } from "@/lib/admin/document-layout";
import { applicationReportFilename, applicationReportPages } from "@/lib/admin/application-report";
import { createPatientApplication, deletePatientApplication, fetchApplicationPatients, fetchPatientApplications, updatePatientApplication, type PatientApplication } from "@/lib/admin/patient-applications";

export const Route = createFileRoute("/admin/aplicacoes")({ component: ApplicationsPage });

const moneyWeight = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function today() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatDate(value: string) {
  return new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString("pt-BR");
}

function parseWeight(value: string) {
  const normalized = value.trim().replace(",", ".");
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function ApplicationsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [patients, setPatients] = useState<{ id: string; nome: string }[]>([]);
  const [applications, setApplications] = useState<PatientApplication[]>([]);
  const [patientId, setPatientId] = useState("");
  const [procedureName, setProcedureName] = useState("");
  const [weight, setWeight] = useState("");
  const [applicationDate, setApplicationDate] = useState(today);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [applicationToDelete, setApplicationToDelete] = useState<PatientApplication | null>(null);
  const [editingApplication, setEditingApplication] = useState<PatientApplication | null>(null);
  const [reportPreview, setReportPreview] = useState<DocumentPage[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setLoading(false); return; }
    let active = true;
    setLoading(true);
    void Promise.all([fetchApplicationPatients(user.id), fetchPatientApplications(user.id)]).then(([patientResult, applicationResult]) => {
      if (!active) return;
      if (patientResult.error || applicationResult.error) {
        setError(patientResult.error?.message ?? applicationResult.error?.message ?? "Não foi possível carregar os registros.");
      } else {
        setPatients((patientResult.data as { id: string; nome: string }[] | null) ?? []);
        setApplications((applicationResult.data as PatientApplication[] | null) ?? []);
      }
      setLoading(false);
    });
    return () => { active = false; };
  }, [authLoading, user]);

  const patientApplications = useMemo(() => applications.filter((application) => application.patient_id === patientId), [applications, patientId]);
  const orderedPatientApplications = useMemo(() => [...patientApplications].sort((first, second) => first.application_date.localeCompare(second.application_date) || first.created_at.localeCompare(second.created_at)), [patientApplications]);
  const firstApplication = orderedPatientApplications[0];
  const latestApplication = orderedPatientApplications.at(-1);
  const selectedPatientName = patients.find((patient) => patient.id === patientId)?.nome;
  const reportRows = useMemo(() => orderedPatientApplications.map((application, index) => ({ ...application, patientName: selectedPatientName ?? "", variation: index === 0 ? null : Number(application.current_weight_kg) - Number(orderedPatientApplications[index - 1]?.current_weight_kg ?? application.current_weight_kg) })), [orderedPatientApplications, selectedPatientName]);

  function openReport() {
    if (!selectedPatientName || !reportRows.length) { setError("Selecione uma paciente com aplicações registradas para gerar o relatório."); return; }
    setReportPreview(applicationReportPages(selectedPatientName, reportRows));
  }

  async function downloadReport() {
    if (!selectedPatientName || !reportRows.length) { setError("Selecione uma paciente com aplicações registradas para gerar o relatório."); return; }
    try {
      await downloadDocumentPdf(applicationReportPages(selectedPatientName, reportRows), applicationReportFilename(selectedPatientName), true);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Não foi possível gerar o relatório PDF.");
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) { setError("Sua sessão não está disponível. Entre novamente para continuar."); return; }
    const parsedWeight = parseWeight(weight);
    if (!patientId || !patients.some((patient) => patient.id === patientId)) { setError("Selecione uma paciente cadastrada."); return; }
    if (!procedureName.trim()) { setError("Informe o nome do procedimento."); return; }
    if (parsedWeight === null) { setError("Informe o peso em kg, usando vírgula para casas decimais. Ex.: 72,5"); return; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(applicationDate)) { setError("Informe uma data válida."); return; }

    setSaving(true);
    setError("");
    const input = { patient_id: patientId, procedure_name: procedureName.trim(), current_weight_kg: parsedWeight, application_date: applicationDate, notes: notes.trim() || null };
    const result = editingApplication
      ? await updatePatientApplication(user.id, editingApplication.id, input)
      : await createPatientApplication({ ...input, profissional_id: user.id });
    setSaving(false);
    if (result.error) { setError(result.error.message); return; }
    if (!result.data) { setError("Não foi possível salvar a aplicação."); return; }
    setApplications((current) => editingApplication
      ? current.map((application) => application.id === editingApplication.id ? result.data as PatientApplication : application)
      : [result.data as PatientApplication, ...current]);
    setEditingApplication(null);
    setProcedureName("");
    setWeight("");
    setNotes("");
  }

  function editApplication(application: PatientApplication) {
    setEditingApplication(application);
    setPatientId(application.patient_id);
    setProcedureName(application.procedure_name);
    setWeight(String(application.current_weight_kg).replace(".", ","));
    setApplicationDate(application.application_date.slice(0, 10));
    setNotes(application.notes ?? "");
    setError("");
    document.getElementById("new-application")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function cancelEdit() {
    setEditingApplication(null);
    setProcedureName("");
    setWeight("");
    setNotes("");
    setApplicationDate(today());
  }

  async function confirmDelete() {
    if (!user || !applicationToDelete) return;
    setDeleting(true);
    const result = await deletePatientApplication(user.id, applicationToDelete.id);
    setDeleting(false);
    if (result.error) { setError(result.error.message); return; }
    setApplications((current) => current.filter((application) => application.id !== applicationToDelete.id));
    setApplicationToDelete(null);
  }

  const weightDifference = firstApplication && latestApplication ? Number(latestApplication.current_weight_kg) - Number(firstApplication.current_weight_kg) : null;

  return <AdminLayout>
    <PageIntro eyebrow="Acompanhamento clínico" title="Aplicações das pacientes" description="Registre o procedimento realizado no dia e acompanhe o peso atual ao longo do tempo." action={<Button onClick={() => document.getElementById("new-application")?.scrollIntoView({ behavior: "smooth", block: "center" })} className="gap-2 bg-[#2f8f82] text-white hover:bg-[#26796e]"><Plus className="size-4" /> Nova aplicação</Button>} />
    <AdminNotice />
    {error && <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">Não foi possível concluir a operação: {error}</p>}
    {loading || authLoading ? <div className="flex min-h-48 items-center justify-center text-sm text-slate-500"><Loader2 className="mr-2 size-4 animate-spin" /> Carregando aplicações...</div> : !user ? <div className="mt-6"><EmptyState title="Sessão necessária" description="Entre na sua conta para registrar aplicações." /></div> : <>
      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <SectionCard title={editingApplication ? "Editar aplicação" : "Registrar procedimento"} className="h-fit" action={editingApplication ? <Button type="button" variant="ghost" size="icon" onClick={cancelEdit} aria-label="Cancelar edição"><X className="size-4" /></Button> : <Scale className="size-4 text-[#2f8f82]" />}>
          <form id="new-application" onSubmit={submit} className="grid gap-4">
            <div className="grid gap-2"><Label htmlFor="application-patient">Paciente *</Label><Select value={patientId} onValueChange={setPatientId}><SelectTrigger id="application-patient"><SelectValue placeholder="Selecione uma paciente cadastrada" /></SelectTrigger><SelectContent>{patients.map((patient) => <SelectItem key={patient.id} value={patient.id}>{patient.nome}</SelectItem>)}</SelectContent></Select></div>
            <div className="grid gap-2"><Label htmlFor="application-procedure">Nome do procedimento *</Label><Input id="application-procedure" value={procedureName} onChange={(event) => setProcedureName(event.target.value)} placeholder="Ex.: Aplicação" required /></div>
            <div className="grid gap-4 sm:grid-cols-2"><div className="grid gap-2"><Label htmlFor="application-weight">Peso atual (kg) *</Label><Input id="application-weight" inputMode="decimal" value={weight} onChange={(event) => setWeight(event.target.value)} placeholder="Ex.: 72,5" required /></div><div className="grid gap-2"><Label htmlFor="application-date">Data da aplicação *</Label><Input id="application-date" type="date" value={applicationDate} onChange={(event) => setApplicationDate(event.target.value)} required /></div></div>
            <div className="grid gap-2"><Label htmlFor="application-notes">Observações</Label><Textarea id="application-notes" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Opcional" rows={3} /></div>
            <div className="flex gap-2"><Button type="submit" disabled={saving || patients.length === 0} className="bg-[#2f8f82] text-white hover:bg-[#26796e]">{saving && <Loader2 className="mr-2 size-4 animate-spin" />}{editingApplication ? "Atualizar aplicação" : "Salvar aplicação"}</Button>{editingApplication && <Button type="button" variant="outline" onClick={cancelEdit}>Cancelar</Button>}</div>
            {patients.length === 0 && <p className="text-xs text-slate-500">Cadastre uma paciente antes de registrar uma aplicação.</p>}
          </form>
        </SectionCard>
        <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-1">{[{ label: "Paciente selecionada", value: selectedPatientName ?? "Nenhuma", note: selectedPatientName ? `${patientApplications.length} aplicação(ões) registrada(s)` : "Selecione uma paciente para ver o histórico" }, { label: "Peso inicial", value: firstApplication ? `${moneyWeight.format(Number(firstApplication.current_weight_kg))} kg` : "—", note: firstApplication ? formatDate(firstApplication.application_date) : "Sem registro" }, { label: "Peso atual", value: latestApplication ? `${moneyWeight.format(Number(latestApplication.current_weight_kg))} kg` : "—", note: latestApplication ? formatDate(latestApplication.application_date) : "Sem registro" }].map((metric) => <Card key={metric.label} className="border-slate-200/80 shadow-sm"><CardContent className="p-5"><p className="text-sm font-medium text-slate-500">{metric.label}</p><p className="mt-3 font-display text-2xl font-semibold text-slate-900">{metric.value}</p><p className="mt-2 text-xs text-slate-400">{metric.note}</p></CardContent></Card>)}{weightDifference !== null && <Card className="border-slate-200/80 shadow-sm"><CardContent className="p-5"><p className="text-sm font-medium text-slate-500">Variação desde o primeiro registro</p><p className={`mt-3 flex items-center gap-2 font-display text-2xl font-semibold ${weightDifference > 0 ? "text-amber-600" : weightDifference < 0 ? "text-[#2f8f82]" : "text-slate-900"}`}>{weightDifference > 0 ? <ArrowUp className="size-5" /> : weightDifference < 0 ? <ArrowDown className="size-5" /> : null}{weightDifference > 0 ? "+" : ""}{moneyWeight.format(weightDifference)} kg</p><p className="mt-2 text-xs text-slate-400">Último peso menos o primeiro peso</p></CardContent></Card>}</div>
      </div>
      <SectionCard title={selectedPatientName ? `Histórico de ${selectedPatientName}` : "Histórico de aplicações"} className="mt-6" action={<div className="flex items-center gap-2"><Button type="button" size="sm" variant="outline" onClick={openReport} disabled={!reportRows.length}><FileDown className="mr-2 size-4" /> Gerar PDF</Button><Button type="button" size="sm" variant="outline" onClick={() => void downloadReport()} disabled={!reportRows.length}><FileDown className="mr-2 size-4" /> Baixar PDF</Button><span className="hidden text-xs text-slate-400 sm:inline">{patientApplications.length} registro(s)</span></div>}>
        {!patientId ? <EmptyState title="Selecione uma paciente" description="Escolha uma paciente para visualizar todos os procedimentos e pesos registrados." /> : patientApplications.length === 0 ? <EmptyState title="Nenhuma aplicação registrada" description="Registre o primeiro procedimento e peso atual desta paciente." /> : <div className="overflow-x-auto"><table className="w-full min-w-[800px] text-left text-sm"><thead className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400"><tr><th className="pb-3 font-medium">Data</th><th className="pb-3 font-medium">Procedimento</th><th className="pb-3 font-medium">Peso atual</th><th className="pb-3 font-medium">Variação</th><th className="pb-3 font-medium">Observações</th><th className="pb-3 text-right font-medium">Ações</th></tr></thead><tbody className="divide-y divide-slate-100">{[...patientApplications].sort((first, second) => second.application_date.localeCompare(first.application_date) || second.created_at.localeCompare(first.created_at)).map((application) => <tr key={application.id} className="hover:bg-slate-50/70"><td className="py-4 text-slate-500"><span className="inline-flex items-center gap-2"><CalendarDays className="size-4 text-[#2f8f82]" />{formatDate(application.application_date)}</span></td><td className="py-4 font-medium text-slate-700">{application.procedure_name}</td><td className="py-4 font-semibold text-[#28786e]">{moneyWeight.format(Number(application.current_weight_kg))} kg</td><td className="py-4 text-sm font-medium text-slate-500">{(() => { const index = orderedPatientApplications.findIndex((item) => item.id === application.id); const previous = index > 0 ? orderedPatientApplications[index - 1] : null; const difference = previous ? Number(application.current_weight_kg) - Number(previous.current_weight_kg) : null; return difference === null ? "—" : `${difference > 0 ? "+" : ""}${moneyWeight.format(difference)} kg`; })()}</td><td className="max-w-xs truncate py-4 text-slate-500">{application.notes ?? "—"}</td><td className="py-4 text-right"><div className="flex justify-end gap-1"><Button type="button" variant="ghost" size="icon" className="text-[#2f8f82] hover:bg-[#e8f5f2] hover:text-[#26796e]" onClick={() => editApplication(application)} aria-label={`Editar aplicação de ${formatDate(application.application_date)}`}><Pencil className="size-4" /></Button><Button type="button" variant="ghost" size="icon" className="text-slate-400 hover:bg-red-50 hover:text-red-600" onClick={() => setApplicationToDelete(application)} aria-label={`Excluir aplicação de ${formatDate(application.application_date)}`}><Trash2 className="size-4" /></Button></div></td></tr>)}</tbody></table></div>}
      </SectionCard>
      <Dialog open={reportPreview.length > 0} onOpenChange={(open) => { if (!open) setReportPreview([]); }}><DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto"><DialogHeader><DialogTitle>Relatório de aplicações</DialogTitle><DialogDescription>Histórico de procedimentos e evolução do peso de {selectedPatientName ?? "paciente"}.</DialogDescription></DialogHeader><DocumentPreview pages={reportPreview} showBrand /></DialogContent></Dialog>
      <AlertDialog open={Boolean(applicationToDelete)} onOpenChange={(open) => { if (!open && !deleting) setApplicationToDelete(null); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Excluir aplicação?</AlertDialogTitle><AlertDialogDescription>Este registro será removido do histórico da paciente.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel><AlertDialogAction onClick={(event) => { event.preventDefault(); void confirmDelete(); }} disabled={deleting} className="bg-red-600 hover:bg-red-700">{deleting ? "Excluindo..." : "Excluir"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </>}
  </AdminLayout>;
}

export default ApplicationsPage;
