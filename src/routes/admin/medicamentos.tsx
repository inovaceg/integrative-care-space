import { createFileRoute } from "@tanstack/react-router";
import { ArrowDownToLine, ArrowUpFromLine, Camera, Download, Edit3, Eye, History, Loader2, PackageOpen, Pencil, Pill, Plus, Search, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ComponentProps, type FormEvent } from "react";
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
import { Tabs as BaseTabs, TabsContent as BaseTabsContent, TabsList as BaseTabsList, TabsTrigger } from "@/components/ui/tabs";
import { createMedication, createMedicationMovement, deleteMedication, deleteMedicationMovement, fetchMedicationMovements, fetchMedications, updateMedication, updateMedicationMovement, type MedicationInput, type MedicationMovementInput } from "@/lib/admin/records";
import { downloadDocumentPdf, type DocumentPage } from "@/lib/admin/document-layout";
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

function useSessionStorageState<T>(key: string, initialValue: T) {
  const [value, setValue] = useState(initialValue);
  const [loadedKey, setLoadedKey] = useState("");

  useEffect(() => {
    try {
      const saved = window.sessionStorage.getItem(key);
      setValue(saved === null ? initialValue : JSON.parse(saved) as T);
    } catch {
      setValue(initialValue);
    }
    setLoadedKey(key);
  }, [key, initialValue]);

  useEffect(() => {
    if (loadedKey !== key) return;
    try {
      window.sessionStorage.setItem(key, JSON.stringify(value));
    } catch {
      return;
    }
  }, [key, loadedKey, value]);

  return [value, setValue, loadedKey === key] as const;
}

function clearSessionValue(key: string) {
  try {
    window.sessionStorage.removeItem(key);
  } catch {
    return;
  }
}

function observationPdfPages(medications: MedicationRecord[]): DocumentPage[] {
  const pages: DocumentPage[] = [];
  let page: DocumentPage = [];
  let y = 0;
  const startPage = () => {
    page = [
      { text: "RELATÓRIO DE OBSERVAÇÕES", x: 42, y: 64, size: 16, bold: true, color: "#123c3d" },
      { text: `Gerado em ${new Date().toLocaleDateString("pt-BR")}`, x: 42, y: 86, size: 10, color: "#475569" },
    ];
    pages.push(page);
    y = 118;
  };
  const wrapText = (text: string) => text.split(/\r?\n/).flatMap((paragraph) => {
    const words = paragraph.split(/\s+/);
    const lines: string[] = [];
    let line = "";
    words.forEach((word) => {
      if (line && `${line} ${word}`.length > 88) {
        lines.push(line);
        line = word;
      } else {
        line = line ? `${line} ${word}` : word;
      }
    });
    lines.push(line);
    return lines;
  });
  startPage();
  medications.forEach((medication, index) => {
    const noteLines = wrapText(medication.notes?.trim() || "—");
    const blockHeight = 18 + noteLines.length * 14 + 10;
    if (y + blockHeight > 690) startPage();
    page.push({ text: `${index + 1}. ${medication.name}`, x: 42, y, size: 11, bold: true, color: "#17232d" });
    y += 17;
    noteLines.forEach((line) => {
      page.push({ text: line, x: 54, y, size: 10, color: "#475569" });
      y += 14;
    });
    y += 11;
  });
  return pages;
}

