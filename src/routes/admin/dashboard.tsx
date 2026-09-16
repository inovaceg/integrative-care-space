import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, CalendarPlus, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { AdminLayout, DashboardCard, EmptyState, PageIntro, PatientAvatar, SectionCard, StatusBadge } from "@/components/admin/admin-ui";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { fetchAppointments, fetchPatients, type AppointmentRecord, type PatientRecord } from "@/lib/admin/records";

export const Route = createFileRoute("/admin/dashboard")({ component: DashboardPage });

function initials(name: string) { return name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "P"; }
function appointmentType(notes: string | null) { return notes?.match(/^\[([^\]]+)\]/)?.[1] ?? "Atendimento"; }

function DashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user || authLoading) return;
    let mounted = true;
    setLoading(true); setError("");
    Promise.all([fetchPatients(user.id), fetchAppointments(user.id)]).then(([patientResult, appointmentResult]) => {
      if (!mounted) return;
      if (patientResult.error || appointmentResult.error) setError(patientResult.error?.message ?? appointmentResult.error?.message ?? "Não foi possível carregar o resumo.");
      setPatients((patientResult.data as PatientRecord[] | null) ?? []);
      setAppointments((appointmentResult.data as AppointmentRecord[] | null) ?? []);
      setLoading(false);
    });
    return () => { mounted = false; };
  }, [authLoading, user?.id]);

  const upcoming = useMemo(() => appointments.filter((appointment) => new Date(appointment.start_time) >= new Date() && appointment.status !== "cancelled").slice(0, 4), [appointments]);
  const pendingAppointments = useMemo(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    return appointments.filter((appointment) => {
      const amount = Number(appointment.amount_paid ?? 0);
      const hasPendingPayment = appointment.payment_status === "pending" || appointment.payment_status === "unpaid";
      return new Date(appointment.start_time) >= startOfToday && appointment.status !== "cancelled" && hasPendingPayment && amount > 0;
    });
  }, [appointments]);
  const pendingAppointmentsTotal = useMemo(() => pendingAppointments.reduce((total, appointment) => total + Number(appointment.amount_paid ?? 0), 0), [pendingAppointments]);
  const confirmedAppointments = useMemo(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    return appointments.filter((appointment) => {
      const amount = Number(appointment.amount_paid ?? 0);
      return new Date(appointment.start_time) >= startOfToday && appointment.status !== "cancelled" && appointment.status === "confirmed" && amount > 0;
    });
  }, [appointments]);
  const confirmedAppointmentsTotal = useMemo(() => confirmedAppointments.reduce((total, appointment) => total + Number(appointment.amount_paid ?? 0), 0), [confirmedAppointments]);
  const monthAppointments = useMemo(() => { const now = new Date(); return appointments.filter((appointment) => { const date = new Date(appointment.start_time); return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth(); }); }, [appointments]);
  const stats = [{ label: "Pacientes cadastrados", value: String(patients.length), trend: "Atualizado agora", tone: "teal" as const, note: "cadastros deste profissional" }, { label: "Atendimentos no mês", value: String(monthAppointments.length), trend: "Agenda real", tone: "blue" as const, note: "agendamentos registrados" }, { label: "Próximos atendimentos", value: String(upcoming.length), trend: "Próximos", tone: "amber" as const, note: "não cancelados" }, { label: "Agenda concluída", value: String(appointments.filter((appointment) => appointment.status === "completed").length), trend: "Total", tone: "violet" as const, note: "atendimentos concluídos" }];

  return <AdminLayout>
    <PageIntro eyebrow="Resumo do dia" title="Visão geral" description="Acompanhe os dados reais dos seus pacientes e atendimentos." action={<Button asChild variant="outline" className="gap-2 border-slate-200 bg-white"><Link to="/admin/agenda"><CalendarPlus className="size-4" /> Ver agenda</Link></Button>} />
    {error && <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">Não foi possível carregar o resumo: {error}</p>}
    {loading || authLoading ? <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-white p-12 text-sm text-slate-500"><Loader2 className="mr-2 size-4 animate-spin" /> Carregando resumo...</div> : <>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{stats.map((stat) => <DashboardCard key={stat.label} {...stat} />)}</div>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <DashboardCard label="A receber" value={pendingAppointmentsTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} trend="Não quitadas" tone="teal" note="Hoje e futuras, incluindo concluídas ainda não quitadas" />
        <DashboardCard label="Consultas confirmadas" value={confirmedAppointmentsTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} trend="Valor previsto" tone="blue" note="Hoje e futuras; uma consulta pode também estar em A receber" />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_.65fr]">
        <SectionCard title="Próximos atendimentos" action={<Button asChild variant="ghost" size="sm" className="text-[#2f8f82]"><Link to="/admin/agenda">Ver agenda <ArrowUpRight className="ml-1 size-3.5" /></Link></Button>}>
          {upcoming.length === 0 ? <EmptyState title="Nenhum próximo atendimento" description="Os novos agendamentos aparecerão aqui." /> : <div className="space-y-1">{upcoming.map((appointment) => { const patient = patients.find((item) => item.id === appointment.patient_id); const name = patient?.nome ?? "Paciente"; return <div key={appointment.id} className="flex items-center gap-3 rounded-lg px-2 py-3 hover:bg-slate-50"><div className="w-16 shrink-0 text-center"><p className="font-display text-sm font-semibold text-slate-800">{new Date(appointment.start_time).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</p><p className="text-[10px] text-slate-400">{new Date(appointment.start_time).toLocaleDateString("pt-BR")}</p></div><div className="h-10 w-1 rounded-full bg-[#7bc7b7]" /><PatientAvatar initials={initials(name)} /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-slate-800">{name}</p><p className="truncate text-xs text-slate-500">{appointmentType(appointment.notes)}</p></div><StatusBadge status={appointment.status} /></div>; })}</div>}
        </SectionCard>
        <SectionCard title="Pacientes recentes" action={<Button asChild variant="ghost" size="sm" className="text-[#2f8f82]"><Link to="/admin/pacientes">Ver todos <ArrowUpRight className="ml-1 size-3.5" /></Link></Button>}>
          {patients.length === 0 ? <EmptyState title="Nenhum paciente cadastrado" description="Cadastre um paciente para acompanhar sua base." action={<Button asChild className="bg-[#2f8f82] hover:bg-[#26796e]"><Link to="/admin/pacientes">Cadastrar paciente</Link></Button>} /> : <div className="space-y-4">{patients.slice(0, 4).map((patient) => <Link key={patient.id} to="/admin/pacientes/$id" params={{ id: patient.id }} className="flex items-center gap-3 rounded-lg p-1 hover:bg-slate-50"><PatientAvatar initials={initials(patient.nome)} /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-slate-800">{patient.nome}</p><p className="text-xs text-slate-500">{patient.email ?? patient.telefone ?? "Contato não informado"}</p></div><StatusBadge status={patient.status ?? "pendente"} /></Link>)}</div>}
        </SectionCard>
      </div>
      <SectionCard title="Lançamentos de hoje e futuros não quitados" className="mt-6">
        {pendingAppointments.length === 0 ? <EmptyState title="Nenhum lançamento de hoje ou futuro pendente" description="Não há consultas de hoje ou futuras não quitadas com valor previsto maior que zero." /> : <div className="space-y-2">{pendingAppointments.map((appointment) => { const patient = patients.find((item) => item.id === appointment.patient_id); const name = patient?.nome ?? "Paciente"; const date = new Date(appointment.start_time); const amount = Number(appointment.amount_paid ?? 0); return <div key={appointment.id} className="flex flex-col gap-3 rounded-lg border border-slate-100 px-3 py-3 sm:flex-row sm:items-center"><div className="w-28 shrink-0"><p className="text-sm font-semibold text-slate-800">{date.toLocaleDateString("pt-BR")}</p><p className="text-xs text-slate-500">às {date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</p></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-slate-800">{name}</p><p className="truncate text-xs text-slate-500">{appointmentType(appointment.notes)}</p></div><div className="flex items-center justify-between gap-3 sm:justify-end"><div className="text-right"><p className="text-sm font-semibold text-[#286a60]">{amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p><p className="text-[11px] text-slate-400">valor previsto</p></div><StatusBadge status={appointment.status} /></div></div>; })}</div>}
      </SectionCard>
      <Card className="mt-6 border-0 bg-[#123c3d] text-white shadow-sm"><CardContent className="flex flex-col items-start justify-between gap-4 p-5 sm:flex-row sm:items-center sm:p-6"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8bd5c4]">Acesso rápido</p><p className="mt-2 font-display text-lg font-medium">Mantenha sua rotina organizada</p><p className="mt-1 text-sm text-white/65">Consulte a agenda e registre pacientes no seu espaço.</p></div><Button asChild className="shrink-0 bg-[#8bd5c4] text-[#123c3d] hover:bg-[#a5e2d4]"><Link to="/admin/pacientes">Gerenciar pacientes</Link></Button></CardContent></Card>
    </>}
  </AdminLayout>;
}
