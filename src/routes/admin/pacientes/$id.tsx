import { createFileRoute, Link, useParams, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, CalendarPlus, FileText, Loader2, Mail, Phone, Save, ShieldCheck, Trash2 } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { AdminLayout, EmptyState, PageIntro, PatientAvatar, SectionCard, StatusBadge } from "@/components/admin/admin-ui";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { deletePatient, fetchAppointments, fetchPatient, updatePatient, type AppointmentRecord, type PatientInput, type PatientRecord } from "@/lib/admin/records";

export const Route = createFileRoute("/admin/pacientes/$id")({ component: PatientProfilePage });

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "P";
}

function PatientEditForm({ patient, onSaved }: { patient: PatientRecord; onSaved: (patient: PatientRecord) => void }) {
  const { user } = useAuth();
  const [form, setForm] = useState({ nome: patient.nome, data_nascimento: patient.data_nascimento ?? "", email: patient.email ?? "", telefone: patient.telefone ?? "", status: patient.status ?? "pendente", cpf: patient.cpf ?? "", nome_social: patient.nome_social ?? "", endereco: patient.endereco ?? "", numero: patient.numero ?? "", complemento: patient.complemento ?? "", cidade: patient.cidade ?? "", estado: patient.estado ?? "", cep: patient.cep ?? "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function update(field: keyof typeof form, value: string) { setForm((current) => ({ ...current, [field]: value })); }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    if (!user || !form.nome.trim()) { setError("Informe o nome completo do paciente."); return; }
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) { setError("Informe um e-mail válido."); return; }
    const { id: _id, profissional_id: _professionalId, ...patientFields } = patient;
    const input: PatientInput = { ...patientFields, ...form, nome: form.nome.trim(), data_nascimento: form.data_nascimento || null, email: form.email || null, telefone: form.telefone || null, status: form.status || null, cpf: form.cpf || null, nome_social: form.nome_social || null, endereco: form.endereco || null, numero: form.numero || null, complemento: form.complemento || null, cidade: form.cidade || null, estado: form.estado || null, cep: form.cep || null };
    setSaving(true);
    const { data, error: updateError } = await updatePatient(user.id, patient.id, input);
    setSaving(false);
    if (updateError || !data) { setError(updateError?.message ?? "Não foi possível atualizar o paciente."); return; }
    onSaved(data as PatientRecord);
  }

  return <form onSubmit={submit} className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="grid gap-2"><Label htmlFor="edit-patient-name">Nome completo *</Label><Input id="edit-patient-name" value={form.nome} onChange={(event) => update("nome", event.target.value)} required /></div><div className="grid gap-3 sm:grid-cols-2"><div className="grid gap-2"><Label htmlFor="edit-patient-birth">Data de nascimento</Label><Input id="edit-patient-birth" type="date" value={form.data_nascimento} onChange={(event) => update("data_nascimento", event.target.value)} /></div><div className="grid gap-2"><Label htmlFor="edit-patient-status">Status</Label><Select value={form.status} onValueChange={(value) => update("status", value)}><SelectTrigger id="edit-patient-status"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pendente">Pendente</SelectItem><SelectItem value="ativo">Ativo</SelectItem><SelectItem value="inativo">Inativo</SelectItem></SelectContent></Select></div></div><div className="grid gap-3 sm:grid-cols-2"><div className="grid gap-2"><Label htmlFor="edit-patient-email">E-mail</Label><Input id="edit-patient-email" type="email" value={form.email} onChange={(event) => update("email", event.target.value)} /></div><div className="grid gap-2"><Label htmlFor="edit-patient-phone">Telefone</Label><Input id="edit-patient-phone" value={form.telefone} onChange={(event) => update("telefone", event.target.value)} /></div></div><div className="grid gap-3 sm:grid-cols-2"><div className="grid gap-2"><Label htmlFor="edit-patient-cpf">CPF</Label><Input id="edit-patient-cpf" value={form.cpf} onChange={(event) => update("cpf", event.target.value)} /></div><div className="grid gap-2"><Label htmlFor="edit-patient-social-name">Nome social</Label><Input id="edit-patient-social-name" value={form.nome_social} onChange={(event) => update("nome_social", event.target.value)} /></div></div><div className="grid gap-3 sm:grid-cols-[1fr_120px]"><div className="grid gap-2"><Label htmlFor="edit-patient-address">Endereço</Label><Input id="edit-patient-address" value={form.endereco} onChange={(event) => update("endereco", event.target.value)} /></div><div className="grid gap-2"><Label htmlFor="edit-patient-number">Número</Label><Input id="edit-patient-number" value={form.numero} onChange={(event) => update("numero", event.target.value)} /></div></div><div className="grid gap-3 sm:grid-cols-3"><div className="grid gap-2"><Label htmlFor="edit-patient-city">Cidade</Label><Input id="edit-patient-city" value={form.cidade} onChange={(event) => update("cidade", event.target.value)} /></div><div className="grid gap-2"><Label htmlFor="edit-patient-state">Estado</Label><Input id="edit-patient-state" maxLength={2} value={form.estado} onChange={(event) => update("estado", event.target.value.toUpperCase())} /></div><div className="grid gap-2"><Label htmlFor="edit-patient-zip">CEP</Label><Input id="edit-patient-zip" value={form.cep} onChange={(event) => update("cep", event.target.value)} /></div></div>{error && <p role="alert" className="text-sm text-red-600">{error}</p>}<Button type="submit" disabled={saving} className="w-fit bg-[#2f8f82] hover:bg-[#26796e]">{saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />} Salvar alterações</Button></form>;
}

function PatientProfilePage() {
  const { id } = useParams({ from: "/admin/pacientes/$id" });
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [patient, setPatient] = useState<PatientRecord | null>(null);
  const [history, setHistory] = useState<AppointmentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);

  async function loadProfile() {
    if (!user) return;
    setLoading(true); setError("");
    const [{ data, error: patientError }, { data: appointments, error: appointmentsError }] = await Promise.all([fetchPatient(user.id, id), fetchAppointments(user.id)]);
    if (patientError || appointmentsError) setError(patientError?.message ?? appointmentsError?.message ?? "Não foi possível carregar o perfil.");
    setPatient((data as PatientRecord | null) ?? null);
    setHistory(((appointments as AppointmentRecord[] | null) ?? []).filter((appointment) => appointment.patient_id === id));
    setLoading(false);
  }

  useEffect(() => { if (!authLoading) void loadProfile(); }, [authLoading, user?.id, id]);

  async function removePatient() {
    if (!user || !patient || !window.confirm(`Excluir o cadastro de ${patient.nome}? Essa ação não pode ser desfeita.`)) return;
    setDeleting(true);
    const { error: deleteError } = await deletePatient(user.id, patient.id);
    setDeleting(false);
    if (deleteError) { setError(deleteError.message); return; }
    void navigate({ to: "/admin/pacientes" });
  }

  if (authLoading || loading) return <AdminLayout><div className="flex items-center justify-center rounded-xl border border-slate-200 bg-white p-12 text-sm text-slate-500"><Loader2 className="mr-2 size-4 animate-spin" /> Carregando perfil...</div></AdminLayout>;
  if (error && !patient) return <AdminLayout><p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p></AdminLayout>;
  if (!patient) return <AdminLayout><EmptyState title="Paciente não encontrado" description="Esse cadastro não existe ou não pertence ao seu espaço." action={<Button asChild variant="outline"><Link to="/admin/pacientes">Voltar para pacientes</Link></Button>} /></AdminLayout>;

  return <AdminLayout><div className="mb-5"><Link to="/admin/pacientes" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-[#2f8f82]"><ArrowLeft className="size-4" /> Voltar para pacientes</Link></div><PageIntro eyebrow="Perfil do paciente" title={patient.nome} description="Visualize e atualize os dados deste cadastro." action={<Button type="button" variant="outline" className="gap-2 border-red-200 text-red-600 hover:bg-red-50" onClick={() => void removePatient()} disabled={deleting}><Trash2 className="size-4" /> {deleting ? "Excluindo..." : "Excluir paciente"}</Button>} />{error && <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}<div className="grid gap-6 xl:grid-cols-[300px_1fr]"><Card className="h-fit border-slate-200/80 shadow-sm"><CardContent className="p-5"><div className="flex items-center gap-3"><PatientAvatar initials={initials(patient.nome)} className="size-14" /><div><h3 className="font-display font-semibold text-slate-800">{patient.nome}</h3><p className="mt-1 text-xs text-slate-500">{patient.data_nascimento ? new Date(`${patient.data_nascimento}T00:00:00`).toLocaleDateString("pt-BR") : "Data de nascimento não informada"}</p></div></div><div className="mt-6"><StatusBadge status={patient.status ?? "pendente"} /></div><div className="mt-6 space-y-4 border-t border-slate-100 pt-5 text-sm"><div className="flex items-start gap-3"><Phone className="mt-0.5 size-4 text-slate-400" /><div><p className="text-xs text-slate-400">Telefone</p><p className="mt-1 text-slate-700">{patient.telefone ?? "Não informado"}</p></div></div><div className="flex items-start gap-3"><Mail className="mt-0.5 size-4 text-slate-400" /><div><p className="text-xs text-slate-400">E-mail</p><p className="mt-1 break-all text-slate-700">{patient.email ?? "Não informado"}</p></div></div><div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 size-4 text-slate-400" /><div><p className="text-xs text-slate-400">Privacidade</p><p className="mt-1 text-xs leading-5 text-slate-500">Cadastro visível apenas nas operações autorizadas deste profissional.</p></div></div></div></CardContent></Card><div><Tabs defaultValue="overview"><TabsList className="h-auto flex-wrap justify-start gap-1 bg-white p-1"><TabsTrigger value="overview">Visão geral</TabsTrigger><TabsTrigger value="history">Histórico</TabsTrigger><TabsTrigger value="edit">Editar dados</TabsTrigger><TabsTrigger value="notes">Notas</TabsTrigger></TabsList><TabsContent value="overview"><div className="mt-4 grid gap-4 sm:grid-cols-2"><SectionCard title="Próximo atendimento"><p className="font-display text-xl font-semibold text-slate-800">{history.filter((item) => new Date(item.start_time) >= new Date()).sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())[0] ? new Date(history.filter((item) => new Date(item.start_time) >= new Date()).sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())[0]!.start_time).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "Nenhum agendado"}</p><p className="mt-2 text-sm text-slate-500">Atualizado diretamente pela agenda.</p></SectionCard><SectionCard title="Atendimentos registrados"><p className="font-display text-xl font-semibold text-slate-800">{history.length}</p><p className="mt-2 text-sm text-slate-500">Agendamentos deste paciente.</p></SectionCard></div></TabsContent><TabsContent value="history"><SectionCard title="Atendimentos recentes" className="mt-4">{history.length === 0 ? <p className="text-sm text-slate-500">Nenhum atendimento registrado.</p> : <div className="space-y-1">{history.map((item) => <div key={item.id} className="flex items-center justify-between gap-3 border-b border-slate-100 py-3 last:border-0"><div><p className="text-sm font-medium text-slate-700">{new Date(item.start_time).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</p><p className="mt-1 text-xs text-slate-400">{item.notes ?? "Sem observação"}</p></div><StatusBadge status={item.status} /></div>)}</div>}</SectionCard></TabsContent><TabsContent value="edit"><div className="mt-4"><PatientEditForm patient={patient} onSaved={(updated) => setPatient(updated)} /></div></TabsContent><TabsContent value="notes"><SectionCard title="Notas do acompanhamento" className="mt-4"><div className="flex items-start gap-3 rounded-lg bg-slate-50 p-4"><FileText className="mt-0.5 size-4 text-[#2f8f82]" /><p className="text-sm leading-6 text-slate-500">Nenhuma nota cadastrada para este paciente.</p></div></SectionCard></TabsContent></Tabs></div></div></AdminLayout>;
}
