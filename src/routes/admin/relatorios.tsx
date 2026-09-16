import { createFileRoute } from "@tanstack/react-router";
import { BarChart3, Download, TrendingUp, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AdminLayout, AdminNotice, PageIntro, SectionCard } from "@/components/admin/admin-ui";
import { chartData } from "@/lib/admin/mocks";

export const Route = createFileRoute("/admin/relatorios")({ component: ReportsPage });

function ReportsPage() {
  const max = Math.max(...chartData.map((item) => item.value));
  return <AdminLayout><PageIntro eyebrow="Acompanhamento" title="Relatórios" description="Indicadores visuais para apoiar a gestão do seu espaço." action={<Button variant="outline" className="gap-2 border-slate-200 bg-white"><Download className="size-4" /> Exportar resumo</Button>} /><AdminNotice /><div className="mt-6 flex justify-end"><Select defaultValue="6"><SelectTrigger className="w-full border-slate-200 bg-white sm:w-[180px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="6">Últimos 6 meses</SelectItem><SelectItem value="12">Últimos 12 meses</SelectItem></SelectContent></Select></div><div className="mt-4 grid gap-6 xl:grid-cols-[1.3fr_.7fr]"><Card className="border-slate-200/80 shadow-sm"><CardHeader className="flex-row items-start justify-between space-y-0"><div><CardTitle className="font-display text-base text-slate-800">Receita por mês</CardTitle><p className="mt-1 text-xs text-slate-500">Evolução estimada no período selecionado</p></div><BarChart3 className="size-5 text-[#2f8f82]" /></CardHeader><CardContent><div className="flex h-64 items-end gap-3 border-b border-l border-slate-100 px-2 pb-0 pt-5 sm:gap-6">{chartData.map((item) => <div key={item.month} className="flex h-full flex-1 flex-col items-center justify-end gap-2"><div className="relative w-full max-w-12 rounded-t-md bg-[#72c7b5] transition-all hover:bg-[#2f8f82]" style={{ height: `${(item.value / max) * 86}%` }} title={`${item.month}: ${item.value}`} /><span className="text-[11px] text-slate-400">{item.month}</span></div>)}</div></CardContent></Card><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1"><ReportMetric icon={<TrendingUp className="size-5" />} label="Crescimento mensal" value="+8,2%" note="comparado ao mês anterior" /><ReportMetric icon={<UsersRound className="size-5" />} label="Novos pacientes" value="12" note="no período selecionado" /><SectionCard title="Áreas de atendimento"><div className="space-y-4"><ProgressLine label="Psicologia" value="62%" color="bg-[#2f8f82]" /><ProgressLine label="Biomedicina" value="38%" color="bg-[#d7ad57]" /></div></SectionCard></div></div></AdminLayout>;
}

function ReportMetric({ icon, label, value, note }: { icon: React.ReactNode; label: string; value: string; note: string }) {
  return <Card className="border-slate-200/80 shadow-sm"><CardContent className="flex items-start gap-3 p-5"><span className="grid size-9 place-items-center rounded-lg bg-[#e3f3ef] text-[#2f8f82]">{icon}</span><div><p className="text-xs text-slate-500">{label}</p><p className="mt-1 font-display text-2xl font-semibold text-slate-800">{value}</p><p className="mt-1 text-[11px] text-slate-400">{note}</p></div></CardContent></Card>;
}

function ProgressLine({ label, value, color }: { label: string; value: string; color: string }) {
  return <div><div className="flex justify-between text-xs"><span className="text-slate-600">{label}</span><strong className="text-slate-700">{value}</strong></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${color}`} style={{ width: value }} /></div></div>;
}