function MedicationDialog({ medication, open, onOpenChange, onSaved }: { medication: MedicationRecord | null; open: boolean; onOpenChange: (open: boolean) => void; onSaved: (medication: MedicationRecord) => void }) {
  const { user } = useAuth();
  const initialForm = useMemo<MedicationInput>(() => ({ name: medication?.name ?? "", unit: medication?.unit ?? "unit", unit_price: medication?.unit_price ?? 0, supplier: medication?.supplier ?? null, notes: medication?.notes ?? null }), [medication?.id, medication?.name, medication?.unit, medication?.unit_price, medication?.supplier, medication?.notes]);
  const draftKey = `admin-medications:${user?.id ?? "anonymous"}:medication-form:${medication?.id ?? "new"}`;
  const [form, setForm] = useSessionStorageState(draftKey, initialForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (open) setError("");
  }, [open]);

  useEffect(() => {
    if (!cameraOpen) return;
    let disposed = false;
    let stream: MediaStream | null = null;
    setCameraError("");
    setScanMessage("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("A câmera não está disponível neste navegador ou contexto. Digite o nome manualmente.");
      return;
    }
    void navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false }).then((cameraStream) => {
      if (disposed) { cameraStream.getTracks().forEach((track) => track.stop()); return; }
      stream = cameraStream;
      if (videoRef.current) {
        videoRef.current.srcObject = cameraStream;
        void videoRef.current.play();
      }
    }).catch(() => setCameraError("Não foi possível acessar a câmera. Verifique as permissões do navegador ou digite o nome manualmente."));
    return () => {
      disposed = true;
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [cameraOpen]);

  async function scanProductName() {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) {
      setCameraError("A câmera ainda não está pronta. Aguarde a imagem aparecer e tente novamente.");
      return;
    }
    setScanning(true);
    setCameraError("");
    setScanMessage("Lendo o texto da embalagem...");
    try {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Não foi possível processar a imagem.");
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("por");
      try {
        const { data } = await worker.recognize(canvas);
        const productName = data.text.split(/\r?\n/).map((line) => line.replace(/[^\p{L}\p{N} .+()-]/gu, " ").replace(/\s+/g, " ").trim()).find((line) => line.length >= 2 && /\p{L}/u.test(line));
        if (!productName) throw new Error("Não encontrei um nome legível. Tente aproximar e melhorar a iluminação.");
        setForm((current) => ({ ...current, name: productName }));
        setScanMessage(`Nome reconhecido: ${productName}. Confira antes de cadastrar.`);
      } finally {
        await worker.terminate();
      }
    } catch (failure) {
      setCameraError(failure instanceof Error ? failure.message : "Não foi possível ler o texto da imagem.");
      setScanMessage("");
    } finally {
      setScanning(false);
    }
  }

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
    clearSessionValue(draftKey);
    setForm(initialForm);
    onSaved(result.data as MedicationRecord);
    onOpenChange(false);
  }

  return <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader><DialogTitle>{medication ? "Editar medicamento" : "Cadastrar medicamento"}</DialogTitle><DialogDescription>{medication ? "Atualize os dados de identificação e armazenamento." : "Cadastre um medicamento para acompanhar seu estoque."}</DialogDescription></DialogHeader>
        <form onSubmit={submit} className="grid gap-4">
          <div className="grid gap-2"><Label htmlFor="medication-name">Nome *</Label><Input id="medication-name" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required autoFocus /><Button type="button" variant="outline" className="w-fit gap-2" onClick={() => setCameraOpen(true)}><Camera className="size-4" />Abrir câmera e digitalizar nome</Button>{scanMessage && <p role="status" className="text-sm text-emerald-700">{scanMessage}</p>}</div>
          <div className="grid gap-2 sm:grid-cols-3"><div className="grid gap-2"><Label htmlFor="medication-unit">Unidade *</Label><Select value={form.unit} onValueChange={(unit: MedicationUnit) => setForm((current) => ({ ...current, unit }))}><SelectTrigger id="medication-unit"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(unitLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div><div className="grid gap-2"><Label htmlFor="medication-unit-price">Valor unitário *</Label><Input id="medication-unit-price" type="number" min="0" step="0.01" value={form.unit_price} onChange={(event) => setForm((current) => ({ ...current, unit_price: Number(event.target.value) }))} required /></div><div className="grid gap-2"><Label htmlFor="medication-supplier">Fornecedor</Label><Input id="medication-supplier" value={form.supplier ?? ""} onChange={(event) => setForm((current) => ({ ...current, supplier: event.target.value }))} /></div></div>
          <div className="grid gap-2"><Label htmlFor="medication-notes">Observações</Label><Textarea id="medication-notes" value={form.notes ?? ""} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} rows={3} /></div>
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          <DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button type="submit" disabled={saving} className="bg-[#2f8f82] text-white hover:bg-[#26796e]">{saving && <Loader2 className="mr-2 size-4 animate-spin" />}{medication ? "Salvar alterações" : "Cadastrar medicamento"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    <Dialog open={cameraOpen} onOpenChange={setCameraOpen}>
      <DialogContent className="sm:max-w-xl"><DialogHeader><DialogTitle>Digitalizar nome do produto</DialogTitle><DialogDescription>Posicione o rótulo com boa iluminação. O texto reconhecido será preenchido no campo Nome para você conferir.</DialogDescription></DialogHeader><video ref={videoRef} autoPlay playsInline muted className="max-h-[55vh] w-full rounded-lg bg-black object-contain" />{cameraError && <p role="alert" className="text-sm text-red-700">{cameraError}</p>}{scanning && <p role="status" className="text-sm text-slate-600">Processando imagem em português…</p>}<DialogFooter><Button type="button" variant="outline" onClick={() => setCameraOpen(false)}>Fechar câmera</Button><Button type="button" disabled={scanning} onClick={() => void scanProductName()} className="gap-2 bg-[#2f8f82] text-white hover:bg-[#26796e]">{scanning && <Loader2 className="size-4 animate-spin" />}<Camera className="size-4" />{scanning ? "Digitalizando…" : "Capturar e ler nome"}</Button></DialogFooter></DialogContent>
    </Dialog>
  </>;
}

