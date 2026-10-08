import { createFileRoute, useParams } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PatientPhotoPicker } from "@/components/admin/patients/patient-photo";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/completar-cadastro/$token")({ component: CompleteRegistrationPage });

function CompleteRegistrationPage() {
  const { token } = useParams({ from: "/completar-cadastro/$token" });
  return <RegistrationForm key={token} token={token} />;
}

const fields: Array<[string, string, string]> = [
  ["data_nascimento", "Data de nascimento", "date"], ["email", "E-mail", "email"],
  ["telefone", "Telefone", "tel"], ["cpf", "CPF", "text"], ["cep", "CEP", "text"],
  ["endereco", "Endereço", "text"], ["numero", "Número", "text"], ["complemento", "Complemento", "text"],
  ["bairro", "Bairro", "text"], ["cidade", "Cidade", "text"], ["estado", "Estado", "text"],
];
const emergencyFields: Array<[string, string]> = [
  ["contato_emergencia_nome", "Contato de emergência"],
  ["contato_emergencia_parentesco", "Parentesco"],
  ["contato_emergencia_telefone", "Telefone de emergência"],
];

function RegistrationForm({ token }: { token: string }) {
  const [form, setForm] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);

  function update(field: string, value: string) {
    const digits = value.replace(/\D/g, "");
    const formatted = field === "cpf" ? digits.slice(0, 11).replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2")
      : field.includes("telefone") ? digits.slice(0, 11).replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2")
      : field === "cep" ? digits.slice(0, 8).replace(/(\d{5})(\d)/, "$1-$2") : value;
    setForm(current => ({ ...current, [field]: formatted }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (saving || photoBusy || completed) return;
    setSaving(true);
    setMessage("");
    let saved = false;
    try {
      const { error } = await supabase.rpc("complete_patient_registration", { p_token: token, p_data: form });
      if (error) { setMessage("Não foi possível salvar. Confira os dados e se o link ainda está válido."); return; }
      saved = true;
      if (photo) {
        const body = new FormData();
        body.append('token', token);
        body.append('photo', photo);
        const { error: photoError } = await supabase.functions.invoke('patient-photo', { body });
        if (photoError) throw photoError;
      }
      setCompleted(true);
      setMessage("Cadastro atualizado com sucesso. Você já pode fechar esta página.");
    } catch {
      setMessage(saved ? "Seus dados foram salvos, mas a foto não foi enviada. Tente enviar novamente para concluir a foto." : "Não foi possível enviar o cadastro. Verifique sua conexão e tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  return <main className="min-h-screen bg-[#f4faf8] px-4 py-10">
    <Card className="mx-auto max-w-2xl">
      <CardHeader><CardTitle>Complete seu cadastro</CardTitle><p className="text-sm text-slate-500">Preencha seus dados para enviá-los ao consultório com segurança. Você também pode incluir sua foto, se desejar.</p></CardHeader>
      <CardContent>
        <form onSubmit={submit} className="grid gap-5">
          <fieldset disabled={saving || completed || photoBusy} className="grid gap-5">
            <PatientPhotoPicker file={photo} onChange={setPhoto} onBusyChange={setPhotoBusy} disabled={saving || completed} />
            <div className="grid gap-2"><Label htmlFor="registration-name">Nome completo</Label><Input id="registration-name" required value={form['nome'] ?? ""} onChange={event => update("nome", event.target.value)} /></div>
            <div className="grid gap-3 sm:grid-cols-2">{fields.map(([key, label, type]) => <div className="grid gap-2" key={key}><Label htmlFor={`registration-${key}`}>{label}</Label><Input id={`registration-${key}`} type={type} value={form[key] ?? ""} onChange={event => update(key, event.target.value)} /></div>)}</div>
            <div className="grid gap-2"><Label htmlFor="registration-reason">Queixa principal / motivo do atendimento</Label><Textarea id="registration-reason" value={form['queixa_principal'] ?? ""} onChange={event => update("queixa_principal", event.target.value)} /></div>
            <div className="grid gap-2"><Label htmlFor="registration-notes">Observações iniciais</Label><Textarea id="registration-notes" value={form['observacoes_iniciais'] ?? ""} onChange={event => update("observacoes_iniciais", event.target.value)} /></div>
            <div className="grid gap-3 sm:grid-cols-3">{emergencyFields.map(([key, label]) => <Input key={key} aria-label={label} placeholder={label} value={form[key] ?? ""} onChange={event => update(key, event.target.value)} />)}</div>
          </fieldset>
          {message && <p role="status" className={completed ? "text-sm text-emerald-700" : "text-sm text-red-600"}>{message}</p>}
          <Button type="submit" disabled={saving || photoBusy || completed} className="w-fit bg-[#2f8f82] hover:bg-[#26796e]">{saving ? "Enviando..." : completed ? "Cadastro enviado" : "Enviar cadastro"}</Button>
        </form>
      </CardContent>
    </Card>
  </main>;
}

export default CompleteRegistrationPage;
