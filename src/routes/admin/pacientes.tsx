import { createFileRoute, Link } from "@tanstack/react-router";
import { Clipboard, FileText, Link2, Loader2, Pencil, Trash2, UserRoundPlus } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { AdminLayout, EmptyState, PageIntro, PatientAvatar, SearchInput, StatusBadge } from "@/components/admin/admin-ui";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createPatient, deletePatient, fetchPatient, fetchPatients, generatePatientCompletionLink, updatePatient, type PatientInput, type PatientRecord } from "@/lib/admin/records";

export const Route = createFileRoute("/admin/pacientes")({ component: PatientsPage });

const emptyPatient: PatientInput = {
  nome: "", data_nascimento: null, email: null, telefone: null, status: "pendente", cpf: null,
  cidade_estado: null, cep: null, endereco: null, numero: null, complemento: null, bairro: null, cidade: null,
  estado: null, nome_social: null, genero: null, pronomes: null, area: null, queixa_principal: null,
  data_primeiro_atendimento: null, como_conheceu: null, observacoes_iniciais: null,
  contato_emergencia_nome: null, contato_emergencia_parentesco: null, contato_emergencia_telefone: null,
};

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "P";
}

function mask(value: string, kind: "cpf" | "phone" | "cep") {
  const digits = value.replace(/\D/g, "");
  if (kind === "cpf") return digits.slice(0, 11).replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  if (kind === "cep") return digits.slice(0, 8).replace(/(\d{5})(\d)/, "$1-$2");
  return digits.slice(0, 11).replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");
}

function patientAge(date: string | null) {
  if (!date) return "";
  const birth = new Date(`${date}T00:00:00`);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  if (today < new Date(today.getFullYear(), birth.getMonth(), birth.getDate())) age -= 1;
  return `${age} anos`;
}

function patientToInput(patient: PatientRecord): PatientInput {
  return {
    nome: patient.nome,
    data_nascimento: patient.data_nascimento,
    email: patient.email,
    telefone: patient.telefone,
    status: patient.status,
    cpf: patient.cpf,
    cidade_estado: patient.cidade_estado,
    cep: patient.cep,
    endereco: patient.endereco,
    numero: patient.numero,
    complemento: patient.complemento,
    bairro: patient.bairro,
    cidade: patient.cidade,
    estado: patient.estado,
    nome_social: patient.nome_social,
    genero: patient.genero,
    pronomes: patient.pronomes,
    area: patient.area,
    queixa_principal: patient.queixa_principal,
    data_primeiro_atendimento: patient.data_primeiro_atendimento,
    como_conheceu: patient.como_conheceu,
    observacoes_iniciais: patient.observacoes_iniciais,
    contato_emergencia_nome: patient.contato_emergencia_nome,
    contato_emergencia_parentesco: patient.contato_emergencia_parentesco,
    contato_emergencia_telefone: patient.contato_emergencia_telefone,
  };
}

function PatientAnamneseButton({ patient }: { patient: PatientRecord }) {
  const { user } = useAuth();
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState("");

  async function openQuestionnaire() {
    if (!user || opening) return;
    setOpening(true);
    setError("");
    try {
      const result = await generatePatientCompletionLink(user.id, patient.id);
      if (result.error || !result.token) throw result.error ?? new Error("Não foi possível gerar o link da anamnese.");
      const link = `${window.location.origin}/anamnese/${result.token}`;
      window.open(link, "_blank", "noopener,noreferrer");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Não foi possível abrir a anamnese.");
    } finally {
      setOpening(false);
    }
  }

  return <>
    <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => void openQuestionnaire()} disabled={opening || !user}>
      {opening ? <Loader2 className="size-4 animate-spin" /> : <FileText className="size-4" />} {opening ? "Abrindo..." : "Anamnese"}
    </Button>
    {error && <span role="alert" className="sr-only">{error}</span>}
  </>;
}

