import { createFileRoute } from "@tanstack/react-router";
import { ArrowDownLeft, ArrowUpRight, Download, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { AdminLayout, AdminNotice, EmptyState, PageIntro, SectionCard } from "@/components/admin/admin-ui";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createFinancialEntry, deleteFinancialEntry, fetchFinancialEntries, updateFinancialEntry, type FinancialEntryInput } from "@/lib/admin/records";
import type { FinancialEntry, FinancialEntryStatus, FinancialTransactionType } from "@/lib/admin/types";

export const Route = createFileRoute("/admin/financeiro")({ component: FinancePage });

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const typeLabels: Record<FinancialTransactionType, string> = { income: "Receita", expense: "Despesa" };
const statusLabels: Record<FinancialEntryStatus, string> = { pending: "Pendente", paid: "Pago", received: "Recebido" };
const statusStyles: Record<FinancialEntryStatus, string> = {
  pending: "bg-[#fff4dc] text-[#a36c12]",
  paid: "bg-slate-100 text-slate-600",
  received: "bg-[#e2f4ed] text-[#277767]",
};

type EntryForm = Omit<FinancialEntryInput, "amount"> & { amount: string };

function localDateValue(date: Date) {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function monthValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(value: string) {
  return new Date(`${value}-01T00:00:00`).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

function emptyForm(): EntryForm {
  return { description: "", category: "", transaction_type: "income", amount: "", transaction_date: localDateValue(new Date()), status: "pending", notes: null };
}

function formFromEntry(entry: FinancialEntry): EntryForm {
  return { description: entry.description, category: entry.category, transaction_type: entry.transaction_type, amount: entry.amount.toLocaleString("pt-BR", { useGrouping: false, maximumFractionDigits: 20 }), transaction_date: entry.transaction_date, status: entry.status, notes: entry.notes };
}

function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function numericAmount(value: string) {
  const normalized = value.trim();
  if (!normalized || (normalized.includes(".") && !normalized.includes(","))) return null;
  if (!/^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d+)?$/.test(normalized)) return null;
  const amount = Number(normalized.replace(/\./g, "").replace(",", "."));
  if (!Number.isFinite(amount) || amount < 0) return null;
  return amount;
}

function sortFinancialEntries(entries: FinancialEntry[]) {
  return [...entries].sort((first, second) => second.transaction_date.localeCompare(first.transaction_date) || second.created_at.localeCompare(first.created_at));
}

function EntryDialog({ entry, onSaved, trigger }: { entry?: FinancialEntry; onSaved: (entry: FinancialEntry) => void; trigger: ReactNode }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<EntryForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const editing = Boolean(entry);
  const idSuffix = entry?.id ?? "new";

  function reset() {
    setForm(entry ? formFromEntry(entry) : emptyForm());
    setError("");
  }

  function update(field: keyof EntryForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const normalizedAmount = form.amount.trim();
    const amount = numericAmount(normalizedAmount);
    if (!user) { setError("Sua sessão não está disponível. Entre novamente para continuar."); return; }
    if (!form.description.trim() || !form.category.trim()) { setError("Informe a descrição e a categoria do lançamento."); return; }
    if (normalizedAmount.includes(".") && !normalizedAmount.includes(",")) { setError("Use vírgula para casas decimais; um valor com ponto sem vírgula, como 1.234, é ambíguo."); return; }
    if (amount === null) { setError("Informe um valor no formato brasileiro, não negativo e sem NaN."); return; }
    if (!validDate(form.transaction_date)) { setError("Informe uma data válida."); return; }

    const input: FinancialEntryInput = { description: form.description.trim(), category: form.category.trim(), transaction_type: form.transaction_type, amount, transaction_date: form.transaction_date, status: form.status, notes: form.notes?.trim() || null };
    setSaving(true);
    const result = entry ? await updateFinancialEntry(user.id, entry.id, input) : await createFinancialEntry(user.id, input);
    setSaving(false);
    if (result.error) { setError(result.error.message); return; }
    if (!result.data) { setError("Não foi possível salvar o lançamento."); return; }
    onSaved(result.data as FinancialEntry);
    setOpen(false);
    reset();
  }

  return <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (next) reset(); }}><DialogTrigger asChild>{trigger}</DialogTrigger><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl"><DialogHeader><DialogTitle>{editing ? "Editar lançamento" : "Novo lançamento"}</DialogTitle><DialogDescription>{editing ? "Atualize os dados desta movimentação financeira." : "Informe os dados para registrar uma receita ou despesa."}</DialogDescription></DialogHeader><form onSubmit={submit} className="grid gap-4 py-2"><div className="grid gap-2"><Label htmlFor={`financial-description-${idSuffix}`}>Descrição *</Label><Input id={`financial-description-${idSuffix}`} value={form.description} onChange={(event) => update("description", event.target.value)} required /></div><div className="grid gap-3 sm:grid-cols-2"><div className="grid gap-2"><Label htmlFor={`financial-category-${idSuffix}`}>Categoria *</Label><Input id={`financial-category-${idSuffix}`} value={form.category} onChange={(event) => update("category", event.target.value)} required placeholder="Ex.: Consultas" /></div><div className="grid gap-2"><Label htmlFor={`financial-type-${idSuffix}`}>Tipo *</Label><Select value={form.transaction_type} onValueChange={(value: FinancialTransactionType) => update("transaction_type", value)}><SelectTrigger id={`financial-type-${idSuffix}`}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="income">Receita</SelectItem><SelectItem value="expense">Despesa</SelectItem></SelectContent></Select></div></div><div className="grid gap-3 sm:grid-cols-2"><div className="grid gap-2"><Label htmlFor={`financial-amount-${idSuffix}`}>Valor (R$) *</Label><Input id={`financial-amount-${idSuffix}`} inputMode="decimal" value={form.amount} onChange={(event) => update("amount", event.target.value)} placeholder="0,00" required /></div><div className="grid gap-2"><Label htmlFor={`financial-date-${idSuffix}`}>Data *</Label><Input id={`financial-date-${idSuffix}`} type="date" value={form.transaction_date} onChange={(event) => update("transaction_date", event.target.value)} required /></div></div><div className="grid gap-2"><Label htmlFor={`financial-status-${idSuffix}`}>Status *</Label><Select value={form.status} onValueChange={(value: FinancialEntryStatus) => update("status", value)}><SelectTrigger id={`financial-status-${idSuffix}`}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pending">Pendente</SelectItem><SelectItem value="paid">Pago</SelectItem><SelectItem value="received">Recebido</SelectItem></SelectContent></Select></div><div className="grid gap-2"><Label htmlFor={`financial-notes-${idSuffix}`}>Observações</Label><Textarea id={`financial-notes-${idSuffix}`} value={form.notes ?? ""} onChange={(event) => update("notes", event.target.value)} rows={3} /></div>{error && <p role="alert" className="text-sm text-red-600">{error}</p>}<DialogFooter><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button type="submit" disabled={saving} className="bg-[#2f8f82] hover:bg-[#26796e]">{saving && <Loader2 className="mr-2 size-4 animate-spin" />}{editing ? "Salvar alterações" : "Salvar lançamento"}</Button></DialogFooter></form></DialogContent></Dialog>;
}

