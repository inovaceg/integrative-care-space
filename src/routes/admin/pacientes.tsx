import { createFileRoute, Link } from "@tanstack/react-router";
import { Eye, Loader2, Pencil, Trash2, UserRoundPlus } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { AdminLayout, EmptyState, PageIntro, PatientAvatar, SearchInput, StatusBadge } from "@/components/admin/admin-ui";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createPatient, deletePatient, fetchPatient, fetchPatients, updatePatient, type PatientInput, type PatientRecord } from "@/lib/admin/records";

export const Route = createFileRoute("/admin/pacientes")({ component: PatientsPage });

const emptyPatient: PatientInput = {
  nome: "", data_nascimento: null, email: null, telefone: null, status: "pendente", cpf: null,
  cidade_estado: null, cep: null, endereco: null, numero: null, complemento: null, cidade: null,
  estado: null, nome_social: null, genero: null, pronomes: null, como_conheceu: null,
};

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "P";
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
    cidade: patient.cidade,
    estado: patient.estado,
    nome_social: patient.nome_social,
    genero: patient.genero,
    pronomes: patient.pronomes,
    como_conheceu: patient.como_conheceu,
  };
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
    setForm((current) => ({ ...current, [field]: value || null }));
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
          <div className="grid gap-2"><Label htmlFor="patient-name">Nome completo *</Label><Input id="patient-name" value={form.nome} onChange={(event) => update("nome", event.target.value)} autoComplete="name" required /></div>
          <div className="grid gap-3 sm:grid-cols-2"><div className="grid gap-2"><Label htmlFor="patient-birth">Data de nascimento</Label><Input id="patient-birth" type="date" value={form.data_nascimento ?? ""} onChange={(event) => update("data_nascimento", event.target.value)} /></div><div className="grid gap-2"><Label htmlFor="patient-status">Status</Label><Select value={form.status ?? "pendente"} onValueChange={(value) => update("status", value)}><SelectTrigger id="patient-status"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pendente">Pendente</SelectItem><SelectItem value="ativo">Ativo</SelectItem><SelectItem value="inativo">Inativo</SelectItem></SelectContent></Select></div></div>
          <div className="grid gap-3 sm:grid-cols-2"><div className="grid gap-2"><Label htmlFor="patient-email">E-mail</Label><Input id="patient-email" type="email" value={form.email ?? ""} onChange={(event) => update("email", event.target.value)} autoComplete="email" /></div><div className="grid gap-2"><Label htmlFor="patient-phone">Telefone</Label><Input id="patient-phone" value={form.telefone ?? ""} onChange={(event) => update("telefone", event.target.value)} autoComplete="tel" /></div></div>
          <div className="grid gap-3 sm:grid-cols-2"><div className="grid gap-2"><Label htmlFor="patient-cpf">CPF</Label><Input id="patient-cpf" value={form.cpf ?? ""} onChange={(event) => update("cpf", event.target.value)} /></div><div className="grid gap-2"><Label htmlFor="patient-social-name">Nome social</Label><Input id="patient-social-name" value={form.nome_social ?? ""} onChange={(event) => update("nome_social", event.target.value)} /></div></div>
          <div className="grid gap-3 sm:grid-cols-[1fr_120px]"><div className="grid gap-2"><Label htmlFor="patient-address">Endereço</Label><Input id="patient-address" value={form.endereco ?? ""} onChange={(event) => update("endereco", event.target.value)} autoComplete="street-address" /></div><div className="grid gap-2"><Label htmlFor="patient-number">Número</Label><Input id="patient-number" value={form.numero ?? ""} onChange={(event) => update("numero", event.target.value)} /></div></div>
          <div className="grid gap-3 sm:grid-cols-3"><div className="grid gap-2"><Label htmlFor="patient-city">Cidade</Label><Input id="patient-city" value={form.cidade ?? ""} onChange={(event) => update("cidade", event.target.value)} /></div><div className="grid gap-2"><Label htmlFor="patient-state">Estado</Label><Input id="patient-state" maxLength={2} value={form.estado ?? ""} onChange={(event) => update("estado", event.target.value.toUpperCase())} /></div><div className="grid gap-2"><Label htmlFor="patient-zip">CEP</Label><Input id="patient-zip" value={form.cep ?? ""} onChange={(event) => update("cep", event.target.value)} autoComplete="postal-code" /></div></div>
        </fieldset>
        {loadingPatient && <p className="flex items-center text-sm text-slate-500"><Loader2 className="mr-2 size-4 animate-spin" /> Carregando dados do paciente...</p>}
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        <DialogFooter><Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving || loadingPatient}>Cancelar</Button><Button type="submit" disabled={saving || loadingPatient} className="bg-[#2f8f82] hover:bg-[#26796e]">{saving && <Loader2 className="mr-2 size-4 animate-spin" />} {editing ? "Salvar alterações" : "Salvar paciente"}</Button></DialogFooter>
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

  return <AlertDialog open={open} onOpenChange={(next) => { if (!deleting) { setOpen(next); if (next) setError(""); } }}>
    <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Excluir paciente?</AlertDialogTitle>
        <AlertDialogDescription>O cadastro de <strong>{patient.nome}</strong> será excluído. Essa ação não pode ser desfeita.</AlertDialogDescription>
      </AlertDialogHeader>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <AlertDialogFooter><AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel><AlertDialogAction onClick={(event) => { event.preventDefault(); void handleDelete(); }} disabled={deleting} className="bg-red-600 hover:bg-red-700">{deleting && <Loader2 className="mr-2 size-4 animate-spin" />} Excluir paciente</AlertDialogAction></AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>;
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

  return <AdminLayout><PageIntro eyebrow="Relacionamento" title="Pacientes" description="Uma visão simples e cuidadosa da sua base de pacientes." action={<PatientFormDialog onSaved={loadPatients} />} />{error && <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">Não foi possível carregar os pacientes: {error}</p>}<Card className="mt-6 border-slate-200/80 shadow-sm"><CardContent className="p-4 sm:p-5"><div className="flex flex-col gap-3 md:flex-row"><div className="flex-1"><SearchInput value={search} onChange={setSearch} placeholder="Buscar por nome, e-mail ou telefone" /></div><Select value={status} onValueChange={setStatus}><SelectTrigger className="h-10 w-full border-slate-200 bg-white md:w-[190px]"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">Todos os status</SelectItem><SelectItem value="pendente">Pendente</SelectItem><SelectItem value="ativo">Ativo</SelectItem><SelectItem value="inativo">Inativo</SelectItem></SelectContent></Select></div></CardContent></Card>{loading || authLoading ? <div className="mt-6 flex items-center justify-center rounded-xl border border-slate-200 bg-white p-12 text-sm text-slate-500"><Loader2 className="mr-2 size-4 animate-spin" /> Carregando pacientes...</div> : filteredPatients.length === 0 ? <div className="mt-6"><EmptyState title={patients.length ? "Nenhum paciente encontrado" : "Nenhum paciente cadastrado"} description={patients.length ? "Tente ajustar os filtros da busca." : "Cadastre o primeiro paciente para começar seu acompanhamento."} action={!patients.length ? <PatientFormDialog onSaved={loadPatients} /> : undefined} /></div> : <><div className="mt-4 hidden overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm md:block"><table className="w-full text-left text-sm"><thead className="border-b border-slate-100 bg-slate-50/70 text-xs uppercase tracking-wide text-slate-400"><tr><th className="px-5 py-3 font-medium">Paciente</th><th className="px-5 py-3 font-medium">Contato</th><th className="px-5 py-3 font-medium">Nascimento</th><th className="px-5 py-3 font-medium">Status</th><th className="px-5 py-3 text-right font-medium">Ação</th></tr></thead><tbody className="divide-y divide-slate-100">{filteredPatients.map((patient) => <tr key={patient.id} className="transition-colors hover:bg-slate-50/70"><td className="px-5 py-4"><Link to="/admin/pacientes/$id" params={{ id: patient.id }} className="flex items-center gap-3 hover:text-[#2f8f82]"><PatientAvatar initials={initials(patient.nome)} /><span className="font-medium">{patient.nome}</span></Link></td><td className="px-5 py-4 text-slate-500">{patient.email ?? patient.telefone ?? "—"}</td><td className="px-5 py-4 text-slate-500">{patient.data_nascimento ? new Date(`${patient.data_nascimento}T00:00:00`).toLocaleDateString("pt-BR") : "—"}</td><td className="px-5 py-4"><StatusBadge status={patient.status ?? "pendente"} /></td><td className="px-5 py-4 text-right"><div className="flex justify-end gap-1"><Button asChild variant="ghost" size="sm" className="text-[#2f8f82]" aria-label={`Abrir perfil de ${patient.nome}`}><Link to="/admin/pacientes/$id" params={{ id: patient.id }}><Eye className="mr-1.5 size-4" /> Abrir</Link></Button><PatientFormDialog onSaved={loadPatients} patient={patient} trigger={<Button variant="ghost" size="sm" className="text-slate-600 hover:text-[#2f8f82]" aria-label={`Editar paciente ${patient.nome}`}><Pencil className="mr-1.5 size-4" /> Editar</Button>} /><PatientDeleteDialog patient={patient} onDeleted={loadPatients} trigger={<Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700" aria-label={`Excluir paciente ${patient.nome}`}><Trash2 className="mr-1.5 size-4" /> Excluir</Button>} /></div></td></tr>)}</tbody></table></div><div className="mt-4 grid gap-3 md:hidden">{filteredPatients.map((patient) => <div key={patient.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-[#9bcfc4]"><Link to="/admin/pacientes/$id" params={{ id: patient.id }} className="block"><div className="flex items-start gap-3"><PatientAvatar initials={initials(patient.nome)} /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-medium text-slate-800">{patient.nome}</p><StatusBadge status={patient.status ?? "pendente"} /></div><p className="mt-1 text-xs text-slate-500">{patientAge(patient.data_nascimento)}{patient.email ? ` · ${patient.email}` : ""}</p></div></div></Link><div className="mt-3 flex justify-end gap-2 border-t border-slate-100 pt-3"><PatientFormDialog onSaved={loadPatients} patient={patient} trigger={<Button variant="outline" size="sm" className="gap-1.5" aria-label={`Editar paciente ${patient.nome}`}><Pencil className="size-4" /> Editar</Button>} /><PatientDeleteDialog patient={patient} onDeleted={loadPatients} trigger={<Button variant="outline" size="sm" className="gap-1.5 text-red-600 hover:text-red-700" aria-label={`Excluir paciente ${patient.nome}`}><Trash2 className="size-4" /> Excluir</Button>} /></div></div>)}</div></>}</AdminLayout>;
}
