import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/components/auth/auth-provider";
import { supabase } from "@/integrations/supabase/client";

type Nutritionist = { id: string; full_name: string; crn: string };

export function NutritionistCredentialCard() {
  const { user } = useAuth();
  const [nutritionists, setNutritionists] = useState<Nutritionist[]>([]);
  const [fullName, setFullName] = useState("");
  const [crn, setCrn] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadNutritionists() {
    if (!user) return;
    const { data } = await supabase.from("nutritionist_credentials").select("id,full_name,crn").eq("profissional_id", user.id).order("full_name");
    setNutritionists((data as Nutritionist[] | null) ?? []);
    setLoading(false);
  }

  useEffect(() => { void loadNutritionists(); }, [user]);

  function edit(item: Nutritionist) {
    setEditingId(item.id);
    setFullName(item.full_name);
    setCrn(item.crn);
    setMessage("");
  }

  function resetForm() {
    setEditingId(null);
    setFullName("");
    setCrn("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;
    setMessage("");
    const values = { full_name: fullName.trim(), crn: crn.trim() };
    const result = editingId
      ? await supabase.from("nutritionist_credentials").update(values).eq("id", editingId).eq("profissional_id", user.id)
      : await supabase.from("nutritionist_credentials").insert({ ...values, profissional_id: user.id });
    if (result.error) {
      setMessage("Não foi possível salvar. Tente novamente.");
      return;
    }
    resetForm();
    setMessage(editingId ? "Cadastro atualizado." : "Nutricionista cadastrada.");
    await loadNutritionists();
  }

  return <section className="mb-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
    <header className="border-b border-slate-100 px-5 py-4"><h2 className="font-display text-base font-semibold text-slate-800">Nutricionistas</h2></header>
    <div className="p-5">
      <p className="mb-4 text-sm text-slate-600">Cadastre nome e registro profissional. Os dados são informados por você, não passam por verificação independente, e podem ser alterados quando necessário.</p>
      {loading ? <p className="text-sm text-slate-500">Carregando cadastros...</p> : <div className="mb-5 space-y-2">{nutritionists.map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-4"><div><p className="font-semibold">{item.full_name}</p><p className="text-sm text-slate-600">Registro: {item.crn}</p></div><Button type="button" variant="outline" size="sm" onClick={() => edit(item)}>Alterar</Button></div>)}{!nutritionists.length && <p className="text-sm text-slate-500">Nenhuma nutricionista cadastrada.</p>}</div>}
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <div><Label htmlFor="nutritionist-name">Nome completo</Label><Input id="nutritionist-name" className="mt-1" value={fullName} onChange={(event) => setFullName(event.target.value)} required maxLength={160} /></div>
        <div><Label htmlFor="nutritionist-crn">Registro profissional</Label><Input id="nutritionist-crn" className="mt-1" value={crn} onChange={(event) => setCrn(event.target.value)} required maxLength={40} /></div>
        <div className="flex gap-2 sm:col-span-2"><Button type="submit">{editingId ? "Salvar alteração" : "Adicionar nutricionista"}</Button>{editingId && <Button type="button" variant="outline" onClick={resetForm}>Cancelar</Button>}</div>
        {message && <p className="sm:col-span-2 text-sm text-slate-600" role="status">{message}</p>}
      </form>
    </div>
  </section>;
}