function PatientCompletionLinkButton({ patient, variant = "ghost" }: { patient: PatientRecord; variant?: "ghost" | "outline" }) {
  const { user } = useAuth();
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState("");
  const [link, setLink] = useState("");
  const [open, setOpen] = useState(false);

  async function generateLink() {
    if (!user || generating) return;
    setGenerating(true);
    setMessage("");
    try {
      const result = await generatePatientCompletionLink(user.id, patient.id);
      if (result.error || !result.token) {
        setMessage(result.error?.message ?? "Não foi possível gerar o link.");
        return;
      }
      const generatedLink = `${window.location.origin}/completar-cadastro/${result.token}`;
      setLink(generatedLink);
      try {
        await navigator.clipboard.writeText(generatedLink);
        setMessage("Link copiado. Ele expira em 7 dias.");
      } catch {
        setMessage("Não foi possível copiar automaticamente. Selecione o link abaixo para copiar.");
        setOpen(true);
      }
    } catch {
      setMessage("Não foi possível gerar o link.");
    } finally {
      setGenerating(false);
    }
  }

  return <>
    <Button type="button" variant={variant} size="sm" onClick={() => void generateLink()} disabled={generating || !user} className="gap-1.5" aria-label={`Gerar link para ${patient.nome}`}>
      {generating ? <Loader2 className="size-4 animate-spin" /> : <Link2 className="size-4" />} Gerar link
    </Button>
    {message && <span role="status" className={`text-xs ${message.startsWith("Não") ? "text-red-600" : "text-emerald-700"}`}>{message}</span>}
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader><DialogTitle>Link para completar cadastro</DialogTitle><DialogDescription>{message}</DialogDescription></DialogHeader>
        <div className="grid gap-2"><Label htmlFor={`completion-link-${patient.id}`}>Link</Label><Input id={`completion-link-${patient.id}`} value={link} readOnly onFocus={(event) => event.currentTarget.select()} /></div>
        <DialogFooter><Button type="button" variant="outline" onClick={() => setOpen(false)}>Fechar</Button><Button type="button" onClick={async () => { try { await navigator.clipboard.writeText(link); setMessage("Link copiado. Ele expira em 7 dias."); setOpen(false); } catch { setMessage("Não foi possível copiar. Selecione o link para copiar."); } }}><Clipboard className="mr-2 size-4" /> Copiar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </>;
}

type PatientFormDialogProps = {
  onSaved: () => Promise<void>;
  patient?: PatientRecord;
  trigger?: ReactNode;
};

