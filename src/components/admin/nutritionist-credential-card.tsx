import { useEffect, useState, type FormEvent } from "react";
import { BadgeCheck, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/components/auth/auth-provider";
import { supabase } from "@/integrations/supabase/client";

type Credential = { full_name: string; crn: string; verification_status: "pending" | "verified" | "rejected"; verified_at: string | null };
export function NutritionistCredentialCard() {
  const { user } = useAuth();
  const [credential, setCredential] = useState<Credential | null>(null);
  const [fullName, setFullName] = useState("");
  const [crn, setCrn] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  useEffect(() => { if (!user) return; void supabase.from("nutritionist_credentials").select("full_name,crn,verification_status,verified_at").eq("profissional_id", user.id).maybeSingle().then(({ data }) => { setCredential(data as Credential | null); setLoading(false); }); }, [user]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!user) return; setMessage("");
    const { data, error } = await supabase.from("nutritionist_credentials").insert({ profissional_id: user.id, full_name: fullName.trim(), crn: crn.trim(), verification_status: "pending" }).select("full_name,crn,verification_status,verified_at").single();
    if (error) { setMessage("Não foi possível enviar os dados. Verifique se já existe uma solicitação."); return; }
    setCredential(data as Credential); setMessage("Solicitação enviada. A credencial segue pendente de verificação independente.");
  }
  return <section className="mb-6 rounded-2xl border border-slate-200 bg-white shadow-sm"><header className="border-b border-slate-100 px-5 py-4"><h2 className="font-display text-base font-semibold text-slate-800">Credencial do nutricionista</h2></header><div className="p-5"><div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><ShieldAlert className="size-5 shrink-0" /><p>O cadastro não comprova habilitação. Aprovações só serão permitidas após verificação independente do CRN por procedimento administrativo confiável.</p></div>{loading ? <p className="mt-4 text-sm text-slate-500">Consultando cadastro...</p> : credential ? <div className="mt-4 rounded-xl border border-slate-200 p-4"><p className="font-semibold">{credential.full_name}</p><p className="mt-1 text-sm text-slate-600">CRN: {credential.crn}</p><p className={`mt-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm ${credential.verification_status === "verified" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}>{credential.verification_status === "verified" ? <BadgeCheck className="size-4" /> : <ShieldAlert className="size-4" />}{credential.verification_status === "verified" ? "Verificada" : credential.verification_status === "rejected" ? "Rejeitada" : "Pendente de verificação"}</p></div> : <form onSubmit={submit} className="mt-4 grid gap-4 sm:grid-cols-2"><div><Label htmlFor="nutritionist-name">Nome completo</Label><Input id="nutritionist-name" className="mt-1" value={fullName} onChange={(event) => setFullName(event.target.value)} required maxLength={160} /></div><div><Label htmlFor="nutritionist-crn">Número do CRN</Label><Input id="nutritionist-crn" className="mt-1" value={crn} onChange={(event) => setCrn(event.target.value)} required maxLength={40} /></div><div className="sm:col-span-2"><Button type="submit">Enviar para verificação</Button></div>{message && <p className="sm:col-span-2 text-sm text-slate-600" role="status">{message}</p>}</form>}{credential && message && <p className="mt-3 text-sm text-slate-600" role="status">{message}</p>}</div></section>;
}
