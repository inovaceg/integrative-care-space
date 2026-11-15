import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { SectionCard } from "@/components/admin/admin-ui";
import type { AppointmentRecord } from "@/lib/admin/records";
import type { FinancialEntry } from "@/lib/admin/types";

const COLORS = ["#176b62", "#72c7b5", "#d9a441", "#8c78bd", "#d97777", "#4c86a8"];
const currency = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(value);

export function DashboardCharts({ appointments, entries, activePatients, inactivePatients }: { appointments: AppointmentRecord[]; entries: FinancialEntry[]; activePatients: number; inactivePatients: number }) {
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const monthAppointments = appointments.filter((item) => item.start_time.slice(0, 7) === key);
    const monthEntries = entries.filter((item) => item.transaction_date.slice(0, 7) === key);
    return {
      month: date.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""),
      atendimentos: monthAppointments.filter((item) => item.status === "completed").length,
      agendados: monthAppointments.filter((item) => item.status === "confirmed" || item.status === "pending").length,
      receitas: monthEntries.filter((item) => item.transaction_type === "income" && item.status !== "pending").reduce((total, item) => total + Number(item.amount), 0),
      despesas: monthEntries.filter((item) => item.transaction_type === "expense" && item.status !== "pending").reduce((total, item) => total + Number(item.amount), 0),
    };
  });
  const statusCounts = [
    { name: "Realizados", value: appointments.filter((item) => item.status === "completed").length },
    { name: "Agendados", value: appointments.filter((item) => item.status === "confirmed" || item.status === "pending").length },
    { name: "Cancelados", value: appointments.filter((item) => item.status === "cancelled").length },
  ].filter((item) => item.value > 0);
  const modalities = Array.from(appointments.reduce((counts, item) => {
    const modality = item.notes?.match(/^\[([^\]]+)\]/)?.[1] ?? "Não informado";
    counts.set(modality, (counts.get(modality) ?? 0) + 1);
    return counts;
  }, new Map<string, number>()).entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 6);
  const patientStatus = [{ name: "Ativos", value: activePatients }, { name: "Inativos", value: inactivePatients }].filter((item) => item.value > 0);

  return <div className="mt-6 grid gap-5 xl:grid-cols-2">
    <SectionCard title="Atendimentos por mês"><div className="h-64">{months.some((item) => item.atendimentos + item.agendados > 0) ? <ResponsiveContainer width="100%" height="100%"><BarChart data={months} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8eeec" /><XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#64748b" }} /><YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#94a3b8" }} /><Tooltip /><Legend /><Bar dataKey="atendimentos" name="Realizados" fill="#176b62" radius={[5, 5, 0, 0]} /><Bar dataKey="agendados" name="Agendados" fill="#72c7b5" radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer> : <ChartEmpty />}</div></SectionCard>
    <SectionCard title="Evolução financeira"><div className="h-64">{months.some((item) => item.receitas + item.despesas > 0) ? <ResponsiveContainer width="100%" height="100%"><LineChart data={months} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8eeec" /><XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#64748b" }} /><YAxis tickFormatter={(value) => `${Math.round(value / 1000)}k`} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#94a3b8" }} /><Tooltip formatter={(value) => currency(Number(value))} /><Legend /><Line type="monotone" dataKey="receitas" name="Receitas recebidas" stroke="#176b62" strokeWidth={3} dot={{ r: 3 }} /><Line type="monotone" dataKey="despesas" name="Despesas pagas" stroke="#d9a441" strokeWidth={2} dot={{ r: 3 }} /></LineChart></ResponsiveContainer> : <ChartEmpty />}</div></SectionCard>
    <SectionCard title="Status dos atendimentos"><div className="h-64">{statusCounts.length ? <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={statusCounts} dataKey="value" nameKey="name" innerRadius={54} outerRadius={88} paddingAngle={4}>{statusCounts.map((item, index) => <Cell key={item.name} fill={COLORS[index]} />)}</Pie><Tooltip /><Legend verticalAlign="bottom" /></PieChart></ResponsiveContainer> : <ChartEmpty />}</div></SectionCard>
    <SectionCard title="Pacientes ativos e inativos"><div className="h-64">{patientStatus.length ? <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={patientStatus} dataKey="value" nameKey="name" innerRadius={54} outerRadius={88} paddingAngle={4}>{patientStatus.map((item, index) => <Cell key={item.name} fill={index === 0 ? "#176b62" : "#cbd5d1"} />)}</Pie><Tooltip /><Legend verticalAlign="bottom" /></PieChart></ResponsiveContainer> : <ChartEmpty />}</div></SectionCard>
    <SectionCard title="Atendimentos por modalidade" className="xl:col-span-2"><div className="h-64">{modalities.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={modalities} layout="vertical" margin={{ top: 4, right: 20, left: 8, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e8eeec" /><XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#94a3b8" }} /><YAxis type="category" dataKey="name" width={120} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#64748b" }} /><Tooltip /><Bar dataKey="value" name="Atendimentos" fill="#176b62" radius={[0, 5, 5, 0]} /></BarChart></ResponsiveContainer> : <ChartEmpty />}</div></SectionCard>
  </div>;
}

function ChartEmpty() {
  return <div className="flex h-full items-center justify-center text-center text-sm text-slate-400">Ainda não há dados para este gráfico.</div>;
}
