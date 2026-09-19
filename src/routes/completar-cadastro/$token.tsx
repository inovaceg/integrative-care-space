import { createFileRoute, useParams } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/completar-cadastro/$token")({ component: CompleteRegistrationPage });

function CompleteRegistrationPage() {
  const { token } = useParams({ from: "/completar-cadastro/$token" });
  const [form, setForm] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const update = (field: string, value: string) => { const digits = value.replace(/\D/g, ""); const formatted = field === "cpf" ? digits.slice(0, 11).replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2") : field.includes("telefone") ? digits.slice(0, 11).replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2") : field === "cep" ? digits.slice(0, 8).replace(/(\d{5})(\d)/, "$1-$2") : value; setForm((current) => ({ ...current, [field]: formatted })); };
  async function submit(event: FormEvent) {
    event.preventDefault(); setSaving(true); setMessage("");
    const { error } = await supabase.rpc("complete_patient_registration", { p_token: token, p_data: form });
    setSaving(false); setMessage(error ? "Este link é inválido ou expirou." : "Cadastro atualizado com sucesso. Você já pode fechar esta página.");
  }
  return <main className="min-h-screen bg-[#f4faf8] px-4 py-10"><Card className="mx-auto max-w-2xl"><CardHeader><CardTitle>Complete seu cadastro</CardTitle><p className="text-sm text-slate-500">Preencha seus dados para enviá-los ao consultório com segurança.</p></CardHeader><CardContent><form onSubmit={submit} className="grid gap-5"><div className="grid gap-2"><Label>Nome completo</Label><Input required value={form.nome ?? ""} onChange={(e) => update("nome", e.target.value)} /></div><div className="grid gap-3 sm:grid-cols-2">{[["data_nascimento","Data de nascimento","date"],["email","E-mail","email"],["telefone","Telefone","tel"],["cpf","CPF","text"],["cep","CEP","text"],["endereco","Endereço","text"],["numero","Número","text"],["complemento","Complemento","text"],["bairro","Bairro","text"],["cidade","Cidade","text"],["estado","Estado","text"]].map(([key,label,type]) => <div className="grid gap-2" key={key}><Label>{label}</Label><Input type={type} value={form[key] ?? ""} onChange={(e) => update(key, e.target.value)} /></div>)}</div><div className="grid gap-2"><Label>Queixa principal / motivo do atendimento</Label><Textarea value={form.queixa_principal ?? ""} onChange={(e) => update("queixa_principal", e.target.value)} /></div><div className="grid gap-2"><Label>Observações iniciais</Label><Textarea value={form.observacoes_iniciais ?? ""} onChange={(e) => update("observacoes_iniciais", e.target.value)} /></div><div className="grid gap-3 sm:grid-cols-3">{[["contato_emergencia_nome","Contato de emergência"],["contato_emergencia_parentesco","Parentesco"],["contato_emergencia_telefone","Telefone de emergência"]].map(([key,label]) => <Input key={key} placeholder={label} value={form[key] ?? ""} onChange={(e) => update(key, e.target.value)} />)}</div>{message && <p className={message.includes("sucesso") ? "text-sm text-emerald-700" : "text-sm text-red-600"}>{message}</p>}<Button disabled={saving} className="w-fit bg-[#2f8f82] hover:bg-[#26796e]">{saving ? "Enviando..." : "Enviar cadastro"}</Button></form></CardContent></Card></main>;
}

function mask(value: string, kind: "cpf" | "phone" | "cep") { const digits = value.replace(/\D/g, ""); if (kind === "cpf") return digits.slice(0, 11).replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2"); if (kind === "cep") return digits.slice(0, 8).replace(/(\d{5})(\d)/, "$1-$2"); return digits.slice(0, 11).replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2"); }
void mask;

export default CompleteRegistrationPage;