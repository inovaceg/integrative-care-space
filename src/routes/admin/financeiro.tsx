import { createFileRoute } from "@tanstack/react-router";
import { ArrowDownLeft, ArrowUpRight, Download, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AdminLayout, AdminNotice, PageIntro, SectionCard, StatusBadge } from "@/components/admin/admin-ui";
import { financialEntries } from "@/lib/admin/mocks";

export const Route = createFileRoute("/admin/financeiro")({ component: FinancePage });

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function FinancePage() {
  const [period, setPeriod] = useState("junho");
  const entries = useMemo(() => financialEntries, [period]);
  const income = entries.filter((entry) => entry.type === "Receita").reduce((sum, entry) => sum + entry.amount, 0);
  const expenses = entries.filter((entry) => entry.type === "Despesa").reduce((sum, entry) => sum + entry.amount, 0);
  return <AdminLayout><PageIntro eyebrow="Gestão do espaço" title="Financeiro" description="Acompanhe receitas e despesas com uma visão objetiva do período." action={<div className="flex gap-2"><Button variant="outline" className="hidden gap-2 border-slate-200 bg-white sm:inline-flex"><Download className="size-4" /> Exportar</Button><Button className="gap-2 bg-[#2f8f82] text-white hover:bg-[#26796e]"><Plus className="size-4" /> Lançamento</Button></div>} /><AdminNotice /><div className="mt-6 flex justify-end"><Select value={period} onValueChange={setPeriod}><SelectTrigger className="w-full border-slate-200 bg-white sm:w-[180px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="junho">Junho de 2025</SelectItem><SelectItem value="maio">Maio de 2025</SelectItem><SelectItem value="abril">Abril de 2025</SelectItem></SelectContent></Select></div><div className="mt-4 grid gap-4 sm:grid-cols-3"><FinanceMetric label="Receitas" value={money.format(income)} icon={<ArrowUpRight className="size-4" />} tone="green" note="3 lançamentos recebidos" /><FinanceMetric label="Despesas" value={money.format(expenses)} icon={<ArrowDownLeft className="size-4" />} tone="red" note="2 lançamentos pagos" /><FinanceMetric label="Saldo do período" value={money.format(income - expenses)} icon={<span className="text-sm font-bold">=</span>} tone="blue" note="resultado estimado" /></div><SectionCard title="Movimentações recentes" className="mt-6" action={<span className="text-xs text-slate-400">{entries.length} registros fictícios</span>}><div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400"><tr><th className="pb-3 font-medium">Descrição</th><th className="pb-3 font-medium">Categoria</th><th className="pb-3 font-medium">Data</th><th className="pb-3 font-medium">Status</th><th className="pb-3 text-right font-medium">Valor</th></tr></thead><tbody className="divide-y divide-slate-100">{entries.map((entry) => <tr key={entry.id}><td className="py-4 font-medium text-slate-700">{entry.description}</td><td className="py-4 text-slate-500">{entry.category}</td><td className="py-4 text-slate-500">{entry.date}</td><td className="py-4"><StatusBadge status={entry.status} /></td><td className={`py-4 text-right font-semibold ${entry.type === "Receita" ? "text-[#28786e]" : "text-slate-700"}`}>{entry.type === "Receita" ? "+" : "−"}{money.format(entry.amount)}</td></tr>)}</tbody></table></div></SectionCard></AdminLayout>;
}

function FinanceMetric({ label, value, icon, tone, note }: { label: string; value: string; icon: React.ReactNode; tone: "green" | "red" | "blue"; note: string }) {
  const styles = { green: "bg-[#e3f3ef] text-[#28786e]", red: "bg-red-50 text-red-600", blue: "bg-[#e7effb] text-[#3d6eaa]" };
  return <Card className="border-slate-200/80 shadow-sm"><CardContent className="p-5"><div className="flex items-center gap-2 text-sm text-slate-500"><span className={`grid size-7 place-items-center rounded-md ${styles[tone]}`}>{icon}</span>{label}</div><p className="mt-4 font-display text-2xl font-semibold text-slate-900">{value}</p><p className="mt-2 text-xs text-slate-400">{note}</p></CardContent></Card>;
}
