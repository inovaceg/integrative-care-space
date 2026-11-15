import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, Bell, CalendarPlus, CheckCircle2, CircleDollarSign, ClipboardCheck, ClipboardList, Clock3, FileClock, Loader2, Sparkles, UserRound, UsersRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { AdminLayout, DashboardCard, EmptyState, PageIntro, PatientAvatar, SectionCard, StatusBadge } from "@/components/admin/admin-ui";
import { DashboardCharts } from "@/components/admin/dashboard/dashboard-charts";
import { DashboardBirthdays } from "@/components/admin/dashboard/dashboard-birthdays";
import { DailyMotivation } from "@/components/admin/dashboard/daily-motivation";
import { DashboardNavigationCards } from "@/components/admin/dashboard/dashboard-navigation-cards";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fetchAppointments, fetchFinancialEntries, fetchPatients, type AppointmentRecord, type PatientRecord } from "@/lib/admin/records";
import type { FinancialEntry } from "@/lib/admin/types";
import { supabase } from "@/integrations/supabase/client";
import { AnimatedBanner } from "@/components/animated-banner";

export const Route = createFileRoute("/admin/dashboard")({ component: DashboardPage });
type Period = "30" | "90" | "365";
type CompletedAnamnesis = { paciente_id: string };
const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