function MovementDialog({ medication, movement, medications, movements, open, onOpenChange, onSaved }: { medication: MedicationRecord | null; movement: MedicationMovementRecord | null; medications: MedicationRecord[]; movements: MedicationMovementRecord[]; open: boolean; onOpenChange: (open: boolean) => void; onSaved: (movement: MedicationMovementRecord) => void }) {
  const { user } = useAuth();
  const draftKey = `admin-medications:${user?.id ?? "anonymous"}:movement-form:${movement?.id ?? medication?.id ?? "new"}`;
  const [medicationId, setMedicationId] = useSessionStorageState(draftKey + ":medication", movement?.medication_id ?? medication?.id ?? medications[0]?.id ?? "");
  const [movementType, setMovementType] = useSessionStorageState<MedicationMovementType>(draftKey + ":type", movement?.movement_type ?? "entry");
  const [quantity, setQuantity] = useSessionStorageState(draftKey + ":quantity", movement ? String(movement.quantity) : "");
  const [batch, setBatch] = useSessionStorageState(draftKey + ":batch", movement?.batch ?? "");
  const [expirationDate, setExpirationDate] = useSessionStorageState(draftKey + ":expiration", movement?.expiration_date ?? "");
  const [movementDate, setMovementDate] = useSessionStorageState(draftKey + ":date", movement?.movement_date?.slice(0, 10) ?? new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useSessionStorageState(draftKey + ":notes", movement?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setError("");
    if (!medicationId && medications[0]) setMedicationId(medications[0].id);
  }, [open, medicationId, medications]);

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
    clearSessionValue(draftKey);
    setMedicationId(movement?.medication_id ?? medication?.id ?? medications[0]?.id ?? "");
    setMovementType(movement?.movement_type ?? "entry");
    setQuantity(movement ? String(movement.quantity) : "");
    setBatch(movement?.batch ?? "");
    setExpirationDate(movement?.expiration_date ?? "");
    setMovementDate(movement?.movement_date?.slice(0, 10) ?? new Date().toISOString().slice(0, 10));
    setNotes(movement?.notes ?? "");
    onSaved(result.data as MedicationMovementRecord);
    onOpenChange(false);
  }

  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>{movement ? "Editar movimentação" : "Registrar movimentação"}</DialogTitle><DialogDescription>Registre uma entrada ou saída para manter o estoque atualizado.</DialogDescription></DialogHeader><form onSubmit={submit} className="grid gap-4"><div className="grid gap-2"><Label htmlFor="movement-medication">Medicamento *</Label><Select value={medicationId} onValueChange={setMedicationId}><SelectTrigger id="movement-medication"><SelectValue placeholder="Selecione um medicamento" /></SelectTrigger><SelectContent>{medications.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select></div><div className="grid gap-4 sm:grid-cols-3"><div className="grid gap-2"><Label htmlFor="movement-type">Tipo *</Label><Select value={movementType} onValueChange={(value: MedicationMovementType) => setMovementType(value)}><SelectTrigger id="movement-type"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="entry">Entrada</SelectItem><SelectItem value="exit">Saída</SelectItem></SelectContent></Select></div><div className="grid gap-2"><Label htmlFor="movement-quantity">Quantidade *</Label><Input id="movement-quantity" type="number" min="0.01" step="any" value={quantity} onChange={(event) => setQuantity(event.target.value)} required /></div><div className="grid gap-2"><Label htmlFor="movement-date">Data *</Label><Input id="movement-date" type="date" value={movementDate} onChange={(event) => setMovementDate(event.target.value)} required /></div></div><div className="grid gap-4 sm:grid-cols-2"><div className="grid gap-2"><Label htmlFor="movement-batch">Lote</Label><Input id="movement-batch" value={batch} onChange={(event) => setBatch(event.target.value)} /></div><div className="grid gap-2"><Label htmlFor="movement-expiration">Validade</Label><Input id="movement-expiration" type="date" value={expirationDate} onChange={(event) => setExpirationDate(event.target.value)} /></div></div><div className="grid gap-2"><Label htmlFor="movement-notes">Observações</Label><Textarea id="movement-notes" value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} /></div>{error && <p role="alert" className="text-sm text-red-600">{error}</p>}<DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button type="submit" disabled={saving || medications.length === 0} className="bg-[#2f8f82] text-white hover:bg-[#26796e]">{saving && <Loader2 className="mr-2 size-4 animate-spin" />}{movement ? "Salvar alterações" : "Registrar movimentação"}</Button></DialogFooter></form></DialogContent></Dialog>;
}

function MedicationsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const storagePrefix = `admin-medications:${user?.id ?? "anonymous"}`;
  const [activeTab, setActiveTab] = useSessionStorageState(`${storagePrefix}:active-tab`, "estoque");
  const [search, setSearch] = useSessionStorageState(`${storagePrefix}:search`, "");
  const [movementFilter, setMovementFilter] = useSessionStorageState<MedicationMovementType | "all">(`${storagePrefix}:movement-filter`, "all");
  const [medications, setMedications] = useState<MedicationRecord[]>([]);
  const [movements, setMovements] = useState<MedicationMovementRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [observationPreviewOpen, setObservationPreviewOpen] = useSessionStorageState(`${storagePrefix}:observation-preview-open`, false);
  const [medicationDialogOpen, setMedicationDialogOpen] = useSessionStorageState(`${storagePrefix}:medication-dialog-open`, medicationUiState.medicationDialogOpen);
  const [movementDialogOpen, setMovementDialogOpen] = useSessionStorageState(`${storagePrefix}:movement-dialog-open`, medicationUiState.movementDialogOpen);
  const [selectedMedication, setSelectedMedication] = useSessionStorageState<MedicationRecord | null>(`${storagePrefix}:selected-medication`, medicationUiState.selectedMedication);
  const [selectedMovement, setSelectedMovement] = useSessionStorageState<MedicationMovementRecord | null>(`${storagePrefix}:selected-movement`, medicationUiState.selectedMovement);
  const [medicationToDelete, setMedicationToDelete] = useSessionStorageState<MedicationRecord | null>(`${storagePrefix}:medication-to-delete`, null);
  const [movementToDelete, setMovementToDelete] = useSessionStorageState<MedicationMovementRecord | null>(`${storagePrefix}:movement-to-delete`, null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const scrollKey = `${storagePrefix}:scroll-y`;
    let savedPosition = 0;
    try {
      savedPosition = Number(window.sessionStorage.getItem(scrollKey));
    } catch {
      savedPosition = 0;
    }
    requestAnimationFrame(() => window.scrollTo(0, Number.isFinite(savedPosition) ? savedPosition : 0));
    const savePosition = () => {
      try {
        window.sessionStorage.setItem(scrollKey, String(window.scrollY));
      } catch {
        return;
      }
    };
    window.addEventListener("scroll", savePosition, { passive: true });
    return () => window.removeEventListener("scroll", savePosition);
  }, [storagePrefix]);

  useEffect(() => {
    medicationUiState = { medicationDialogOpen, movementDialogOpen, selectedMedication, selectedMovement };
  }, [medicationDialogOpen, movementDialogOpen, selectedMedication, selectedMovement]);

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

  useEffect(() => {
    setMedications((current) => [...current].sort((a, b) => stockFor(b.id, movements) - stockFor(a.id, movements) || a.name.localeCompare(b.name)));
  }, [movements]);

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

  async function generateObservationsPdf() {
    setError("");
    try {
      await downloadDocumentPdf(observationPdfPages(medications), `relatorio-observacoes-medicamentos-${new Date().toISOString().slice(0, 10)}`, true);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Não foi possível gerar o PDF das observações.");
    }
  }

  const Tabs = (props: ComponentProps<typeof BaseTabs>) => (
    <BaseTabs {...props} value={activeTab} onValueChange={setActiveTab} />
  );
  const TabsList = ({ children, ...props }: ComponentProps<typeof BaseTabsList>) => (
    <BaseTabsList {...props}>
      {children}
      <TabsTrigger value="observacoes" className="rounded-lg bg-white px-4 py-2.5 data-[state=active]:bg-[#e3f3ef] data-[state=active]:text-[#216d64]">Relatório de Observações</TabsTrigger>
    </BaseTabsList>
  );
  const TabsContent = ({ value, children, ...props }: ComponentProps<typeof BaseTabsContent>) => (
    <>
      <BaseTabsContent value={value} {...props}>{children}</BaseTabsContent>
      {value === "relatorio" && <BaseTabsContent value="observacoes">
        <SectionCard title="Relatório de Observações" className="mt-0">
          <div className="mb-4 flex flex-wrap justify-end gap-2">
            <Button type="button" variant="outline" disabled={medications.length === 0} onClick={() => setObservationPreviewOpen(true)}><Eye className="mr-2 size-4" />Visualizar</Button>
            <Button type="button" disabled={medications.length === 0} onClick={() => void generateObservationsPdf()} className="bg-[#2f8f82] text-white hover:bg-[#26796e]"><Download className="mr-2 size-4" />Gerar PDF</Button>
          </div>
          {medications.length === 0 ? <EmptyState title="Nenhum medicamento cadastrado" description="Cadastre medicamentos para consultar suas observações aqui." /> : <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-left text-sm"><thead><tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400"><th className="px-3 py-3 font-medium">Nome do produto</th><th className="px-3 py-3 font-medium">Observação</th></tr></thead><tbody>{medications.map((medication) => <tr key={medication.id} className="border-b border-slate-50 last:border-0"><td className="px-3 py-3 font-medium text-slate-700">{medication.name}</td><td className="whitespace-pre-wrap px-3 py-3 text-slate-600">{medication.notes?.trim() || "—"}</td></tr>)}</tbody></table></div>}
        </SectionCard>
        <Dialog open={observationPreviewOpen} onOpenChange={setObservationPreviewOpen}>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
            <DialogHeader><DialogTitle>Visualização — Relatório de Observações</DialogTitle><DialogDescription>Confira os produtos e observações antes de gerar o PDF.</DialogDescription></DialogHeader>
            <div className="overflow-x-auto rounded-lg border border-slate-200"><table className="w-full min-w-[500px] text-left text-sm"><thead><tr className="border-b bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><th className="px-3 py-3 font-medium">Nome do produto</th><th className="px-3 py-3 font-medium">Observação</th></tr></thead><tbody>{medications.map((medication) => <tr key={medication.id} className="border-b last:border-0"><td className="px-3 py-3 align-top font-medium text-slate-700">{medication.name}</td><td className="whitespace-pre-wrap px-3 py-3 text-slate-600">{medication.notes?.trim() || "—"}</td></tr>)}</tbody></table></div>
            <div className="flex justify-end"><Button type="button" onClick={() => void generateObservationsPdf()} className="bg-[#2f8f82] text-white hover:bg-[#26796e]"><Download className="mr-2 size-4" />Gerar PDF</Button></div>
          </DialogContent>
        </Dialog>
      </BaseTabsContent>}
    </>
  );

  useEffect(() => {
    const attachReportControls = () => {
      const table = Array.from(document.querySelectorAll("table")).find((candidate) => Array.from(candidate.querySelectorAll("th")).some((header) => header.textContent?.trim().toLowerCase() === "nome do produto"));
      if (!table) return;
      const headerRow = table.querySelector("thead tr");
      if (headerRow && !headerRow.querySelector("[data-medication-report-actions-heading]")) {
        const heading = document.createElement("th");
        heading.dataset.medicationReportActionsHeading = "true";
        heading.className = "px-2 py-3 text-right font-medium";
        heading.textContent = "Ações";
        headerRow.appendChild(heading);
      }
      Array.from(table.querySelectorAll("tbody tr")).forEach((row) => {
        if (row.querySelector("[data-medication-report-actions]")) return;
        const name = row.querySelector("td")?.textContent?.trim();
        const medication = medications.find((item) => item.name === name);
        if (!medication) return;
        const cell = document.createElement("td");
        cell.dataset.medicationReportActions = "true";
        cell.className = "whitespace-nowrap px-2 py-3 text-right";
        const edit = document.createElement("button");
        edit.type = "button";
        edit.textContent = "Editar";
        edit.className = "mr-2 rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50";
        edit.addEventListener("click", () => openMedicationDialog(medication));
        const move = document.createElement("button");
        move.type = "button";
        move.textContent = "Movimentar";
        move.className = "rounded-md border border-[#b9ded5] px-2 py-1 text-xs font-medium text-[#26796e] hover:bg-[#e3f3ef]";
        move.addEventListener("click", () => openMovementDialog(medication));
        cell.append(edit, move);
        row.appendChild(cell);
      });
    };
    attachReportControls();
    const observer = new MutationObserver(attachReportControls);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [medications, movements]);

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
  const inventorySubtotal = medications.reduce((total, medication) => total + medication.unit_price * stockFor(medication.id, movements), 0);
  const quantitySubtotal = medications.reduce((total, medication) => total + stockFor(medication.id, movements), 0);

  return <AdminLayout><PageIntro eyebrow="Estoque" title="Controle de medicamentos" description="Cadastre medicamentos, acompanhe o estoque atual e mantenha o histórico de entradas e saídas." action={<div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => openMovementDialog()} disabled={medications.length === 0} className="gap-2 border-[#b9ded5] text-[#26796e]"><History className="size-4" /> Registrar movimentação</Button><Button onClick={() => openMedicationDialog()} className="gap-2 bg-[#2f8f82] text-white hover:bg-[#26796e]"><Plus className="size-4" /> Novo medicamento</Button></div>} /><AdminNotice />{error && <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">Não foi possível concluir a operação: {error}</p>}{loading || authLoading ? <div className="flex min-h-48 items-center justify-center text-sm text-slate-500"><Loader2 className="mr-2 size-4 animate-spin" /> Carregando estoque...</div> : !user ? <div className="mt-6"><EmptyState title="Sessão necessária" description="Entre na sua conta para consultar o controle de medicamentos." /></div> : <Tabs defaultValue="estoque" className="mt-6"><TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto bg-transparent p-0"><TabsTrigger value="estoque" className="rounded-lg bg-white px-4 py-2.5 data-[state=active]:bg-[#e3f3ef] data-[state=active]:text-[#216d64]">Controle de estoque</TabsTrigger><TabsTrigger value="relatorio" className="rounded-lg bg-white px-4 py-2.5 data-[state=active]:bg-[#e3f3ef] data-[state=active]:text-[#216d64]">Relatório de estoque</TabsTrigger></TabsList><TabsContent value="estoque"><div className="flex flex-col gap-3 sm:flex-row"><div className="relative flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><Input aria-label="Buscar medicamento" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar medicamento ou fornecedor" className="h-10 border-slate-200 bg-white pl-9 shadow-none" /></div><Select value={movementFilter} onValueChange={(value: MedicationMovementType | "all") => setMovementFilter(value)}><SelectTrigger aria-label="Filtrar histórico por tipo" className="h-10 w-full bg-white sm:w-52"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todas movimentações</SelectItem><SelectItem value="entry">Somente entradas</SelectItem><SelectItem value="exit">Somente saídas</SelectItem></SelectContent></Select></div><section className="mt-6"><div className="mb-3 flex items-center justify-between"><h3 className="font-display text-lg font-semibold text-slate-800">Estoque atual</h3><span className="text-sm text-slate-500">{visibleMedications.length} medicamento(s)</span></div>{visibleMedications.length === 0 ? <EmptyState title={medications.length === 0 ? "Nenhum medicamento cadastrado" : "Nenhum medicamento encontrado"} description={medications.length === 0 ? "Cadastre o primeiro medicamento para começar a controlar seu estoque." : "Tente buscar por outro nome ou fornecedor."} action={medications.length === 0 ? <Button onClick={() => openMedicationDialog()} className="gap-2 bg-[#2f8f82] text-white hover:bg-[#26796e]"><Plus className="size-4" /> Cadastrar medicamento</Button> : undefined} /> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{visibleMedications.map((medication) => { const stock = stockFor(medication.id, movements); return <Card key={medication.id} className="border-slate-200/80 shadow-sm"><CardContent className="p-5"><div className="flex items-start justify-between gap-3"><div className="grid size-11 place-items-center rounded-xl bg-[#e3f3ef] text-[#2f8f82]"><Pill className="size-5" /></div><div className="flex gap-1"><Button variant="ghost" size="icon" onClick={() => openMedicationDialog(medication)} aria-label={`Editar ${medication.name}`}><Pencil className="size-4" /></Button><Button variant="ghost" size="icon" onClick={() => setMedicationToDelete(medication)} aria-label={`Excluir ${medication.name}`} className="text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="size-4" /></Button></div></div><h4 className="mt-4 font-display text-lg font-semibold text-slate-800">{medication.name}</h4><p className="mt-1 text-sm text-slate-500">{unitLabels[medication.unit]}{medication.supplier ? ` · ${medication.supplier}` : ""}</p><p className="mt-2 text-sm font-medium text-[#26796e]">Valor unitário: {formatCurrency(medication.unit_price)}</p><div className="mt-5 flex items-end justify-between border-t border-slate-100 pt-4"><div><p className="text-xs uppercase tracking-wide text-slate-400">Estoque atual</p><p className={`mt-1 text-2xl font-semibold ${stock < 0 ? "text-red-600" : "text-[#26796e]"}`}>{stock} <span className="text-sm font-medium">{unitLabels[medication.unit].toLowerCase()}</span></p></div><Button size="sm" variant="outline" onClick={() => openMovementDialog(medication)} className="gap-1.5"><Plus className="size-3.5" /> Movimentar</Button></div></CardContent></Card>; })}</div>}</section><SectionCard title="Histórico detalhado" className="mt-8" action={<span className="text-xs font-normal text-slate-400">{visibleMovements.length} registro(s)</span>}>{visibleMovements.length === 0 ? <div className="py-8 text-center"><PackageOpen className="mx-auto size-8 text-slate-300" /><p className="mt-3 text-sm text-slate-500">Nenhuma movimentação encontrada.</p></div> : <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead><tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400"><th className="px-2 py-3 font-medium">Data</th><th className="px-2 py-3 font-medium">Medicamento</th><th className="px-2 py-3 font-medium">Tipo</th><th className="px-2 py-3 font-medium">Quantidade</th><th className="px-2 py-3 font-medium">Lote / validade</th><th className="px-2 py-3 font-medium">Observações</th><th className="px-2 py-3 text-right font-medium">Ações</th></tr></thead><tbody>{visibleMovements.map((movement) => <tr key={movement.id} className="border-b border-slate-50 last:border-0"><td className="px-2 py-3 text-slate-600">{formatDate(movement.movement_date)}<span className="block text-xs text-slate-400">{formatDateTime(movement.created_at)}</span></td><td className="px-2 py-3 font-medium text-slate-700">{medicationName(movement.medication_id)}</td><td className={`px-2 py-3 font-medium ${movement.movement_type === "entry" ? "text-[#26796e]" : "text-amber-700"}`}><span className="inline-flex items-center gap-1.5">{movement.movement_type === "entry" ? <ArrowDownToLine className="size-3.5" /> : <ArrowUpFromLine className="size-3.5" />}{movementLabels[movement.movement_type]}</span></td><td className="px-2 py-3 font-semibold text-slate-700">{movement.quantity}</td><td className="px-2 py-3 text-slate-500">{movement.batch || "—"}<span className="block text-xs text-slate-400">{formatDate(movement.expiration_date)}</span></td><td className="max-w-48 truncate px-2 py-3 text-slate-500">{movement.notes || "—"}</td><td className="px-2 py-3 text-right"><div className="flex justify-end gap-1"><Button variant="ghost" size="icon" onClick={() => openMovementDialog(undefined, movement)} aria-label="Editar movimentação"><Edit3 className="size-4" /></Button><Button variant="ghost" size="icon" onClick={() => setMovementToDelete(movement)} aria-label="Excluir movimentação" className="text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="size-4" /></Button></div></td></tr>)}</tbody></table></div>}</SectionCard></TabsContent><TabsContent value="relatorio"><SectionCard title="Relatório de estoque" className="mt-0"><p className="mb-4 text-sm text-slate-500">Resumo do estoque atual e das validades informadas nas entradas.</p>{medications.length === 0 ? <EmptyState title="Nenhum medicamento cadastrado" description="Cadastre o primeiro medicamento para começar a controlar seu estoque." /> : <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead><tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400"><th className="px-2 py-3 font-medium">Nome do produto</th><th className="px-2 py-3 font-medium">Estoque atual</th><th className="px-2 py-3 font-medium">Valor unitário</th><th className="px-2 py-3 font-medium">Valor total</th><th className="px-2 py-3 font-medium">Data de validade</th></tr></thead><tbody>{medications.map((medication) => <tr key={medication.id} className="border-b border-slate-50 last:border-0"><td className="px-2 py-3 font-medium text-slate-700">{medication.name}</td><td className="px-2 py-3 font-semibold text-[#26796e]">{stockFor(medication.id, movements)}</td><td className="px-2 py-3 text-slate-600">{formatCurrency(medication.unit_price)}</td><td className="px-2 py-3 font-semibold text-slate-700">{formatCurrency(medication.unit_price * stockFor(medication.id, movements))}</td><td className="px-2 py-3 text-slate-500">{formatNearestExpiration(medication.id, movements)}</td></tr>)}</tbody>
    <tfoot>
      <tr className="border-t-2 border-slate-200">
        <th scope="row" className="px-2 py-3 font-semibold text-slate-700">Subtotal</th>
        <td className="px-2 py-3 font-semibold text-[#26796e]">{quantitySubtotal.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}</td>
        <td className="px-2 py-3"></td>
        <td className="px-2 py-3 font-semibold text-[#26796e]">{formatCurrency(inventorySubtotal)}</td>
        <td className="px-2 py-3"></td>
      </tr>
    </tfoot>
  </table></div>}</SectionCard></TabsContent></Tabs>}<MedicationDialog medication={selectedMedication} open={medicationDialogOpen} onOpenChange={setMedicationDialogOpen} onSaved={handleMedicationSaved} /><MovementDialog medication={selectedMedication} movement={selectedMovement} medications={medications} movements={movements} open={movementDialogOpen} onOpenChange={setMovementDialogOpen} onSaved={handleMovementSaved} /><AlertDialog open={Boolean(medicationToDelete)} onOpenChange={(open) => { if (!open && !deleting) setMedicationToDelete(null); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Excluir medicamento?</AlertDialogTitle><AlertDialogDescription>Esta ação não pode ser desfeita. O medicamento{medicationToDelete ? ` “${medicationToDelete.name}”` : ""} será removido permanentemente e o histórico relacionado também será removido (FK cascade).</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => void confirmMedicationDelete()} disabled={deleting} className="bg-red-600 hover:bg-red-700">{deleting && <Loader2 className="mr-2 size-4 animate-spin" />} Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog><AlertDialog open={Boolean(movementToDelete)} onOpenChange={(open) => { if (!open && !deleting) setMovementToDelete(null); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Excluir movimentação?</AlertDialogTitle><AlertDialogDescription>Esta ação não pode ser desfeita. O registro será removido do histórico e recalculará o estoque.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => void confirmMovementDelete()} disabled={deleting} className="bg-red-600 hover:bg-red-700">{deleting && <Loader2 className="mr-2 size-4 animate-spin" />} Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></AdminLayout>;
}

export default MedicationsPage;