function PatientFormDialog({ onSaved, patient, trigger }: PatientFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<PatientInput>(patient ? patientToInput(patient) : emptyPatient);
  const [saving, setSaving] = useState(false);
  const [loadingPatient, setLoadingPatient] = useState(false);
  const [error, setError] = useState("");
  const { user } = useAuth();
  const editing = Boolean(patient);

  function update(field: keyof PatientInput, value: string) {
    const formatted = field === "cpf" ? mask(value, "cpf") : field === "telefone" || field === "contato_emergencia_telefone" ? mask(value, "phone") : field === "cep" ? mask(value, "cep") : value;
    setForm((current) => ({ ...current, [field]: formatted || null }));
  }

  async function handleOpenChange(next: boolean) {
    if (!next && (saving || loadingPatient)) return;
    setOpen(next);
    if (!next) {
      setError("");
      return;
    }

    setError("");
    if (!patient) {
      setForm(emptyPatient);
      return;
    }
    if (!user) {
      setError("Não foi possível identificar o usuário.");
      return;
    }

    setLoadingPatient(true);
    const { data, error: queryError } = await fetchPatient(user.id, patient.id);
    setLoadingPatient(false);
    if (queryError || !data) {
      setError(queryError?.message ?? "Não foi possível carregar os dados do paciente.");
      return;
    }
    setForm(patientToInput(data as PatientRecord));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!user || !form.nome?.trim()) {
      setError("Informe o nome completo do paciente.");
      return;
    }
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) {
      setError("Informe um e-mail válido.");
      return;
    }
    setSaving(true);
    const input = { ...form, nome: form.nome.trim() };
    const { error: saveError } = patient
      ? await updatePatient(user.id, patient.id, input)
      : await createPatient(user.id, input);
    setSaving(false);
    if (saveError) {
      setError(saveError.message);
      return;
    }
    setForm(emptyPatient);
    setOpen(false);
    await onSaved();
  }

  const dialogTrigger = trigger ?? <Button className="gap-2 bg-[#2f8f82] text-white hover:bg-[#26796e]"><UserRoundPlus className="size-4" /> Novo paciente</Button>;

  return <Dialog open={open} onOpenChange={handleOpenChange}>
    <DialogTrigger asChild>{dialogTrigger}</DialogTrigger>
    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
      <DialogHeader>
        <DialogTitle>{editing ? "Editar paciente" : "Cadastrar paciente"}</DialogTitle>
        <DialogDescription>{editing ? "Altere os dados do paciente diretamente neste cadastro." : "Preencha os dados necessários para criar o cadastro."}</DialogDescription>
      </DialogHeader>
      <form onSubmit={submit} className="grid gap-4 py-2">
        <fieldset disabled={saving || loadingPatient} className="grid gap-4">
          <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4"><h3 className="font-display text-lg font-semibold text-slate-800">1. Dados pessoais</h3></div>
          <div className="grid gap-2"><Label htmlFor="patient-name">Nome completo *</Label><Input id="patient-name" value={form.nome} onChange={(event) => update("nome", event.target.value)} autoComplete="name" required /></div>
          <div className="grid gap-3 sm:grid-cols-2"><div className="grid gap-2"><Label htmlFor="patient-birth">Data de nascimento</Label><Input id="patient-birth" type="date" value={form.data_nascimento ?? ""} onChange={(event) => update("data_nascimento", event.target.value)} /></div><div className="grid gap-2"><Label htmlFor="patient-status">Status</Label><Select value={form.status ?? "pendente"} onValueChange={(value) => update("status", value)}><SelectTrigger id="patient-status"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pendente">Pendente</SelectItem><SelectItem value="ativo">Ativo</SelectItem><SelectItem value="inativo">Inativo</SelectItem></SelectContent></Select></div></div>
          <div className="grid gap-3 sm:grid-cols-2"><div className="grid gap-2"><Label htmlFor="patient-email">E-mail</Label><Input id="patient-email" type="email" value={form.email ?? ""} onChange={(event) => update("email", event.target.value)} autoComplete="email" /></div><div className="grid gap-2"><Label htmlFor="patient-phone">Telefone</Label><Input id="patient-phone" value={form.telefone ?? ""} onChange={(event) => update("telefone", event.target.value)} autoComplete="tel" /></div></div>
          <div className="grid gap-3 sm:grid-cols-2"><div className="grid gap-2"><Label htmlFor="patient-cpf">CPF</Label><Input id="patient-cpf" value={form.cpf ?? ""} onChange={(event) => update("cpf", event.target.value)} /></div><div className="grid gap-2"><Label htmlFor="patient-social-name">Nome social</Label><Input id="patient-social-name" value={form.nome_social ?? ""} onChange={(event) => update("nome_social", event.target.value)} /></div></div>
          <div className="grid gap-3 sm:grid-cols-[1fr_120px]"><div className="grid gap-2"><Label htmlFor="patient-address">Endereço</Label><Input id="patient-address" value={form.endereco ?? ""} onChange={(event) => update("endereco", event.target.value)} autoComplete="street-address" /></div><div className="grid gap-2"><Label htmlFor="patient-number">Número</Label><Input id="patient-number" value={form.numero ?? ""} onChange={(event) => update("numero", event.target.value)} /></div></div>
          <div className="rounded-xl border border-slate-100 p-4"><h3 className="mb-4 font-display text-lg font-semibold text-slate-800">3. Informações do atendimento</h3><div className="grid gap-3 sm:grid-cols-2"><div className="grid gap-2"><Label>Área</Label><Select value={form.area ?? ""} onValueChange={(value) => update("area", value)}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent><SelectItem value="Psicologia">Psicologia</SelectItem><SelectItem value="Biomedicina">Biomedicina</SelectItem></SelectContent></Select></div><div className="grid gap-2"><Label>Data do primeiro atendimento</Label><Input type="date" value={form.data_primeiro_atendimento ?? ""} onChange={(event) => update("data_primeiro_atendimento", event.target.value)} /></div></div><div className="mt-3 grid gap-2"><Label>Queixa principal / motivo do atendimento</Label><Textarea value={form.queixa_principal ?? ""} onChange={(event) => update("queixa_principal", event.target.value)} /></div><div className="mt-3 grid gap-2"><Label>Como conheceu o consultório</Label><Input value={form.como_conheceu ?? ""} onChange={(event) => update("como_conheceu", event.target.value)} /></div><div className="mt-3 grid gap-2"><Label>Observações iniciais</Label><Textarea value={form.observacoes_iniciais ?? ""} onChange={(event) => update("observacoes_iniciais", event.target.value)} /></div></div>
          <div className="rounded-xl border border-slate-100 p-4"><h3 className="mb-4 font-display text-lg font-semibold text-slate-800">4. Contato de emergência</h3><div className="grid gap-3 sm:grid-cols-3"><Input placeholder="Nome" value={form.contato_emergencia_nome ?? ""} onChange={(event) => update("contato_emergencia_nome", event.target.value)} /><Input placeholder="Parentesco" value={form.contato_emergencia_parentesco ?? ""} onChange={(event) => update("contato_emergencia_parentesco", event.target.value)} /><Input placeholder="Telefone" value={form.contato_emergencia_telefone ?? ""} onChange={(event) => update("contato_emergencia_telefone", event.target.value)} /></div></div>
          <div className="rounded-xl border border-slate-100 p-4"><h3 className="mb-4 font-display text-lg font-semibold text-slate-800">2. Endereço</h3><div className="grid gap-3 sm:grid-cols-2"><div className="grid gap-2"><Label htmlFor="patient-complement">Complemento</Label><Input id="patient-complement" value={form.complemento ?? ""} onChange={(event) => update("complemento", event.target.value)} /></div><div className="grid gap-2"><Label htmlFor="patient-neighborhood">Bairro</Label><Input id="patient-neighborhood" value={form.bairro ?? ""} onChange={(event) => update("bairro", event.target.value)} /></div></div></div>
        </fieldset>
        {loadingPatient && <p className="flex items-center text-sm text-slate-500"><Loader2 className="mr-2 size-4 animate-spin" /> Carregando dados do paciente...</p>}
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        <DialogFooter>{editing && patient && <PatientCompletionLinkButton patient={patient} variant="outline" />}<Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving || loadingPatient}>Cancelar</Button><Button type="submit" disabled={saving || loadingPatient} className="bg-[#2f8f82] hover:bg-[#26796e]">{saving && <Loader2 className="mr-2 size-4 animate-spin" />} {editing ? "Salvar alterações" : "Salvar paciente"}</Button></DialogFooter>
      </form>
    </DialogContent>
  </Dialog>;
}

