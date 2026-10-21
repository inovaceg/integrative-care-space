import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, ClipboardList, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { AdminLayout, EmptyState, PageIntro, SearchInput } from "@/components/admin/admin-ui";
import { Card, CardContent } from "@/components/ui/card";
import { fetchPatients, type PatientRecord } from "@/lib/admin/records";
import { supabase } from "@/integrations/supabase/client";

type CompletedForm = { id: string; paciente_id: string; preenchido_em: string; updated_at: string | null; created_at: string | null };
type ListedForm = CompletedForm & { patient: PatientRecord };

import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, ClipboardList, Loader2, TestTubeDiagonal } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { AdminLayout, EmptyState, PageIntro, SearchInput } from "@/components/admin/admin-ui";
import { Card, CardContent } from "@/components/ui/card";
import { fetchPatients, type PatientRecord } from "@/lib/admin/records";
import { supabase } from "@/integrations/supabase/client";

type CompletedForm = { id: string; paciente_id: string; preenchido_em: string; updated_at: string | null; created_at: string | null };
type ListedForm = CompletedForm & { patient: PatientRecord };

export const Route = createFileRoute("/admin/anamneses")({ component: AnamnesesPage });

function AnamnesesPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [forms, setForms] = useState<ListedForm[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setForms([]);
      setLoading(false);
      return;
    }
    let mounted = true;
    setLoading(true);
    setError("");
    Promise.all([
      fetchPatients(user.id),
      supabase.from("anamneses").select("id,paciente_id,preenchido_em,updated_at,created_at").eq("profissional_id", user.id).not("preenchido_em", "is", null).order("preenchido_em", { ascending: false }),
    ]).then(([patientResult, formResult]) => {
      if (!mounted) return;
      const queryError = patientResult.error ?? formResult.error;
      if (queryError) {
        setError(queryError.message);
        setForms([]);
      } else {
        const patientById = new Map(((patientResult.data as PatientRecord[] | null) ?? []).map((patient) => [patient.id, patient]));
        const latestForms = new Map<string, ListedForm>();
        ((formResult.data as CompletedForm[] | null) ?? []).forEach((form) => {
          const patient = patientById.get(form.paciente_id);
          if (patient && !latestForms.has(form.paciente_id)) latestForms.set(form.paciente_id, { ...form, patient });
        });
        setForms([...latestForms.values()]);
      }
      setLoading(false);
    }).catch((queryError: unknown) => {
      if (!mounted) return;
      setError(queryError instanceof Error ? queryError.message : "Não foi possível carregar as fichas de anamnese.");
      setLoading(false);
    });
    return () => { mounted = false; };
  }, [authLoading, user?.id]);

  const filteredForms = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase("pt-BR");
    return forms.filter((form) => form.patient.nome.toLocaleLowerCase("pt-BR").includes(normalizedSearch));
  }, [forms, search]);

  return <AdminLayout>
    <PageIntro eyebrow="Prontuários" title="Ficha de anamnese" description="Acesse as fichas concluídas, organizadas por paciente. Os dados clínicos completos só são exibidos ao abrir uma ficha autorizada." action={<Link to="/admin/anamneses/demo" className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"><TestTubeDiagonal className="size-4" />Demo do motor de análise</Link>} />
    <div className="mt-6 space-y-4">
      <SearchInput value={search} onChange={setSearch} placeholder="Buscar pelo nome da paciente..." />
      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">Não foi possível carregar as fichas: {error}</p>}
      {loading || authLoading ? <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-white p-12 text-sm text-slate-500"><Loader2 className="mr-2 size-4 animate-spin" />Carregando fichas...</div> : filteredForms.length === 0 ? <EmptyState title={search ? "Nenhuma ficha encontrada" : "Nenhuma anamnese concluída"} description={search ? "Tente outro nome de paciente." : "As fichas aparecerão aqui após serem preenchidas e concluídas."} /> : <div className="space-y-3">{filteredForms.map((form) => <Card key={form.id} className="border-slate-200/80 shadow-sm"><CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"><div className="flex min-w-0 items-center gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#e3f3ef] text-[#26786e]"><ClipboardList className="size-5" /></span><div className="min-w-0"><h2 className="truncate font-medium text-slate-800">{form.patient.nome}</h2><p className="text-sm text-slate-500">Concluída em {new Date(form.preenchido_em).toLocaleDateString("pt-BR")}</p></div></div><Link to="/admin/pacientes/$id/anamnese" params={{ id: form.paciente_id }} className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50">Abrir ficha <ArrowUpRight className="size-4" /></Link></CardContent></Card>)}</div>}
    </div>
  </AdminLayout>;
}
