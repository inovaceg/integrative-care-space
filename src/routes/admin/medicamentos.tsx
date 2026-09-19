import { createFileRoute } from "@tanstack/react-router";
import { ArrowDownToLine, ArrowUpFromLine, Edit3, History, Loader2, PackageOpen, Pencil, Pill, Plus, Search, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { AdminLayout, AdminNotice, EmptyState, PageIntro, SectionCard } from "@/components/admin/admin-ui";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createMedication, createMedicationMovement, deleteMedication, deleteMedicationMovement, fetchMedicationMovements, fetchMedications, updateMedication, updateMedicationMovement, type MedicationInput, type MedicationMovementInput } from "@/lib/admin/records";
import type { MedicationMovementRecord, MedicationMovementType, MedicationRecord, MedicationUnit } from "@/lib/admin/types";

export const Route = createFileRoute("/admin/medicamentos")({ component: MedicationsPage });

const unitLabels: Record<MedicationUnit, string> = { unit: "Unidade", box: "Caixa", bottle: "Frasco" };
const movementLabels: Record<MedicationMovementType, string> = { entry: "Entrada", exit: "Saída" };

function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString("pt-BR");
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function stockFor(medicationId: string, movements: MedicationMovementRecord[], ignoredMovementId?: string) {
  return movements.reduce((total, movement) => {
    if (movement.medication_id !== medicationId || movement.id === ignoredMovementId) return total;
    return total + (movement.movement_type === "entry" ? Number(movement.quantity) : -Number(movement.quantity));
  }, 0);
}

function nearestExpirationFor(medicationId: string, movements: MedicationMovementRecord[]) {
  return movements.reduce<string | null>((nearest, movement) => {
    if (movement.medication_id !== medicationId || movement.movement_type !== "entry" || !movement.expiration_date) return nearest;
    const expirationDate = movement.expiration_date.slice(0, 10);
    return !nearest || expirationDate < nearest ? expirationDate : nearest;
  }, null);
}

function formatNearestExpiration(medicationId: string, movements: MedicationMovementRecord[]) {
  const expirationDate = nearestExpirationFor(medicationId, movements);
  return expirationDate ? formatDate(expirationDate) : "Não informada";
}

function MedicationDialog({ medication, open, onOpenChange, onSaved }: { medication: MedicationRecord | null; open: boolean; onOpenChange: (open: boolean) => void; onSaved: (medication: MedicationRecord) => void }) {
  const { user } = useAuth();
  const [form, setForm] = useState<MedicationInput>({ name: "", unit: "unit", unit_price: 0, supplier: null, notes: null });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setForm({ name: medication?.name ?? "", unit: medication?.unit ?? "unit", unit_price: medication?.unit_price ?? 0, supplier: medication?.supplier ?? null, notes: medication?.notes ?? null });
    setError("");
  }, [medication, open]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) { setError("Sua sessão não está disponível. Entre novamente para continuar."); return; }
    const name = form.name.trim();
    if (!name) { setError("Informe o nome do medicamento."); return; }
    if (!form.unit || !Object.keys(unitLabels).includes(form.unit)) { setError("Selecione uma unidade válida."); return; }
    if (!Number.isFinite(form.unit_price) || form.unit_price < 0) { setError("Informe um valor unitário válido."); return; }
    const input = { ...form, name, supplier: form.supplier?.trim() || null, notes: form.notes?.trim() || null };
    setSaving(true);
    setError("");
    const result = medication ? await updateMedication(user.id, medication.id, input) : await createMedication(user.id, input);
    setSaving(false);
    if (result.error) { setError(result.error.message); return; }
    if (!result.data) { setError("Não foi possível salvar o medicamento."); return; }
    onSaved(result.data as MedicationRecord);
    onOpenChange(false);
  }

  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg"><DialogHeader><DialogTitle>{medication ? "Editar medicamento" : "Cadastrar medicamento"}</DialogTitle><DialogDescription>{medication ? "Atualize os dados de identificação e armazenamento." : "Cadastre um medicamento para acompanhar seu estoque."}</DialogDescription></DialogHeader><form onSubmit={submit} className="grid gap-4"><div className="grid gap-2"><Label htmlFor="medication-name">Nome *</Label><Input id="medication-name" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required autoFocus /></div><div className="grid gap-2 sm:grid-cols-3"><div className="grid gap-2"><Label htmlFor="medication-unit">Unidade *</Label><Select value={form.unit} onValueChange={(unit: MedicationUnit) => setForm((current) => ({ ...current, unit }))}><SelectTrigger id="medication-unit"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(unitLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div><div className="grid gap-2"><Label htmlFor="medication-unit-price">Valor unitário *</Label><Input id="medication-unit-price" type="number" min="0" step="0.01" value={form.unit_price} onChange={(event) => setForm((current) => ({ ...current, unit_price: Number(event.target.value) }))} required /></div><div className="grid gap-2"><Label htmlFor="medication-supplier">Fornecedor</Label><Input id="medication-supplier" value={form.supplier ?? ""} onChange={(event) => setForm((current) => ({ ...current, supplier: event.target.value }))} /></div></div><div className="grid gap-2"><Label htmlFor="medication-notes">Observações</Label><Textarea id="medication-notes" value={form.notes ?? ""} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} rows={3} /></div>{error && <p role="alert" className="text-sm text-red-600">{error}</p>}<DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button type="submit" disabled={saving} className="bg-[#2f8f82] text-white hover:bg-[#26796e]">{saving && <Loader2 className="mr-2 size-4 animate-spin" />}{medication ? "Salvar alterações" : "Cadastrar medicamento"}</Button></DialogFooter></form></DialogContent></Dialog>;
}

