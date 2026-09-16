import { createFileRoute } from "@tanstack/react-router";
import { BarChart3, Clock3, Download, Loader2, TrendingUp, UsersRound, Wallet } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { AdminLayout, AdminNotice, EmptyState, PageIntro, SectionCard } from "@/components/admin/admin-ui";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fetchAppointments, fetchFinancialEntries, fetchPatients, type AppointmentRecord, type PatientRecord } from "@/lib/admin/records";
import type { FinancialEntry } from "@/lib/admin/types";

export const Route = createFileRoute("/admin/relatorios")({ component: ReportsPage });

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const areaColors = ["bg-[#2f8f82]", "bg-[#d7ad57]", "bg-[#6e9bc8]", "bg-[#a783bc]"];

type ReportMonth = { key: string; label: string; value: number };

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function reportMonths(length: number) {
  const current = new Date();
  current.setDate(1);
  return Array.from({ length }, (_, index) => {
    const date = new Date(current);
    date.setMonth(current.getMonth() - (length - index - 1));
    return { key: monthKey(date), label: date.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "") };
  });
}

function appointmentType(notes: string | null) {
  return notes?.match(/^\[([^\]]+)\]/)?.[1]?.trim() || "Atendimento";
}

function ReportsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [periodLength, setPeriodLength] = useState(6);
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [entries, setEntries] = useState<FinancialEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    const requestedUserId = user?.id;

    setError("");
    setPatients([]);
    setAppointments([]);
    setEntries([]);

    if (authLoading) {
      setLoading(true);
      return () => { mounted = false; };
    }

    if (!requestedUserId) {
      setLoading(false);
      return () => { mounted = false; };
    }

    setLoading(true);
    void Promise.all([fetchPatients(requestedUserId), fetchAppointments(requestedUserId), fetchFinancialEntries(requestedUserId)])
      .then(([patientResult, appointmentResult, financialResult]) => {
        if (!mounted) return;
        const queryError = patientResult.error ?? appointmentResult.error ?? financialResult.error;
        if (queryError) setError(queryError.message);
        setPatients((patientResult.data as PatientRecord[] | null) ?? []);
        setAppointments((appointmentResult.data as AppointmentRecord[] | null) ?? []);
        setEntries((financialResult.data as FinancialEntry[] | null) ?? []);
        setLoading(false);
      })
      .catch((queryError: unknown) => {
        if (!mounted) return;
        setError(queryError instanceof Error ? queryError.message : "Não foi possível carregar os relatórios.");
        setLoading(false);
      });

    return () => { mounted = false; };
  }, [authLoading, user?.id]);

  const months = useMemo(() => reportMonths(periodLength), [periodLength]);
  const monthKeys = useMemo(() => new Set(months.map((month) => month.key)), [months]);
  const revenueByMonth = useMemo<ReportMonth[]>(() => months.map((month) => ({
    ...month,
    value: entries
      .filter((entry) => entry.transaction_type === "income" && entry.transaction_date.slice(0, 7) === month.key)
      .reduce((total, entry) => total + Number(entry.amount), 0),
  })), [entries, months]);
  const maxRevenue = Math.max(...revenueByMonth.map((month) => month.value), 0);
  const currentRevenue = revenueByMonth.at(-1)?.value ?? 0;
  const previousRevenue = revenueByMonth.at(-2)?.value ?? 0;
  const growth = previousRevenue === 0 ? null : ((currentRevenue - previousRevenue) / previousRevenue) * 100;
  const growthValue = growth === null ? (currentRevenue === 0 ? "0,0%" : "—") : `${growth >= 0 ? "+" : ""}${growth.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
  const growthNote = growth === null && currentRevenue > 0 ? "sem base no mês anterior" : "comparado ao mês anterior";
  const receivedAppointments = useMemo(() => appointments.filter((appointment) => {
    const amount = Number(appointment.amount_paid ?? 0);
    return appointment.status !== "cancelled" && appointment.status === "confirmed" && amount > 0 && monthKeys.has(monthKey(new Date(appointment.start_time)));
  }), [appointments, monthKeys]);
  const pendingAppointments = useMemo(() => appointments.filter((appointment) => {
    const amount = Number(appointment.amount_paid ?? 0);
    return appointment.status !== "cancelled" && appointment.status === "pending" && amount > 0 && monthKeys.has(monthKey(new Date(appointment.start_time)));
  }), [appointments, monthKeys]);
  const totalReceived = receivedAppointments.reduce((total, appointment) => total + Number(appointment.amount_paid ?? 0), 0);
  const totalPending = pendingAppointments.reduce((total, appointment) => total + Number(appointment.amount_paid ?? 0), 0);
  const receivedNote = `${receivedAppointments.length} agendamento${receivedAppointments.length === 1 ? "" : "s"} no período`;
  const pendingNote = `${pendingAppointments.length} agendamento${pendingAppointments.length === 1 ? "" : "s"} no período`;

  const newPatients = useMemo(() => patients.filter((patient) => {
    if (!patient.created_at) return false;
    return monthKeys.has(monthKey(new Date(patient.created_at)));
  }).length, [monthKeys, patients]);

  const areas = useMemo(() => {
    const counts = new Map<string, number>();
    appointments.forEach((appointment) => {
      if (!monthKeys.has(monthKey(new Date(appointment.start_time)))) return;
      const type = appointmentType(appointment.notes);
      counts.set(type, (counts.get(type) ?? 0) + 1);
    });
    const total = Array.from(counts.values()).reduce((sum, count) => sum + count, 0);
    return Array.from(counts, ([label, count], index) => ({ label, percentage: total ? (count / total) * 100 : 0, color: areaColors[index % areaColors.length] ?? "bg-[#2f8f82]" })).sort((first, second) => second.percentage - first.percentage);
  }, [appointments, monthKeys]);

  return <AdminLayout><PageIntro eyebrow="Acompanhamento" title="Relatórios" description="Indicadores visuais para apoiar a gestão do seu espaço." action={<Button variant="outline" className="gap-2 border-slate-200 bg-white"><Download className="size-4" /> Exportar resumo</Button>} /><AdminNotice />{error && <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">Não foi possível carregar os relatórios: {error}</p>}<div className="mt-6 flex justify-end"><Select value={String(periodLength)} onValueChange={(value) => setPeriodLength(Number(value))}><SelectTrigger className="w-full border-slate-200 bg-white sm:w-[180px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="6">Últimos 6 meses</SelectItem><SelectItem value="12">Últimos 12 meses</SelectItem></SelectContent></Select></div>{loading || authLoading ? <div className="mt-4 flex min-h-64 items-center justify-center rounded-xl border border-slate-200 bg-white text-sm text-slate-500"><Loader2 className="mr-2 size-4 animate-spin" /> Carregando relatórios...</div> : <div className="mt-4 grid gap-6 xl:grid-cols-[1.3fr_.7fr]"><Card className="border-slate-200/80 shadow-sm"><CardHeader className="flex-row items-start justify-between space-y-0"><div><CardTitle className="font-display text-base text-slate-800">Receita por mês</CardTitle><p className="mt-1 text-xs text-slate-500">Receitas reais no período selecionado</p></div><BarChart3 className="size-5 text-[#2f8f82]" /></CardHeader><CardContent>{maxRevenue === 0 ? <EmptyState title="Nenhuma receita no período" description="Os lançamentos financeiros do tipo receita aparecerão aqui." /> : <div className="flex h-64 items-end gap-3 border-b border-l border-slate-100 px-2 pb-0 pt-5 sm:gap-6">{revenueByMonth.map((item) => <div key={item.key} className="flex h-full flex-1 flex-col items-center justify-end gap-2"><div className="relative w-full max-w-12 rounded-t-md bg-[#72c7b5] transition-all hover:bg-[#2f8f82]" style={{ height: `${item.value > 0 ? Math.max((item.value / maxRevenue) * 86, 4) : 0}%` }} title={`${item.label}: ${money.format(item.value)}`} /><span className="text-[11px] text-slate-400">{item.label}</span></div>)}</div>}</CardContent></Card><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1"><ReportMetric icon={<Wallet className="size-5" />} label="Total recebido" value={money.format(totalReceived)} note={receivedNote} /><ReportMetric icon={<Clock3 className="size-5" />} label="Valores a receber" value={money.format(totalPending)} note={pendingNote} /><ReportMetric icon={<TrendingUp className="size-5" />} label="Crescimento mensal" value={growthValue} note={growthNote} /><ReportMetric icon={<UsersRound className="size-5" />} label="Novos pacientes" value={String(newPatients)} note="no período selecionado" /><SectionCard title="Áreas de atendimento"><div className="space-y-4">{areas.length === 0 ? <EmptyState title="Nenhum atendimento no período" description="Os tipos dos agendamentos aparecerão aqui." /> : areas.map((area) => <ProgressLine key={area.label} label={area.label} value={area.percentage} color={area.color} />)}</div></SectionCard></div></div>}</AdminLayout>;
}

function ReportMetric({ icon, label, value, note }: { icon: ReactNode; label: string; value: string; note: string }) {
  return <Card className="border-slate-200/80 shadow-sm"><CardContent className="flex items-start gap-3 p-5"><span className="grid size-9 place-items-center rounded-lg bg-[#e3f3ef] text-[#2f8f82]">{icon}</span><div><p className="text-xs text-slate-500">{label}</p><p className="mt-1 font-display text-2xl font-semibold text-slate-800">{value}</p><p className="mt-1 text-[11px] text-slate-400">{note}</p></div></CardContent></Card>;
}

function ProgressLine({ label, value, color }: { label: string; value: number; color: string }) {
  const formattedValue = `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
  return <div><div className="flex justify-between text-xs"><span className="text-slate-600">{label}</span><strong className="text-slate-700">{formattedValue}</strong></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} /></div></div>;
}
