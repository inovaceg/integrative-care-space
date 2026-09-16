import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, Filter, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { AdminLayout, EmptyState, PageIntro, PatientAvatar, StatusBadge } from "@/components/admin/admin-ui";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createAppointment, deleteAppointment, fetchAppointments, fetchPatientOptions, updateAppointment, updateAppointmentStatus, type AppointmentRecord, type PatientOption } from "@/lib/admin/records";

export const Route = createFileRoute("/admin/agenda")({ component: AgendaPage });

type View = "Dia" | "Semana" | "Mês";
const statuses = [{ value: "pending", label: "Pendente" }, { value: "confirmed", label: "Confirmado" }, { value: "completed", label: "Concluído" }, { value: "cancelled", label: "Cancelado" }];

function localDateValue(date: Date) {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}
function localTimeValue(date: Date) { return date.toTimeString().slice(0, 5); }
function dateFromValue(value: string) { return new Date(`${value}T00:00:00`); }
function displayStatus(status: string) { return statuses.find((item) => item.value === status)?.label ?? status; }
function appointmentType(notes: string | null) { return notes?.match(/^\[([^\]]+)\]/)?.[1] ?? "Atendimento"; }
function appointmentNotes(notes: string | null) { return notes?.replace(/^\[[^\]]+\]\s*/, "") || "Sem observação"; }
function patientName(patients: PatientOption[], id: string) { return patients.find((patient) => patient.id === id)?.nome ?? "Paciente não encontrado"; }
function initials(name: string) { return name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "P"; }

function NewAppointmentDialog({ patients, onSaved }: { patients: PatientOption[]; onSaved: () => Promise<void> }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(localDateValue(new Date()));
  const [time, setTime] = useState("09:00");
  const [duration, setDuration] = useState("50");
  const [patientId, setPatientId] = useState("");
  const [type, setType] = useState("Consulta");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("pending");
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function reset() { setDate(localDateValue(new Date())); setTime("09:00"); setDuration("50"); setPatientId(""); setType("Consulta"); setNotes(""); setStatus("pending"); setAmount(""); setError(""); }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    const selectedPatient = patients.find((patient) => patient.id === patientId);
    const durationMinutes = Number(duration);
    const start = new Date(`${date}T${time}:00`);
    if (!user || !selectedPatient) { setError("Selecione um paciente cadastrado."); return; }
    if (!date || !time || !Number.isFinite(durationMinutes) || durationMinutes < 5 || Number.isNaN(start.getTime())) { setError("Informe uma data, horário e duração válidos."); return; }
    const end = new Date(start.getTime() + durationMinutes * 60000);
    const numericAmount = amount ? Number(amount.replace(",", ".")) : 0;
    if (amount && (!Number.isFinite(numericAmount) || numericAmount < 0)) { setError("Informe um valor válido."); return; }
    setSaving(true);
    const { error: insertError } = await createAppointment(user.id, { patient_id: selectedPatient.id, start_time: start.toISOString(), end_time: end.toISOString(), status, notes: `[${type.trim() || "Consulta"}] ${notes.trim()}`.trim(), payment_status: "pending", amount_paid: numericAmount, payment_date: null, due_date: null });
    setSaving(false);
    if (insertError) { setError(insertError.message); return; }
    setOpen(false); reset(); await onSaved();
  }

  return <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (next) reset(); }}><DialogTrigger asChild><Button className="gap-2 bg-[#2f8f82] text-white hover:bg-[#26796e]"><Plus className="size-4" /> Novo agendamento</Button></DialogTrigger><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>Novo agendamento</DialogTitle><DialogDescription>Escolha um paciente já cadastrado e informe os detalhes do atendimento.</DialogDescription></DialogHeader>{patients.length === 0 ? <EmptyState title="Cadastre um paciente primeiro" description="O agendamento só pode ser vinculado a pacientes do seu cadastro." /> : <form onSubmit={submit} className="grid gap-4 py-2"><div className="grid gap-2"><Label htmlFor="appointment-patient">Paciente *</Label><Select value={patientId} onValueChange={setPatientId}><SelectTrigger id="appointment-patient"><SelectValue placeholder="Selecione um paciente" /></SelectTrigger><SelectContent>{patients.map((patient) => <SelectItem key={patient.id} value={patient.id}>{patient.nome}</SelectItem>)}</SelectContent></Select></div><div className="grid gap-3 sm:grid-cols-3"><div className="grid gap-2"><Label htmlFor="appointment-date">Data *</Label><Input id="appointment-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} required /></div><div className="grid gap-2"><Label htmlFor="appointment-time">Horário *</Label><Input id="appointment-time" type="time" value={time} onChange={(event) => setTime(event.target.value)} required /></div><div className="grid gap-2"><Label htmlFor="appointment-duration">Duração (min) *</Label><Input id="appointment-duration" type="number" min="5" step="5" value={duration} onChange={(event) => setDuration(event.target.value)} required /></div></div><div className="grid gap-3 sm:grid-cols-2"><div className="grid gap-2"><Label htmlFor="appointment-type">Tipo</Label><Input id="appointment-type" value={type} onChange={(event) => setType(event.target.value)} placeholder="Ex.: Consulta" /></div><div className="grid gap-2"><Label htmlFor="appointment-status">Status</Label><Select value={status} onValueChange={setStatus}><SelectTrigger id="appointment-status"><SelectValue /></SelectTrigger><SelectContent>{statuses.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select></div></div><div className="grid gap-2"><Label htmlFor="appointment-notes">Observação</Label><Textarea id="appointment-notes" value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} /></div><div className="grid gap-2"><Label htmlFor="appointment-amount">Valor previsto (R$)</Label><Input id="appointment-amount" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0,00" /></div>{error && <p role="alert" className="text-sm text-red-600">{error}</p>}<DialogFooter><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button type="submit" disabled={saving} className="bg-[#2f8f82] hover:bg-[#26796e]">{saving && <Loader2 className="mr-2 size-4 animate-spin" />} Salvar agendamento</Button></DialogFooter></form>}</DialogContent></Dialog>;
}