type PatientDeleteDialogProps = {
  patient: PatientRecord;
  onDeleted: () => Promise<void>;
  trigger: ReactNode;
};

function PatientDeleteDialog({ patient, onDeleted, trigger }: PatientDeleteDialogProps) {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const { user } = useAuth();

  async function handleDelete() {
    if (!user) {
      setError("Não foi possível identificar o usuário.");
      return;
    }
    setError("");
    setDeleting(true);
    const { error: deleteError } = await deletePatient(user.id, patient.id);
    if (deleteError) {
      setDeleting(false);
      setError(deleteError.message);
      return;
    }
    await onDeleted();
    setDeleting(false);
    setOpen(false);
  }

  return <>
    <PatientCompletionLinkButton patient={patient} />
    <AlertDialog open={open} onOpenChange={(next) => { if (!deleting) { setOpen(next); if (next) setError(""); } }}>
    <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Excluir paciente?</AlertDialogTitle>
        <AlertDialogDescription>O cadastro de <strong>{patient.nome}</strong> será excluído. Essa ação não pode ser desfeita.</AlertDialogDescription>
      </AlertDialogHeader>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <AlertDialogFooter><AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel><AlertDialogAction onClick={(event) => { event.preventDefault(); void handleDelete(); }} disabled={deleting} className="bg-red-600 hover:bg-red-700">{deleting && <Loader2 className="mr-2 size-4 animate-spin" />} Excluir paciente</AlertDialogAction></AlertDialogFooter>
    </AlertDialogContent>
    </AlertDialog>
  </>;
}

function PatientsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");

  async function loadPatients() {
    if (!user) return;
    setLoading(true); setError("");
    const { data, error: queryError } = await fetchPatients(user.id);
    if (queryError) setError(queryError.message);
    setPatients((data as PatientRecord[] | null) ?? []);
    setLoading(false);
  }

  useEffect(() => { if (!authLoading) void loadPatients(); }, [authLoading, user?.id]);

  const filteredPatients = useMemo(() => patients.filter((patient) => `${patient.nome} ${patient.email ?? ""} ${patient.telefone ?? ""}`.toLowerCase().includes(search.toLowerCase()) && (status === "all" || (patient.status ?? "pendente") === status)), [patients, search, status]);

  return <AdminLayout><PageIntro eyebrow="Relacionamento" title="Pacientes" description="Uma visão simples e cuidadosa da sua base de pacientes." action={<PatientFormDialog onSaved={loadPatients} />} />{error && <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">Não foi possível carregar os pacientes: {error}</p>}<Card className="mt-6 border-slate-200/80 shadow-sm"><CardContent className="p-4 sm:p-5"><div className="flex flex-col gap-3 md:flex-row"><div className="flex-1"><SearchInput value={search} onChange={setSearch} placeholder="Buscar por nome, e-mail ou telefone" /></div><Select value={status} onValueChange={setStatus}><SelectTrigger className="h-10 w-full border-slate-200 bg-white md:w-[190px]"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">Todos os status</SelectItem><SelectItem value="pendente">Pendente</SelectItem><SelectItem value="ativo">Ativo</SelectItem><SelectItem value="inativo">Inativo</SelectItem></SelectContent></Select></div></CardContent></Card>{loading || authLoading ? <div className="mt-6 flex items-center justify-center rounded-xl border border-slate-200 bg-white p-12 text-sm text-slate-500"><Loader2 className="mr-2 size-4 animate-spin" /> Carregando pacientes...</div> : filteredPatients.length === 0 ? <div className="mt-6"><EmptyState title={patients.length ? "Nenhum paciente encontrado" : "Nenhum paciente cadastrado"} description={patients.length ? "Tente ajustar os filtros da busca." : "Cadastre o primeiro paciente para começar seu acompanhamento."} action={!patients.length ? <PatientFormDialog onSaved={loadPatients} /> : undefined} /></div> : <><div className="mt-4 hidden overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm md:block"><table className="w-full text-left text-sm"><thead className="border-b border-slate-100 bg-slate-50/70 text-xs uppercase tracking-wide text-slate-400"><tr><th className="px-5 py-3 font-medium">Paciente</th><th className="px-5 py-3 font-medium">Contato</th><th className="px-5 py-3 font-medium">Nascimento</th><th className="px-5 py-3 font-medium">Status</th><th className="px-5 py-3 text-right font-medium">Ações</th></tr></thead><tbody className="divide-y divide-slate-100">{filteredPatients.map((patient) => <tr key={patient.id} className="transition-colors hover:bg-slate-50/70"><td className="px-5 py-4"><Link to="/admin/pacientes/$id" params={{ id: patient.id }} className="flex items-center gap-3 hover:text-[#2f8f82]"><PatientAvatar initials={initials(patient.nome)} /><span className="font-medium">{patient.nome}</span></Link></td><td className="px-5 py-4 text-slate-500">{patient.email ?? patient.telefone ?? "—"}</td><td className="px-5 py-4 text-slate-500">{patient.data_nascimento ? new Date(`${patient.data_nascimento}T00:00:00`).toLocaleDateString("pt-BR") : "—"}</td><td className="px-5 py-4"><StatusBadge status={patient.status ?? "pendente"} /></td><td className="px-5 py-4 text-right"><div className="flex justify-end gap-1"><PatientAnamneseButton patient={patient} /><PatientFormDialog onSaved={loadPatients} patient={patient} trigger={<Button variant="ghost" size="sm" className="text-slate-600 hover:text-[#2f8f82]" aria-label={`Editar paciente ${patient.nome}`}><Pencil className="mr-1.5 size-4" /> Editar</Button>} /><PatientDeleteDialog patient={patient} onDeleted={loadPatients} trigger={<Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700" aria-label={`Excluir paciente ${patient.nome}`}><Trash2 className="mr-1.5 size-4" /> Excluir</Button>} /></div></td></tr>)}</tbody></table></div><div className="mt-4 grid gap-3 md:hidden">{filteredPatients.map((patient) => <div key={patient.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-[#9bcfc4]"><Link to="/admin/pacientes/$id" params={{ id: patient.id }} className="block"><div className="flex items-start gap-3"><PatientAvatar initials={initials(patient.nome)} /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-medium text-slate-800">{patient.nome}</p><StatusBadge status={patient.status ?? "pendente"} /></div><p className="mt-1 text-xs text-slate-500">{patientAge(patient.data_nascimento)}{patient.email ? ` · ${patient.email}` : ""}</p></div></div></Link><div className="mt-3 flex justify-end gap-2 border-t border-slate-100 pt-3"><Button asChild variant="outline" size="sm" className="gap-1.5"><a href={`/admin/pacientes/${patient.id}?tab=anamnese`}><FileText className="size-4" /> Anamnese</a></Button><PatientFormDialog onSaved={loadPatients} patient={patient} trigger={<Button variant="outline" size="sm" className="gap-1.5" aria-label={`Editar paciente ${patient.nome}`}><Pencil className="size-4" /> Editar</Button>} /><PatientDeleteDialog patient={patient} onDeleted={loadPatients} trigger={<Button variant="outline" size="sm" className="gap-1.5 text-red-600 hover:text-red-700" aria-label={`Excluir paciente ${patient.nome}`}><Trash2 className="size-4" /> Excluir</Button>} /></div></div>)}</div></>}</AdminLayout>;
}