function FinancePage() {
  const { user, isLoading: authLoading } = useAuth();
  const [entries, setEntries] = useState<FinancialEntry[]>([]);
  const [period, setPeriod] = useState(monthValue(new Date()));
  const [typeFilter, setTypeFilter] = useState<FinancialTransactionType | "all">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mutating, setMutating] = useState("");
  const [entryToDelete, setEntryToDelete] = useState<FinancialEntry | null>(null);
  const entriesRequestVersion = useRef(0);
  const activeUserId = useRef<string | null>(null);

  const currentUserEntries = activeUserId.current === (user?.id ?? null) ? entries : [];
  const periods = useMemo(() => {
    const values = new Set(Array.from({ length: 12 }, (_, index) => { const date = new Date(); date.setDate(1); date.setMonth(date.getMonth() - index); return monthValue(date); }));
    currentUserEntries.forEach((entry) => values.add(entry.transaction_date.slice(0, 7)));
    return Array.from(values).sort((first, second) => second.localeCompare(first));
  }, [currentUserEntries]);

  useEffect(() => {
    const requestedUserId = user?.id ?? null;
    const requestVersion = ++entriesRequestVersion.current;
    activeUserId.current = requestedUserId;
    setEntries([]);
    setError("");

    if (authLoading || !requestedUserId) {
      setLoading(authLoading);
      return () => { entriesRequestVersion.current += 1; };
    }

    setLoading(true);
    void (async () => {
      const { data, error: queryError } = await fetchFinancialEntries(requestedUserId);
      if (entriesRequestVersion.current !== requestVersion || activeUserId.current !== requestedUserId) return;
      if (queryError) setError(queryError.message);
      const loadedEntries = (data as FinancialEntry[] | null) ?? [];
      if (loadedEntries.some((entry) => entry.user_id !== requestedUserId)) {
        setEntries([]);
        setLoading(false);
        return;
      }
      setEntries(sortFinancialEntries(loadedEntries));
      setLoading(false);
    })();

    return () => { entriesRequestVersion.current += 1; };
  }, [authLoading, user?.id]);

  const visibleEntries = useMemo(() => currentUserEntries.filter((entry) => entry.transaction_date.slice(0, 7) === period && (typeFilter === "all" || entry.transaction_type === typeFilter)), [currentUserEntries, period, typeFilter]);
  const income = visibleEntries.filter((entry) => entry.transaction_type === "income").reduce((sum, entry) => sum + Number(entry.amount), 0);
  const expenses = visibleEntries.filter((entry) => entry.transaction_type === "expense").reduce((sum, entry) => sum + Number(entry.amount), 0);

  function handleSaved(savedEntry: FinancialEntry) {
    if (activeUserId.current !== savedEntry.user_id) return;
    setEntries((current) => {
      const exists = current.some((entry) => entry.id === savedEntry.id);
      const nextEntries = exists ? current.map((entry) => entry.id === savedEntry.id ? savedEntry : entry) : [savedEntry, ...current];
      return sortFinancialEntries(nextEntries);
    });
    setError("");
  }

  async function confirmDelete() {
    if (!user || !entryToDelete) return;
    const deleting = entryToDelete;
    setMutating(deleting.id);
    setEntryToDelete(null);
    const { error: deleteError } = await deleteFinancialEntry(user.id, deleting.id);
    setMutating("");
    if (deleteError) { setError(deleteError.message); return; }
    setEntries((current) => current.filter((entry) => entry.id !== deleting.id));
  }

  const hasEntriesInPeriod = visibleEntries.length > 0;

  return <AdminLayout><PageIntro eyebrow="Gestão do espaço" title="Financeiro" description="Acompanhe receitas e despesas com uma visão objetiva do período." action={<div className="flex gap-2"><Button variant="outline" disabled className="hidden gap-2 border-slate-200 bg-white sm:inline-flex" title="Exportação indisponível"><Download className="size-4" /> Exportar</Button><EntryDialog onSaved={handleSaved} trigger={<Button className="gap-2 bg-[#2f8f82] text-white hover:bg-[#26796e]"><Plus className="size-4" /> Lançamento</Button>} /></div>} /><AdminNotice />{error && <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">Não foi possível concluir a operação financeira: {error}</p>}<div className="mt-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><Select value={period} onValueChange={setPeriod}><SelectTrigger className="w-full border-slate-200 bg-white sm:w-[210px]"><SelectValue /></SelectTrigger><SelectContent>{periods.map((value) => <SelectItem key={value} value={value}>{monthLabel(value)}</SelectItem>)}</SelectContent></Select><Select value={typeFilter} onValueChange={(value: FinancialTransactionType | "all") => setTypeFilter(value)}><SelectTrigger className="w-full border-slate-200 bg-white sm:w-[180px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos os tipos</SelectItem><SelectItem value="income">Receitas</SelectItem><SelectItem value="expense">Despesas</SelectItem></SelectContent></Select></div><div className="mt-4 grid gap-4 sm:grid-cols-3"><FinanceMetric label="Receitas" value={money.format(income)} icon={<ArrowUpRight className="size-4" />} tone="green" note={`${visibleEntries.filter((entry) => entry.transaction_type === "income").length} lançamento(s) no período`} /><FinanceMetric label="Despesas" value={money.format(expenses)} icon={<ArrowDownLeft className="size-4" />} tone="red" note={`${visibleEntries.filter((entry) => entry.transaction_type === "expense").length} lançamento(s) no período`} /><FinanceMetric label="Saldo do período" value={money.format(income - expenses)} icon={<span className="text-sm font-bold">=</span>} tone="blue" note="Receitas menos despesas" /></div><SectionCard title="Movimentações recentes" className="mt-6" action={<span className="text-xs text-slate-400">{visibleEntries.length} registro(s)</span>}>{loading || authLoading ? <div className="flex min-h-40 items-center justify-center text-sm text-slate-500"><Loader2 className="mr-2 size-4 animate-spin" /> Carregando lançamentos...</div> : !hasEntriesInPeriod ? <EmptyState title={entries.length ? "Nenhuma movimentação neste filtro" : "Nenhum lançamento cadastrado"} description={entries.length ? "Ajuste o mês ou o tipo para visualizar outros lançamentos." : "Registre sua primeira receita ou despesa para começar."} action={!entries.length ? <EntryDialog onSaved={handleSaved} trigger={<Button className="bg-[#2f8f82] hover:bg-[#26796e]"><Plus className="mr-2 size-4" /> Novo lançamento</Button>} /> : undefined} /> : <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400"><tr><th className="pb-3 font-medium">Descrição</th><th className="pb-3 font-medium">Categoria</th><th className="pb-3 font-medium">Data</th><th className="pb-3 font-medium">Tipo</th><th className="pb-3 font-medium">Status</th><th className="pb-3 text-right font-medium">Valor</th><th className="pb-3 text-right font-medium">Ações</th></tr></thead><tbody className="divide-y divide-slate-100">{visibleEntries.map((entry) => <tr key={entry.id} className="hover:bg-slate-50/70"><td className="py-4 font-medium text-slate-700">{entry.description}<span className="block max-w-[190px] truncate text-xs font-normal text-slate-400">{entry.notes ?? ""}</span></td><td className="py-4 text-slate-500">{entry.category}</td><td className="py-4 text-slate-500">{new Date(`${entry.transaction_date}T00:00:00`).toLocaleDateString("pt-BR")}</td><td className="py-4"><Badge className={entry.transaction_type === "income" ? "border-0 bg-[#e2f4ed] text-[#277767]" : "border-0 bg-red-50 text-red-600"}>{typeLabels[entry.transaction_type]}</Badge></td><td className="py-4"><Badge className={`border-0 ${statusStyles[entry.status]}`}>{statusLabels[entry.status]}</Badge></td><td className={`py-4 text-right font-semibold ${entry.transaction_type === "income" ? "text-[#28786e]" : "text-slate-700"}`}>{entry.transaction_type === "income" ? "+" : "−"}{money.format(Number(entry.amount))}</td><td className="py-4 text-right"><div className="flex justify-end gap-1"><EntryDialog entry={entry} onSaved={handleSaved} trigger={<Button type="button" variant="ghost" size="icon" aria-label={`Editar ${entry.description}`}><Pencil className="size-4" /></Button>} /><Button type="button" variant="ghost" size="icon" className="text-red-500 hover:bg-red-50 hover:text-red-600" onClick={() => setEntryToDelete(entry)} disabled={mutating === entry.id} aria-label={`Excluir ${entry.description}`}><Trash2 className="size-4" /></Button></div></td></tr>)}</tbody></table></div>}</SectionCard><AlertDialog open={Boolean(entryToDelete)} onOpenChange={(open) => { if (!open && !mutating) setEntryToDelete(null); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Excluir lançamento?</AlertDialogTitle><AlertDialogDescription>Esta ação não pode ser desfeita. O lançamento{entryToDelete ? ` “${entryToDelete.description}”` : ""} será removido permanentemente.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => void confirmDelete()} disabled={Boolean(mutating)} className="bg-red-600 hover:bg-red-700">{mutating && <Loader2 className="mr-2 size-4 animate-spin" />} Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></AdminLayout>;
}

function FinanceMetric({ label, value, icon, tone, note }: { label: string; value: string; icon: ReactNode; tone: "green" | "red" | "blue"; note: string }) {
  const styles = { green: "bg-[#e3f3ef] text-[#28786e]", red: "bg-red-50 text-red-600", blue: "bg-[#e7effb] text-[#3d6eaa]" };
  return <Card className="border-slate-200/80 shadow-sm"><CardContent className="p-5"><div className="flex items-center gap-2 text-sm text-slate-500"><span className={`grid size-7 place-items-center rounded-md ${styles[tone]}`}>{icon}</span>{label}</div><p className="mt-4 font-display text-2xl font-semibold text-slate-900">{value}</p><p className="mt-2 text-xs text-slate-400">{note}</p></CardContent></Card>;
}

export default FinancePage;