function MovementDialog({ medication, movement, medications, movements, open, onOpenChange, onSaved }: { medication: MedicationRecord | null; movement: MedicationMovementRecord | null; medications: MedicationRecord[]; movements: MedicationMovementRecord[]; open: boolean; onOpenChange: (open: boolean) => void; onSaved: (movement: MedicationMovementRecord) => void }) {
  const { user } = useAuth();
  const [medicationId, setMedicationId] = useState("");
  const [movementType, setMovementType] = useState<MedicationMovementType>("entry");
  const [quantity, setQuantity] = useState("");
  const [batch, setBatch] = useState("");
  const [expirationDate, setExpirationDate] = useState("");
  const [movementDate, setMovementDate] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setMedicationId(movement?.medication_id ?? medication?.id ?? medications[0]?.id ?? "");
    setMovementType(movement?.movement_type ?? "entry");
    setQuantity(movement ? String(movement.quantity) : "");
    setBatch(movement?.batch ?? "");
    setExpirationDate(movement?.expiration_date ?? "");
    setMovementDate(movement?.movement_date?.slice(0, 10) ?? new Date().toISOString().slice(0, 10));
    setNotes(movement?.notes ?? "");
    setError("");
  }, [medication, medications, movement, open]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) { setError("Sua sessão não está disponível. Entre novamente para continuar."); return; }
    if (!medicationId || !medications.some((item) => item.id === medicationId)) { setError("Selecione um medicamento válido."); return; }
    const parsedQuantity = Number(quantity);
    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) { setError("Informe uma quantidade maior que zero."); return; }
    if (!isValidDate(movementDate)) { setError("Informe uma data de movimentação válida."); return; }
    if (expirationDate && !isValidDate(expirationDate)) { setError("Informe uma validade válida."); return; }
    const available = stockFor(medicationId, movements, movement?.id);
    if (movementType === "exit" && parsedQuantity > available) { setError(`A saída não pode ser maior que o estoque atual (${available}).`); return; }

    const input: MedicationMovementInput = { medication_id: medicationId, movement_type: movementType, quantity: parsedQuantity, batch: batch.trim() || null, expiration_date: expirationDate || null, movement_date: movementDate, notes: notes.trim() || null };
    setSaving(true);
    setError("");
    const result = movement ? await updateMedicationMovement(user.id, movement.id, input) : await createMedicationMovement(user.id, input);
    setSaving(false);
    if (result.error) { setError(result.error.message); return; }
    if (!result.data) { setError("Não foi possível salvar a movimentação."); return; }
    onSaved(result.data as MedicationMovementRecord);
    onOpenChange(false);
  }

  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>{movement ? "Editar movimentação" : "Registrar movimentação"}</DialogTitle><DialogDescription>Registre uma entrada ou saída para manter o estoque atualizado.</DialogDescription></DialogHeader><form onSubmit={submit} className="grid gap-4"><div className="grid gap-2"><Label htmlFor="movement-medication">Medicamento *</Label><Select value={medicationId} onValueChange={setMedicationId}><SelectTrigger id="movement-medication"><SelectValue placeholder="Selecione um medicamento" /></SelectTrigger><SelectContent>{medications.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select></div><div className="grid gap-4 sm:grid-cols-3"><div className="grid gap-2"><Label htmlFor="movement-type">Tipo *</Label><Select value={movementType} onValueChange={(value: MedicationMovementType) => setMovementType(value)}><SelectTrigger id="movement-type"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="entry">Entrada</SelectItem><SelectItem value="exit">Saída</SelectItem></SelectContent></Select></div><div className="grid gap-2"><Label htmlFor="movement-quantity">Quantidade *</Label><Input id="movement-quantity" type="number" min="0.01" step="any" value={quantity} onChange={(event) => setQuantity(event.target.value)} required /></div><div className="grid gap-2"><Label htmlFor="movement-date">Data *</Label><Input id="movement-date" type="date" value={movementDate} onChange={(event) => setMovementDate(event.target.value)} required /></div></div><div className="grid gap-4 sm:grid-cols-2"><div className="grid gap-2"><Label htmlFor="movement-batch">Lote</Label><Input id="movement-batch" value={batch} onChange={(event) => setBatch(event.target.value)} /></div><div className="grid gap-2"><Label htmlFor="movement-expiration">Validade</Label><Input id="movement-expiration" type="date" value={expirationDate} onChange={(event) => setExpirationDate(event.target.value)} /></div></div><div className="grid gap-2"><Label htmlFor="movement-notes">Observações</Label><Textarea id="movement-notes" value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} /></div>{error && <p role="alert" className="text-sm text-red-600">{error}</p>}<DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button type="submit" disabled={saving || medications.length === 0} className="bg-[#2f8f82] text-white hover:bg-[#26796e]">{saving && <Loader2 className="mr-2 size-4 animate-spin" />}{movement ? "Salvar alterações" : "Registrar movimentação"}</Button></DialogFooter></form></DialogContent></Dialog>;
}

function MedicationsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [medications, setMedications] = useState<MedicationRecord[]>([]);
  const [movements, setMovements] = useState<MedicationMovementRecord[]>([]);
  const [search, setSearch] = useState("");
  const [movementFilter, setMovementFilter] = useState<MedicationMovementType | "all">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [medicationDialogOpen, setMedicationDialogOpen] = useState(false);
  const [movementDialogOpen, setMovementDialogOpen] = useState(false);
  const [selectedMedication, setSelectedMedication] = useState<MedicationRecord | null>(null);
  const [selectedMovement, setSelectedMovement] = useState<MedicationMovementRecord | null>(null);
  const [medicationToDelete, setMedicationToDelete] = useState<MedicationRecord | null>(null);
  const [movementToDelete, setMovementToDelete] = useState<MedicationMovementRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let active = true;
    if (authLoading) { setLoading(true); return () => { active = false; }; }
    if (!user) { setLoading(false); setMedications([]); setMovements([]); return () => { active = false; }; }
    setLoading(true);
    setError("");
    void Promise.all([fetchMedications(user.id), fetchMedicationMovements(user.id)]).then(([medicationResult, movementResult]) => {
      if (!active) return;
      if (medicationResult.error || movementResult.error) { setError(medicationResult.error?.message ?? movementResult.error?.message ?? "Não foi possível carregar o estoque."); setLoading(false); return; }
      setMedications((medicationResult.data as MedicationRecord[] | null) ?? []);
      setMovements((movementResult.data as MedicationMovementRecord[] | null) ?? []);
      setLoading(false);
    });
    return () => { active = false; };
  }, [authLoading, user]);

  const visibleMedications = useMemo(() => {
    const term = search.trim().toLowerCase();
    return medications.filter((item) => !term || `${item.name} ${item.supplier ?? ""}`.toLowerCase().includes(term));
  }, [medications, search]);

  const visibleMovements = useMemo(() => {
    const medicationIds = new Set(visibleMedications.map((item) => item.id));
    return movements.filter((item) => medicationIds.has(item.medication_id) && (movementFilter === "all" || item.movement_type === movementFilter));
  }, [movementFilter, movements, visibleMedications]);

  function openMedicationDialog(medication?: MedicationRecord) {
    setSelectedMedication(medication ?? null);
    setMedicationDialogOpen(true);
  }

  function openMovementDialog(medication?: MedicationRecord, movement?: MedicationMovementRecord) {
    setSelectedMedication(medication ?? (movement ? medications.find((item) => item.id === movement.medication_id) ?? null : null));
    setSelectedMovement(movement ?? null);
    setMovementDialogOpen(true);
  }

  function handleMedicationSaved(saved: MedicationRecord) {
    setMedications((current) => current.some((item) => item.id === saved.id) ? current.map((item) => item.id === saved.id ? saved : item) : [...current, saved].sort((a, b) => a.name.localeCompare(b.name)));
    setError("");
  }

  function handleMovementSaved(saved: MedicationMovementRecord) {
    setMovements((current) => current.some((item) => item.id === saved.id) ? current.map((item) => item.id === saved.id ? saved : item) : [saved, ...current]);
    setError("");
  }

  async function confirmMedicationDelete() {
    if (!user || !medicationToDelete) return;
    setDeleting(true);
    const result = await deleteMedication(user.id, medicationToDelete.id);
    setDeleting(false);
    if (result.error) { setError(result.error.message); return; }
    const deletedId = medicationToDelete.id;
    setMedications((current) => current.filter((item) => item.id !== deletedId));
    setMovements((current) => current.filter((item) => item.medication_id !== deletedId));
    setMedicationToDelete(null);
  }

  async function confirmMovementDelete() {
    if (!user || !movementToDelete) return;
    setDeleting(true);
    const result = await deleteMedicationMovement(user.id, movementToDelete.id);
    setDeleting(false);
    if (result.error) { setError(result.error.message); return; }
    setMovements((current) => current.filter((item) => item.id !== movementToDelete.id));
    setMovementToDelete(null);
  }

  const medicationName = (medicationId: string) => medications.find((item) => item.id === medicationId)?.name ?? "Medicamento removido";

  return <AdminLayout><PageIntro eyebrow="Estoque" title="Controle de medicamentos" description="Cadastre medicamentos, acompanhe o estoque atual e mantenha o histórico de entradas e saídas." action={<div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => openMovementDialog()} disabled={medications.length === 0} className="gap-2 border-[#b9ded5] text-[#26796e]"><History className="size-4" /> Registrar movimentação</Button><Button onClick={() => openMedicationDialog()} className="gap-2 bg-[#2f8f82] text-white hover:bg-[#26796e]"><Plus className="size-4" /> Novo medicamento</Button></div>} /><AdminNotice />{error && <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">Não foi possível concluir a operação: {error}</p>}{loading || authLoading ? <div className="flex min-h-48 items-center justify-center text-sm text-slate-500"><Loader2 className="mr-2 size-4 animate-spin" /> Carregando estoque...</div> : !user ? <div className="mt-6"><EmptyState title="Sessão necessária" description="Entre na sua conta para consultar o controle de medicamentos." /></div> : <Tabs defaultValue="estoque" className="mt-6"><TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto bg-transparent p-0"><TabsTrigger value="estoque" className="rounded-lg bg-white px-4 py-2.5 data-[state=active]:bg-[#e3f3ef] data-[state=active]:text-[#216d64]">Controle de estoque</TabsTrigger><TabsTrigger value="relatorio" className="rounded-lg bg-white px-4 py-2.5 data-[state=active]:bg-[#e3f3ef] data-[state=active]:text-[#216d64]">Relatório de estoque</TabsTrigger></TabsList><TabsContent value="estoque"><div className="flex flex-col gap-3 sm:flex-row"><div className="relative flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><Input aria-label="Buscar medicamento" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar medicamento ou fornecedor" className="h-10 border-slate-200 bg-white pl-9 shadow-none" /></div><Select value={movementFilter} onValueChange={(value: MedicationMovementType | "all") => setMovementFilter(value)}><SelectTrigger aria-label="Filtrar histórico por tipo" className="h-10 w-full bg-white sm:w-52"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todas movimentações</SelectItem><SelectItem value="entry">Somente entradas</SelectItem><SelectItem value="exit">Somente saídas</SelectItem></SelectContent></Select></div><section className="mt-6"><div className="mb-3 flex items-center justify-between"><h3 className="font-display text-lg font-semibold text-slate-800">Estoque atual</h3><span className="text-sm text-slate-500">{visibleMedications.length} medicamento(s)</span></div>{visibleMedications.length === 0 ? <EmptyState title={medications.length === 0 ? "Nenhum medicamento cadastrado" : "Nenhum medicamento encontrado"} description={medications.length === 0 ? "Cadastre o primeiro medicamento para começar a controlar seu estoque." : "Tente buscar por outro nome ou fornecedor."} action={medications.length === 0 ? <Button onClick={() => openMedicationDialog()} className="gap-2 bg-[#2f8f82] text-white hover:bg-[#26796e]"><Plus className="size-4" /> Cadastrar medicamento</Button> : undefined} /> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{visibleMedications.map((medication) => { const stock = stockFor(medication.id, movements); return <Card key={medication.id} className="border-slate-200/80 shadow-sm"><CardContent className="p-5"><div className="flex items-start justify-between gap-3"><div className="grid size-11 place-items-center rounded-xl bg-[#e3f3ef] text-[#2f8f82]"><Pill className="size-5" /></div><div className="flex gap-1"><Button variant="ghost" size="icon" onClick={() => openMedicationDialog(medication)} aria-label={`Editar ${medication.name}`}><Pencil className="size-4" /></Button><Button variant="ghost" size="icon" onClick={() => setMedicationToDelete(medication)} aria-label={`Excluir ${medication.name}`} className="text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="size-4" /></Button></div></div><h4 className="mt-4 font-display text-lg font-semibold text-slate-800">{medication.name}</h4><p className="mt-1 text-sm text-slate-500">{unitLabels[medication.unit]}{medication.supplier ? ` · ${medication.supplier}` : ""}</p><p className="mt-2 text-sm font-medium text-[#26796e]">Valor unitário: {formatCurrency(medication.unit_price)}</p><div className="mt-5 flex items-end justify-between border-t border-slate-100 pt-4"><div><p className="text-xs uppercase tracking-wide text-slate-400">Estoque atual</p><p className={`mt-1 text-2xl font-semibold ${stock < 0 ? "text-red-600" : "text-[#26796e]"}`}>{stock} <span className="text-sm font-medium">{unitLabels[medication.unit].toLowerCase()}</span></p></div><Button size="sm" variant="outline" onClick={() => openMovementDialog(medication)} className="gap-1.5"><Plus className="size-3.5" /> Movimentar</Button></div></CardContent></Card>; })}</div>}</section><SectionCard title="Histórico detalhado" className="mt-8" action={<span className="text-xs font-normal text-slate-400">{visibleMovements.length} registro(s)</span>}>{visibleMovements.length === 0 ? <div className="py-8 text-center"><PackageOpen className="mx-auto size-8 text-slate-300" /><p className="mt-3 text-sm text-slate-500">Nenhuma movimentação encontrada.</p></div> : <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead><tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400"><th className="px-2 py-3 font-medium">Data</th><th className="px-2 py-3 font-medium">Medicamento</th><th className="px-2 py-3 font-medium">Tipo</th><th className="px-2 py-3 font-medium">Quantidade</th><th className="px-2 py-3 font-medium">Lote / validade</th><th className="px-2 py-3 font-medium">Observações</th><th className="px-2 py-3 text-right font-medium">Ações</th></tr></thead><tbody>{visibleMovements.map((movement) => <tr key={movement.id} className="border-b border-slate-50 last:border-0"><td className="px-2 py-3 text-slate-600">{formatDate(movement.movement_date)}<span className="block text-xs text-slate-400">{formatDateTime(movement.created_at)}</span></td><td className="px-2 py-3 font-medium text-slate-700">{medicationName(movement.medication_id)}</td><td className={`px-2 py-3 font-medium ${movement.movement_type === "entry" ? "text-[#26796e]" : "text-amber-700"}`}><span className="inline-flex items-center gap-1.5">{movement.movement_type === "entry" ? <ArrowDownToLine className="size-3.5" /> : <ArrowUpFromLine className="size-3.5" />}{movementLabels[movement.movement_type]}</span></td><td className="px-2 py-3 font-semibold text-slate-700">{movement.quantity}</td><td className="px-2 py-3 text-slate-500">{movement.batch || "—"}<span className="block text-xs text-slate-400">{formatDate(movement.expiration_date)}</span></td><td className="max-w-48 truncate px-2 py-3 text-slate-500">{movement.notes || "—"}</td><td className="px-2 py-3 text-right"><div className="flex justify-end gap-1"><Button variant="ghost" size="icon" onClick={() => openMovementDialog(undefined, movement)} aria-label="Editar movimentação"><Edit3 className="size-4" /></Button><Button variant="ghost" size="icon" onClick={() => setMovementToDelete(movement)} aria-label="Excluir movimentação" className="text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="size-4" /></Button></div></td></tr>)}</tbody></table></div>}</SectionCard></TabsContent><TabsContent value="relatorio"><SectionCard title="Relatório de estoque" className="mt-0"><p className="mb-4 text-sm text-slate-500">Resumo do estoque atual e das validades informadas nas entradas.</p>{medications.length === 0 ? <EmptyState title="Nenhum medicamento cadastrado" description="Cadastre o primeiro medicamento para começar a controlar seu estoque." /> : <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-left text-sm"><thead><tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400"><th className="px-2 py-3 font-medium">Nome do produto</th><th className="px-2 py-3 font-medium">Estoque atual</th><th className="px-2 py-3 font-medium">Data de validade</th></tr></thead><tbody>{medications.map((medication) => <tr key={medication.id} className="border-b border-slate-50 last:border-0"><td className="px-2 py-3 font-medium text-slate-700">{medication.name}</td><td className="px-2 py-3 font-semibold text-[#26796e]">{stockFor(medication.id, movements)}</td><td className="px-2 py-3 text-slate-500">{formatNearestExpiration(medication.id, movements)}</td></tr>)}</tbody></table></div>}</SectionCard></TabsContent></Tabs>}<MedicationDialog medication={selectedMedication} open={medicationDialogOpen} onOpenChange={setMedicationDialogOpen} onSaved={handleMedicationSaved} /><MovementDialog medication={selectedMedication} movement={selectedMovement} medications={medications} movements={movements} open={movementDialogOpen} onOpenChange={setMovementDialogOpen} onSaved={handleMovementSaved} /><AlertDialog open={Boolean(medicationToDelete)} onOpenChange={(open) => { if (!open && !deleting) setMedicationToDelete(null); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Excluir medicamento?</AlertDialogTitle><AlertDialogDescription>Esta ação não pode ser desfeita. O medicamento{medicationToDelete ? ` “${medicationToDelete.name}”` : ""} será removido permanentemente e o histórico relacionado também será removido (FK cascade).</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => void confirmMedicationDelete()} disabled={deleting} className="bg-red-600 hover:bg-red-700">{deleting && <Loader2 className="mr-2 size-4 animate-spin" />} Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog><AlertDialog open={Boolean(movementToDelete)} onOpenChange={(open) => { if (!open && !deleting) setMovementToDelete(null); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Excluir movimentação?</AlertDialogTitle><AlertDialogDescription>Esta ação não pode ser desfeita. O registro será removido do histórico e recalculará o estoque.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => void confirmMovementDelete()} disabled={deleting} className="bg-red-600 hover:bg-red-700">{deleting && <Loader2 className="mr-2 size-4 animate-spin" />} Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></AdminLayout>;
}

export default MedicationsPage;