function EditAppointmentDialog({ appointment, patients, onSaved }: { appointment: AppointmentRecord; patients: PatientOption[]; onSaved: (updated: AppointmentRecord) => void }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState("");
  const [patientId, setPatientId] = useState("");
  const [type, setType] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("");
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function reset() {
    const start = new Date(appointment.start_time);
    const end = appointment.end_time ? new Date(appointment.end_time) : null;
    const durationMinutes = end ? Math.max(5, Math.round((end.getTime() - start.getTime()) / 60000)) : 50;
    setDate(localDateValue(start));
    setTime(localTimeValue(start));
    setDuration(String(durationMinutes));
    setPatientId(appointment.patient_id);
    setType(appointmentType(appointment.notes));
    setNotes(appointment.notes?.replace(/^\[[^\]]+\]\s*/, "") ?? "");
    setStatus(appointment.status);
    setAmount(appointment.amount_paid == null ? "" : String(appointment.amount_paid));
    setError("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    const selectedPatient = patients.find((patient) => patient.id === patientId);
    const durationMinutes = Number(duration);
    const start = new Date(`${date}T${time}:00`);
    if (!user || !selectedPatient) { setError("Selecione um paciente cadastrado."); return; }
    if (!date || !time || !Number.isFinite(durationMinutes) || durationMinutes < 5 || Number.isNaN(start.getTime())) { setError("Informe uma data, horário e duração válidos."); return; }
    const end = new Date(start.getTime() + durationMinutes * 60000);
    const numericAmount = amount ? Number(amount.replace(",", ".")) : 0;
    if (amount && (!Number.isFinite(numericAmount) || numericAmount < 0)) { setError("Informe um valor válido."); return; }
    setSaving(true);
    const { data: updatedAppointment, error: updateError } = await updateAppointment(user.id, appointment.id, { patient_id: selectedPatient.id, start_time: start.toISOString(), end_time: end.toISOString(), status, notes: `[${type.trim() || "Consulta"}] ${notes.trim()}`.trim(), amount_paid: numericAmount });
    setSaving(false);
    if (updateError || !updatedAppointment) { setError(updateError?.message ?? "Não foi possível atualizar o agendamento."); return; }
    setOpen(false); onSaved(updatedAppointment as AppointmentRecord);
  }

  return <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (next) reset(); }}><DialogTrigger asChild><Button type="button" variant="outline" className="h-8 gap-1.5 border-slate-200 px-2.5 text-xs"><Pencil className="size-3.5" /> Editar</Button></DialogTrigger><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>Editar agendamento</DialogTitle><DialogDescription>Atualize os dados deste atendimento.</DialogDescription></DialogHeader>{patients.length === 0 ? <EmptyState title="Cadastre um paciente primeiro" description="O agendamento só pode ser vinculado a pacientes do seu cadastro." /> : <form onSubmit={submit} className="grid gap-4 py-2"><div className="grid gap-2"><Label htmlFor={`appointment-edit-${appointment.id}-patient`}>Paciente *</Label><Select value={patientId} onValueChange={setPatientId}><SelectTrigger id={`appointment-edit-${appointment.id}-patient`}><SelectValue placeholder="Selecione um paciente" /></SelectTrigger><SelectContent>{patients.map((patient) => <SelectItem key={patient.id} value={patient.id}>{patient.nome}</SelectItem>)}</SelectContent></Select></div><div className="grid gap-3 sm:grid-cols-3"><div className="grid gap-2"><Label htmlFor={`appointment-edit-${appointment.id}-date`}>Data *</Label><Input id={`appointment-edit-${appointment.id}-date`} type="date" value={date} onChange={(event) => setDate(event.target.value)} required /></div><div className="grid gap-2"><Label htmlFor={`appointment-edit-${appointment.id}-time`}>Horário *</Label><Input id={`appointment-edit-${appointment.id}-time`} type="time" value={time} onChange={(event) => setTime(event.target.value)} required /></div><div className="grid gap-2"><Label htmlFor={`appointment-edit-${appointment.id}-duration`}>Duração (min) *</Label><Input id={`appointment-edit-${appointment.id}-duration`} type="number" min="5" step="5" value={duration} onChange={(event) => setDuration(event.target.value)} required /></div></div><div className="grid gap-3 sm:grid-cols-2"><div className="grid gap-2"><Label htmlFor={`appointment-edit-${appointment.id}-type`}>Tipo</Label><Input id={`appointment-edit-${appointment.id}-type`} value={type} onChange={(event) => setType(event.target.value)} placeholder="Ex.: Consulta" /></div><div className="grid gap-2"><Label htmlFor={`appointment-edit-${appointment.id}-status`}>Status</Label><Select value={status} onValueChange={setStatus}><SelectTrigger id={`appointment-edit-${appointment.id}-status`}><SelectValue /></SelectTrigger><SelectContent>{statuses.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select></div></div><div className="grid gap-2"><Label htmlFor={`appointment-edit-${appointment.id}-notes`}>Observação</Label><Textarea id={`appointment-edit-${appointment.id}-notes`} value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} /></div><div className="grid gap-2"><Label htmlFor={`appointment-edit-${appointment.id}-amount`}>Valor previsto (R$)</Label><Input id={`appointment-edit-${appointment.id}-amount`} inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0,00" /></div>{error && <p role="alert" className="text-sm text-red-600">{error}</p>}<DialogFooter><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button type="submit" disabled={saving} className="bg-[#2f8f82] hover:bg-[#26796e]">{saving && <Loader2 className="mr-2 size-4 animate-spin" />} Salvar alterações</Button></DialogFooter></form>}</DialogContent></Dialog>;
}

function AgendaPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [view, setView] = useState<View>("Dia");
  const [selectedDate, setSelectedDate] = useState(localDateValue(new Date()));
  const [patientFilter, setPatientFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mutating, setMutating] = useState("");

  async function loadData() {
    if (!user) return;
    setLoading(true); setError("");
    const [{ data: patientData, error: patientError }, { data: appointmentData, error: appointmentError }] = await Promise.all([fetchPatientOptions(user.id), fetchAppointments(user.id)]);
    if (patientError || appointmentError) setError(patientError?.message ?? appointmentError?.message ?? "Não foi possível carregar a agenda.");
    setPatients((patientData as PatientOption[] | null) ?? []);
    setAppointments((appointmentData as AppointmentRecord[] | null) ?? []);
    setLoading(false);
  }
  useEffect(() => { if (!authLoading) void loadData(); }, [authLoading, user?.id]);

  const range = useMemo(() => {
    const base = dateFromValue(selectedDate);
    if (view === "Dia") return { start: base, end: new Date(base.getTime() + 86400000) };
    if (view === "Semana") { const start = new Date(base); start.setDate(base.getDate() - base.getDay()); const end = new Date(start); end.setDate(start.getDate() + 7); return { start, end }; }
    const start = new Date(base.getFullYear(), base.getMonth(), 1); const end = new Date(base.getFullYear(), base.getMonth() + 1, 1); return { start, end };
  }, [selectedDate, view]);
  const visibleAppointments = useMemo(() => appointments.filter((appointment) => { const date = new Date(appointment.start_time); return date >= range.start && date < range.end && (patientFilter === "all" || appointment.patient_id === patientFilter) && (typeFilter === "all" || appointmentType(appointment.notes) === typeFilter) && (statusFilter === "all" || appointment.status === statusFilter); }), [appointments, range, patientFilter, typeFilter, statusFilter]);
  const types = useMemo(() => Array.from(new Set(appointments.map((appointment) => appointmentType(appointment.notes)))), [appointments]);

  function movePeriod(direction: number) { const date = dateFromValue(selectedDate); if (view === "Dia") date.setDate(date.getDate() + direction); else if (view === "Semana") date.setDate(date.getDate() + direction * 7); else date.setMonth(date.getMonth() + direction); setSelectedDate(localDateValue(date)); }
  async function changeStatus(appointment: AppointmentRecord, status: string) { if (!user) return; setMutating(appointment.id); const { error: updateError } = await updateAppointmentStatus(user.id, appointment.id, status); setMutating(""); if (updateError) setError(updateError.message); else setAppointments((current) => current.map((item) => item.id === appointment.id ? { ...item, status } : item)); }
  async function remove(appointment: AppointmentRecord) { if (!user || !window.confirm("Excluir este agendamento? Essa ação não pode ser desfeita.")) return; setMutating(appointment.id); const { error: deleteError } = await deleteAppointment(user.id, appointment.id); setMutating(""); if (deleteError) setError(deleteError.message); else setAppointments((current) => current.filter((item) => item.id !== appointment.id)); }

  return <AdminLayout><PageIntro eyebrow="Organização" title="Agenda" description="Visualize seus horários e mantenha cada atendimento sob controle." action={<NewAppointmentDialog patients={patients} onSaved={loadData} />} />{error && <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}<div className="mt-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div className="flex w-fit rounded-lg border border-slate-200 bg-white p-1 shadow-sm">{(["Dia", "Semana", "Mês"] as const).map((item) => <button type="button" key={item} onClick={() => setView(item)} className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${view === item ? "bg-[#e3f3ef] text-[#216d64]" : "text-slate-500 hover:text-slate-800"}`} aria-pressed={view === item}>{item}</button>)}</div><div className="flex items-center gap-2"><Button variant="outline" size="icon" className="border-slate-200 bg-white" onClick={() => movePeriod(-1)} aria-label="Período anterior"><ChevronLeft className="size-4" /></Button><Button variant="outline" className="gap-2 border-slate-200 bg-white"><CalendarDays className="size-4 text-[#2f8f82]" />{view === "Mês" ? dateFromValue(selectedDate).toLocaleDateString("pt-BR", { month: "long", year: "numeric" }) : dateFromValue(selectedDate).toLocaleDateString("pt-BR")}</Button><Button variant="outline" size="icon" className="border-slate-200 bg-white" onClick={() => movePeriod(1)} aria-label="Próximo período"><ChevronRight className="size-4" /></Button></div></div><div className="mt-5 grid gap-6 xl:grid-cols-[1fr_280px]"><Card className="border-slate-200/80 shadow-sm"><CardContent className="p-0"><div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4"><div><h3 className="font-display font-semibold text-slate-800">{view === "Dia" ? dateFromValue(selectedDate).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" }) : `Atendimentos da ${view.toLowerCase()}`}</h3><p className="mt-1 text-xs text-slate-400">{visibleAppointments.length} atendimento(s) no período</p></div><div className="grid gap-2 sm:grid-cols-3"><Select value={patientFilter} onValueChange={setPatientFilter}><SelectTrigger className="h-9 border-slate-200 bg-white text-xs"><Filter className="mr-1 size-3.5" /><SelectValue placeholder="Paciente" /></SelectTrigger><SelectContent><SelectItem value="all">Todos os pacientes</SelectItem>{patients.map((patient) => <SelectItem key={patient.id} value={patient.id}>{patient.nome}</SelectItem>)}</SelectContent></Select><Select value={typeFilter} onValueChange={setTypeFilter}><SelectTrigger className="h-9 border-slate-200 bg-white text-xs"><SelectValue placeholder="Tipo" /></SelectTrigger><SelectContent><SelectItem value="all">Todos os tipos</SelectItem>{types.map((type) => <SelectItem key={type} value={type}>{type}</SelectItem>)}</SelectContent></Select><Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="h-9 border-slate-200 bg-white text-xs"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">Todos os status</SelectItem>{statuses.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select></div></div>{loading || authLoading ? <div className="flex items-center justify-center p-12 text-sm text-slate-500"><Loader2 className="mr-2 size-4 animate-spin" /> Carregando agenda...</div> : visibleAppointments.length === 0 ? <div className="p-5"><EmptyState title={appointments.length ? "Nenhum atendimento neste período" : "Agenda vazia"} description={appointments.length ? "Ajuste o período ou os filtros para visualizar outros atendimentos." : "Crie um agendamento para começar a organizar sua agenda."} action={!appointments.length ? <NewAppointmentDialog patients={patients} onSaved={loadData} /> : undefined} /></div> : <div className="divide-y divide-slate-100">{visibleAppointments.map((appointment) => { const name = patientName(patients, appointment.patient_id); return <div key={appointment.id} className="grid gap-3 px-5 py-5 sm:grid-cols-[88px_1fr_auto] sm:items-center"><div><p className="font-display text-sm font-semibold text-slate-800">{new Date(appointment.start_time).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</p><p className="mt-1 text-[11px] text-slate-400">{appointment.end_time ? `${Math.max(1, Math.round((new Date(appointment.end_time).getTime() - new Date(appointment.start_time).getTime()) / 60000))} min` : "Horário"}</p></div><div className="flex min-w-0 items-center gap-3"><PatientAvatar initials={initials(name)} /><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-800">{name}</p><p className="truncate text-xs text-slate-500">{appointmentType(appointment.notes)} · {appointmentNotes(appointment.notes)}</p>{view !== "Dia" && <p className="mt-1 text-[11px] text-slate-400">{new Date(appointment.start_time).toLocaleDateString("pt-BR")}</p>}</div></div><div className="flex items-center justify-between gap-2 sm:justify-end"><Select value={appointment.status} onValueChange={(value) => void changeStatus(appointment, value)} disabled={mutating === appointment.id}><SelectTrigger className="h-8 w-[128px] border-slate-200 text-xs"><SelectValue>{displayStatus(appointment.status)}</SelectValue></SelectTrigger><SelectContent>{statuses.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select><EditAppointmentDialog appointment={appointment} patients={patients} onSaved={(updated) => setAppointments((current) => current.map((item) => item.id === updated.id ? updated : item))} /><Button type="button" variant="ghost" size="icon" className="text-red-500 hover:bg-red-50 hover:text-red-600" onClick={() => void remove(appointment)} disabled={mutating === appointment.id} aria-label="Excluir agendamento"><Trash2 className="size-4" /></Button></div></div>; })}</div>}</CardContent></Card><Card className="h-fit border-slate-200/80 shadow-sm"><CardContent className="p-5"><div className="flex items-center gap-2 text-[#2f8f82]"><Clock3 className="size-4" /><h3 className="font-display text-sm font-semibold text-slate-800">Resumo do período</h3></div><div className="mt-5 space-y-4"><div><p className="text-xs text-slate-500">Atendimentos visíveis</p><p className="mt-1 font-display text-lg font-semibold text-slate-800">{visibleAppointments.length}</p></div><div><p className="text-xs text-slate-500">Confirmados</p><p className="mt-1 font-display text-lg font-semibold text-slate-800">{visibleAppointments.filter((item) => item.status === "confirmed").length}</p></div><div className="border-t border-slate-100 pt-4"><p className="text-xs leading-5 text-slate-400">Navegue entre dia, semana e mês para consultar os agendamentos registrados.</p></div></div></CardContent></Card></div></AdminLayout>;
}