function initials(name: string) { return name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "P"; }
function appointmentType(notes: string | null) { return notes?.match(/^\[([^\]]+)\]/)?.[1] ?? "Atendimento"; }
function monthKey(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`; }
function inRange(value: string, start: Date, end: Date) { const date = new Date(value); return date >= start && date < end; }
function activePatient(patient: PatientRecord) { return patient.status?.toLocaleLowerCase("pt-BR") !== "inativo"; }

function DashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [entries, setEntries] = useState<FinancialEntry[]>([]);
  const [completedAnamneses, setCompletedAnamneses] = useState<CompletedAnamnesis[]>([]);
  const [period, setPeriod] = useState<Period>("30");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setPatients([]); setAppointments([]); setEntries([]); setCompletedAnamneses([]); setLoading(false); return; }
    let mounted = true;
    setLoading(true);
    setError("");
    Promise.all([
      fetchPatients(user.id),
      fetchAppointments(user.id),
      fetchFinancialEntries(user.id),
      supabase.from("anamneses").select("paciente_id").eq("profissional_id", user.id).not("preenchido_em", "is", null),
    ]).then(([patientResult, appointmentResult, financeResult, anamnesisResult]) => {
      if (!mounted) return;
      const queryError = patientResult.error ?? appointmentResult.error ?? financeResult.error ?? anamnesisResult.error;
      if (queryError) setError(queryError.message);
      setPatients((patientResult.data as PatientRecord[] | null) ?? []);
      setAppointments((appointmentResult.data as AppointmentRecord[] | null) ?? []);
      setEntries((financeResult.data as FinancialEntry[] | null) ?? []);
      setCompletedAnamneses((anamnesisResult.data as CompletedAnamnesis[] | null) ?? []);
      setLoading(false);
    }).catch((queryError: unknown) => {
      if (!mounted) return;
      setError(queryError instanceof Error ? queryError.message : "Não foi possível carregar os dados do painel.");
      setLoading(false);
    });
    return () => { mounted = false; };
  }, [authLoading, user?.id]);

  const now = new Date();
  const range = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - Number(period) + 1);
    const end = new Date();
    end.setDate(end.getDate() + 1);
    end.setHours(0, 0, 0, 0);
    return { start, end };
  }, [period]);
  const rangeAppointments = useMemo(() => appointments.filter((item) => inRange(item.start_time, range.start, range.end)), [appointments, range]);
  const activePatients = useMemo(() => patients.filter(activePatient), [patients]);
  const inactivePatients = patients.length - activePatients.length;
  const completedPatientIds = useMemo(() => new Set(completedAnamneses.map((item) => item.paciente_id)), [completedAnamneses]);
  const pendingAnamneses = patients.filter((patient) => !completedPatientIds.has(patient.id));
  const upcoming = useMemo(() => appointments.filter((item) => (item.status === "pending" || item.status === "confirmed") && new Date(item.start_time) >= now).sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()).slice(0, 5), [appointments]);
  const todaysAppointments = appointments.filter((item) => new Date(item.start_time).toDateString() === now.toDateString());
  const thisMonthAppointments = appointments.filter((item) => monthKey(new Date(item.start_time)) === monthKey(now));
  const thisMonthEntries = entries.filter((item) => item.transaction_date.slice(0, 7) === monthKey(now));
  const monthRevenue = thisMonthEntries.filter((item) => item.transaction_type === "income" && (item.status === "received" || item.status === "paid")).reduce((total, item) => total + Number(item.amount), 0);
  const receivable = entries.filter((item) => item.transaction_type === "income" && item.status === "pending").reduce((total, item) => total + Number(item.amount), 0);
  const displayName = user?.user_metadata?.["full_name"] || user?.user_metadata?.["name"] || user?.email?.split("@")[0] || "Profissional";
  const currentHour = now.getHours();
  const greeting = currentHour < 12 ? "Bom dia" : currentHour < 18 ? "Boa tarde" : "Boa noite";
  const stats = [
    { label: "Total de pacientes", value: String(patients.length), trend: "Base clínica", tone: "teal" as const, note: "Pacientes vinculados à sua conta" },
    { label: "Pacientes ativos", value: String(activePatients.length), trend: "Em acompanhamento", tone: "blue" as const, note: "Status cadastrado como ativo" },
    { label: "Atendimentos de hoje", value: String(todaysAppointments.length), trend: "Hoje", tone: "amber" as const, note: "Todos os status na agenda" },
    { label: "Atendimentos do mês", value: String(thisMonthAppointments.length), trend: "Este mês", tone: "violet" as const, note: "Agendados, concluídos e cancelados" },
    { label: "Anamneses pendentes", value: String(pendingAnamneses.length), trend: "Revisar", tone: "amber" as const, note: "Pacientes sem ficha preenchida" },
    { label: "Evoluções pendentes", value: "—", trend: "Indisponível", tone: "blue" as const, note: "O sistema não possui registro de evolução clínica" },
    { label: "Receitas do mês", value: money.format(monthRevenue), trend: "Recebido", tone: "teal" as const, note: "Lançamentos financeiros recebidos/pagos" },
    { label: "Contas a receber", value: money.format(receivable), trend: "Pendente", tone: "violet" as const, note: "Receitas financeiras com status pendente" },
  ];

  return <AdminLayout>
    <PageIntro eyebrow="Painel clínico" title="Visão geral" description="Uma visão clara da rotina clínica, dos atendimentos e da saúde financeira." action={<div className="flex gap-2"><Button asChild variant="outline" className="border-slate-200 bg-white"><Link to="/admin/configuracoes"><UserRound className="mr-2 size-4" /> Perfil</Link></Button><Button asChild className="bg-[#176b62] text-white hover:bg-[#12584f]"><Link to="/admin/agenda"><CalendarPlus className="mr-2 size-4" /> Agenda</Link></Button></div>} />
    <AnimatedBanner compact className="mb-6 rounded-2xl border border-emerald-100 bg-gradient-to-r from-white to-[#eff7f4] shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-sm font-medium text-[#176b62]">{greeting}, {displayName}</p><h2 className="mt-1 font-display text-xl font-semibold text-slate-900">Sua clínica em perspectiva</h2><p className="mt-1 text-sm text-slate-500">{now.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>{user && <DailyMotivation />}</div><div className="flex items-center gap-2"><Select value={period} onValueChange={(value) => setPeriod(value as Period)}><SelectTrigger aria-label="Filtrar período" className="w-44 bg-white"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="30">Últimos 30 dias</SelectItem><SelectItem value="90">Últimos 90 dias</SelectItem><SelectItem value="365">Últimos 12 meses</SelectItem></SelectContent></Select><Button asChild size="icon" variant="outline" className="bg-white" aria-label="Ver agenda e notificações"><Link to="/admin/agenda"><Bell className="size-4" /></Link></Button></div></div>
    </AnimatedBanner>
    <DashboardNavigationCards />
    {error && <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">Não foi possível carregar todos os dados: {error}</p>}
    {loading || authLoading ? <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-white p-12 text-sm text-slate-500"><Loader2 className="mr-2 size-4 animate-spin" /> Carregando painel...</div> : <>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{stats.map((stat) => <DashboardCard key={stat.label} {...stat} />)}</div>
      <DashboardCharts appointments={rangeAppointments} entries={entries.filter((entry) => inRange(`${entry.transaction_date}T00:00:00`, range.start, range.end))} activePatients={activePatients.length} inactivePatients={inactivePatients} />
      <div className="mt-6 grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
        <SectionCard title="Próximos atendimentos" action={<Button asChild variant="ghost" size="sm" className="text-[#176b62]"><Link to="/admin/agenda">Abrir agenda <ArrowUpRight className="ml-1 size-3.5" /></Link></Button>}>
          {upcoming.length === 0 ? <EmptyState title="Agenda livre" description="Não há atendimentos futuros pendentes ou confirmados." action={<Button asChild variant="outline"><Link to="/admin/agenda">Organizar agenda</Link></Button>} /> : <div className="divide-y divide-slate-100">{upcoming.map((appointment) => { const patient = patients.find((item) => item.id === appointment.patient_id); const name = patient?.nome ?? "Paciente"; const date = new Date(appointment.start_time); return <div key={appointment.id} className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0"><div className="w-20 shrink-0"><p className="text-sm font-semibold text-slate-800">{date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}</p><p className="text-xs text-slate-500">{date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</p></div><PatientAvatar initials={initials(name)} /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-slate-800">{name}</p><p className="truncate text-xs text-slate-500">{appointmentType(appointment.notes)}</p></div><StatusBadge status={appointment.status} /><Button asChild variant="ghost" size="icon" aria-label={`Abrir cadastro de ${name}`}><Link to="/admin/pacientes/$id" params={{ id: appointment.patient_id }}><ArrowUpRight className="size-4" /></Link></Button></div>; })}</div>}
        </SectionCard>
        <SectionCard title="Central de pendências" action={<ClipboardCheck className="size-4 text-[#176b62]" />}>
          <div className="space-y-3">
            <PendingLink to="/admin/anamneses" icon={<ClipboardList className="size-4" />} title="Anamneses incompletas" count={pendingAnamneses.length} description="Pacientes sem anamnese concluída" />
            <PendingLink to="/admin/evolucao-corporal" icon={<FileClock className="size-4" />} title="Evoluções clínicas" count={null} description="Não há módulo de registro de evolução clínica" />
            <PendingLink to="/admin/financeiro" icon={<CircleDollarSign className="size-4" />} title="Pagamentos pendentes" count={entries.filter((item) => item.transaction_type === "income" && item.status === "pending").length} description={money.format(receivable)} />
            <PendingLink to="/admin/recibos" icon={<CheckCircle2 className="size-4" />} title="Documentos e consentimentos" count={null} description="Acompanhe recibos e documentos" />
          </div>
          <p className="mt-4 border-t border-slate-100 pt-3 text-xs leading-5 text-slate-400">A contagem de documentos e termos não está disponível nos dados dos módulos atuais.</p>
        </SectionCard>
      </div>
      <div className="mt-6 grid gap-5 xl:grid-cols-2">
        <Card className="overflow-hidden rounded-2xl border-[#d3e7e1] bg-gradient-to-br from-[#f2faf7] to-white shadow-sm"><CardContent className="p-6"><div className="flex items-start gap-4"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#176b62] text-white"><Sparkles className="size-5" /></span><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#176b62]">Assistente de organização</p><h2 className="mt-1 font-display text-lg font-semibold text-slate-900">Planeje com mais clareza</h2><p className="mt-2 text-sm leading-6 text-slate-600">Use os registros já disponíveis para preparar a rotina, identificar fichas a revisar e organizar os próximos atendimentos. Não envie dados identificáveis para ferramentas externas.</p><p className="mt-3 rounded-lg border border-[#d7e8e3] bg-white/80 p-3 text-xs leading-5 text-slate-500">Este painel não gera recomendações clínicas nem substitui avaliação profissional. Revise qualquer resumo ou plano antes de incorporá-lo ao prontuário.</p><Button asChild variant="outline" className="mt-4 border-[#b7d8ce] bg-white text-[#176b62]"><Link to="/admin/anamneses">Revisar registros <ArrowUpRight className="ml-2 size-4" /></Link></Button></div></div></CardContent></Card>
        <SectionCard title="Resumo da agenda"><div className="grid grid-cols-2 gap-4"><SummaryValue icon={<Clock3 className="size-4" />} label="No período selecionado" value={String(rangeAppointments.length)} /><SummaryValue icon={<CheckCircle2 className="size-4" />} label="Concluídos" value={String(rangeAppointments.filter((item) => item.status === "completed").length)} /><SummaryValue icon={<UsersRound className="size-4" />} label="Confirmações pendentes" value={String(rangeAppointments.filter((item) => item.status === "pending").length)} /><SummaryValue icon={<CalendarPlus className="size-4" />} label="Cancelamentos" value={String(rangeAppointments.filter((item) => item.status === "cancelled").length)} /></div><p className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-400">Horários disponíveis não são calculados: não há grade de disponibilidade cadastrada no sistema.</p></SectionCard>
      </div>
      <DashboardBirthdays />
      <Card className="mt-6 border-0 bg-[#123c3d] text-white shadow-sm"><CardContent className="flex flex-col items-start justify-between gap-4 p-5 sm:flex-row sm:items-center sm:p-6"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8bd5c4]">Acesso rápido</p><p className="mt-2 font-display text-lg font-medium">Mantenha sua rotina organizada</p><p className="mt-1 text-sm text-white/65">Acesse a agenda, os pacientes e os prontuários com rapidez.</p></div><Button asChild className="shrink-0 bg-[#8bd5c4] text-[#123c3d] hover:bg-[#a5e2d4]"><Link to="/admin/pacientes">Gerenciar pacientes</Link></Button></CardContent></Card>
    </>}
  </AdminLayout>;
}

function PendingLink({ to, icon, title, count, description }: { to: string; icon: React.ReactNode; title: string; count: number | null; description: string }) {
  return <Link to={to} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3 transition-colors hover:border-[#c6e1d9] hover:bg-[#f6faf8]"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#edf6f2] text-[#176b62]">{icon}</span><span className="min-w-0 flex-1"><span className="block text-sm font-medium text-slate-800">{title}</span><span className="block truncate text-xs text-slate-500">{description}</span></span><span className="rounded-full bg-[#eef5f2] px-2.5 py-1 text-sm font-semibold text-[#176b62]">{count ?? "—"}</span></Link>;
}

function SummaryValue({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="rounded-xl bg-[#f7f9f8] p-4"><div className="flex items-center gap-2 text-xs text-slate-500">{icon}{label}</div><p className="mt-2 font-display text-2xl font-semibold text-slate-900">{value}</p></div>;
}
