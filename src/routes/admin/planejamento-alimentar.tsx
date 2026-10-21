import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Activity, ClipboardList, HeartPulse, Sparkles } from "lucide-react";
import { AdminLayout, AdminNotice, PageIntro, SectionCard } from "@/components/admin/admin-ui";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";

type Patient = { id: string; nome: string; data_nascimento: string | null; genero: string | null; area: string | null; queixa_principal: string | null; observacoes_iniciais: string | null };
type Evaluation = { id: string; evaluation_date: string; weight_kg: number | null; height_cm: number | null; bmi: number | null; waist_cm: number | null; abdomen_cm: number | null; hip_cm: number | null; body_fat_percentage: number | null; muscle_mass_kg: number | null; visceral_fat_level: number | null; body_water_percentage: number | null; basal_metabolism_kcal: number | null; clinical_notes: string | null };
type Application = { id: string; procedure_name: string; current_weight_kg: number; application_date: string; notes: string | null };
type Anamnesis = { alimentacao: string | null; atividade_fisica: string | null; qualidade_sono: string | null; doencas_fisicas: string | null; medicamentos_atuais: string | null; usa_medicamentos: boolean | null; sintomas_atuais: unknown };

export const Route = createFileRoute("/admin/planejamento-alimentar")({ component: NutritionPlanningPage });

function ageFrom(date: string | null) {
  if (!date) return null;
  const birth = new Date(`${date}T00:00:00`);
  if (Number.isNaN(birth.getTime())) return null;
  const now = new Date();
  return now.getFullYear() - birth.getFullYear() - (now < new Date(now.getFullYear(), birth.getMonth(), birth.getDate()) ? 1 : 0);
}
function display(value: string | number | null | undefined, unit = "") { return value === null || value === undefined || value === "" ? "Não informado" : `${value}${unit}`; }

function NutritionPlanningPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientId, setPatientId] = useState("");
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [anamnesis, setAnamnesis] = useState<Anamnesis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [goal, setGoal] = useState("");
  const selected = patients.find((patient) => patient.id === patientId) ?? null;
  const currentEvaluation = evaluations[0] ?? null;
  const alerts = useMemo(() => {
    const found: string[] = [];
    if (!currentEvaluation) found.push("Não há avaliação corporal registrada.");
    else {
      if (currentEvaluation.weight_kg !== null && (currentEvaluation.weight_kg < 20 || currentEvaluation.weight_kg > 350)) found.push("Peso fora da faixa usual; confira o registro.");
      if (currentEvaluation.height_cm !== null && (currentEvaluation.height_cm < 100 || currentEvaluation.height_cm > 250)) found.push("Altura fora da faixa usual; confira o registro.");
      if (currentEvaluation.weight_kg && currentEvaluation.height_cm) {
        const calcBmi = currentEvaluation.weight_kg / ((currentEvaluation.height_cm / 100) ** 2);
        if (currentEvaluation.bmi && Math.abs(calcBmi - currentEvaluation.bmi) > 2) found.push("IMC registrado difere do cálculo com peso e altura atuais.");
      }
    }
    if (!selected?.data_nascimento) found.push("Data de nascimento não informada.");
    if (!currentEvaluation?.height_cm) found.push("Altura não disponível na avaliação corporal.");
    return found;
  }, [currentEvaluation, selected]);

  useEffect(() => {
    if (authLoading || !user) return;
    let active = true;
    void supabase.from("pacientes").select("id,nome,data_nascimento,genero,area,queixa_principal,observacoes_iniciais").eq("profissional_id", user.id).order("nome").then(({ data, error: loadError }) => {
      if (!active) return;
      if (loadError) setError("Não foi possível carregar os pacientes.");
      else setPatients((data as Patient[] | null) ?? []);
    });
    return () => { active = false; };
  }, [authLoading, user]);

  useEffect(() => {
    if (!patientId || !user) { setEvaluations([]); setApplications([]); setAnamnesis(null); return; }
    let active = true;
    setLoading(true); setError("");
    void Promise.all([
      supabase.from("body_evaluations").select("id,evaluation_date,weight_kg,height_cm,bmi,waist_cm,abdomen_cm,hip_cm,body_fat_percentage,muscle_mass_kg,visceral_fat_level,body_water_percentage,basal_metabolism_kcal,clinical_notes").eq("patient_id", patientId).eq("profissional_id", user.id).order("evaluation_date", { ascending: false }),
      supabase.from("patient_applications").select("id,procedure_name,current_weight_kg,application_date,notes").eq("patient_id", patientId).eq("profissional_id", user.id).order("application_date", { ascending: false }),
      supabase.from("anamneses").select("alimentacao,atividade_fisica,qualidade_sono,doencas_fisicas,medicamentos_atuais,usa_medicamentos,sintomas_atuais").eq("paciente_id", patientId).eq("profissional_id", user.id).order("updated_at", { ascending: false }).limit(1).maybeSingle(),
    ]).then(([evaluationsResult, applicationsResult, anamnesisResult]) => {
      if (!active) return;
      const failed = evaluationsResult.error || applicationsResult.error || anamnesisResult.error;
      if (failed) setError("Não foi possível carregar todos os dados clínicos. Confira suas permissões e tente novamente.");
      setEvaluations((evaluationsResult.data as Evaluation[] | null) ?? []);
      setApplications((applicationsResult.data as Application[] | null) ?? []);
      setAnamnesis((anamnesisResult.data as Anamnesis | null) ?? null);
      setLoading(false);
    });
    return () => { active = false; };
  }, [patientId, user]);

  return <AdminLayout><PageIntro eyebrow="Nutrição" title="Planejamento Alimentar com IA" description="Revise os dados existentes do paciente e prepare uma proposta para avaliação profissional." /><div className="space-y-6"><AdminNotice /><SectionCard title="1. Selecionar paciente"><Select value={patientId} onValueChange={setPatientId}><SelectTrigger className="max-w-xl"><SelectValue placeholder="Escolha um paciente cadastrado" /></SelectTrigger><SelectContent>{patients.map((patient) => <SelectItem key={patient.id} value={patient.id}>{patient.nome}</SelectItem>)}</SelectContent></Select>{error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}{!patients.length && !authLoading && <p className="mt-3 text-sm text-slate-500">Nenhum paciente cadastrado para esta conta.</p>}</SectionCard>
    {selected && <>{loading ? <p className="py-8 text-center text-sm text-slate-500">Carregando dados do paciente...</p> : <>
      <SectionCard title="2. Dados disponíveis do paciente"><div className="grid gap-5 md:grid-cols-2"><div className="rounded-xl bg-slate-50 p-4"><h3 className="font-semibold text-slate-800">Dados pessoais</h3><dl className="mt-3 grid grid-cols-2 gap-3 text-sm"><div><dt className="text-slate-500">Nome</dt><dd>{selected.nome}</dd></div><div><dt className="text-slate-500">Idade</dt><dd>{display(ageFrom(selected.data_nascimento), " anos")}</dd></div><div><dt className="text-slate-500">Gênero registrado</dt><dd>{display(selected.genero)}</dd></div><div><dt className="text-slate-500">Área</dt><dd>{display(selected.area)}</dd></div></dl><p className="mt-3 text-sm"><span className="text-slate-500">Queixa principal: </span>{display(selected.queixa_principal)}</p><p className="mt-2 text-sm"><span className="text-slate-500">Observações iniciais: </span>{display(selected.observacoes_iniciais)}</p></div>
      <div className="rounded-xl bg-slate-50 p-4"><h3 className="flex items-center gap-2 font-semibold text-slate-800"><HeartPulse className="size-4 text-[#2f8f82]" /> Anamnese relevante</h3>{anamnesis ? <div className="mt-3 space-y-2 text-sm">{([["Alimentação", anamnesis.alimentacao], ["Atividade física", anamnesis.atividade_fisica], ["Sono", anamnesis.qualidade_sono], ["Condições físicas", anamnesis.doencas_fisicas], ["Medicamentos", anamnesis.usa_medicamentos ? anamnesis.medicamentos_atuais : null]] as [string, string | null][]).map(([label, value]) => <p key={label}><span className="text-slate-500">{label}: </span>{display(value)}</p>)}</div> : <p className="mt-3 text-sm text-slate-500">Anamnese não localizada para este paciente.</p>}</div></div></SectionCard>
      <SectionCard title="3. Avaliações corporais e evolução"><div className="space-y-4">{evaluations.length ? evaluations.map((evaluation, index) => <div key={evaluation.id} className="rounded-xl border border-slate-200 p-4"><div className="flex items-center gap-2 font-semibold"><Activity className="size-4 text-[#2f8f82]" />{new Date(`${evaluation.evaluation_date}T00:00:00`).toLocaleDateString("pt-BR")} {index === 0 && <span className="rounded-full bg-[#e3f3ef] px-2 py-0.5 text-xs text-[#26786e]">Mais recente</span>}</div><div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">{[["Peso", display(evaluation.weight_kg, " kg")],["Altura", display(evaluation.height_cm, " cm")],["IMC", display(evaluation.bmi)],["Gordura corporal", display(evaluation.body_fat_percentage, "%")],["Massa muscular", display(evaluation.muscle_mass_kg, " kg")],["Cintura", display(evaluation.waist_cm, " cm")],["Abdômen", display(evaluation.abdomen_cm, " cm")],["Quadril", display(evaluation.hip_cm, " cm")],["Gordura visceral", display(evaluation.visceral_fat_level)],["Água corporal", display(evaluation.body_water_percentage, "%")],["Metabolismo basal registrado", display(evaluation.basal_metabolism_kcal, " kcal")]].map(([label, value]) => <div key={label}><p className="text-xs text-slate-500">{label}</p><p>{value}</p></div>)}</div>{evaluation.clinical_notes && <p className="mt-3 text-sm text-slate-600">Observações: {evaluation.clinical_notes}</p>}</div>) : <p className="text-sm text-slate-500">Sem avaliações corporais cadastradas.</p>}</div></SectionCard>
      <SectionCard title="4. Aplicações e procedimentos registrados"><div className="space-y-3">{applications.length ? applications.map((application) => <div key={application.id} className="flex flex-wrap items-start justify-between gap-2 rounded-lg border p-3 text-sm"><div><p className="font-medium">{application.procedure_name}</p><p className="text-slate-500">{new Date(`${application.application_date}T00:00:00`).toLocaleDateString("pt-BR")} · peso registrado {application.current_weight_kg} kg</p>{application.notes && <p className="mt-1 text-slate-500">{application.notes}</p>}</div><span className="text-xs text-slate-400">Contexto registrado; sem inferir efeitos clínicos</span></div>) : <p className="text-sm text-slate-500">Sem procedimentos registrados.</p>}</div></SectionCard>
      {alerts.length > 0 && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4"><h3 className="flex items-center gap-2 font-semibold text-amber-900"><AlertTriangle className="size-4" /> Conferir antes de planejar</h3><ul className="mt-2 list-inside list-disc space-y-1 text-sm text-amber-800">{alerts.map((alert) => <li key={alert}>{alert}</li>)}</ul></div>}
    </>}
    <SectionCard title="5. Informações complementares e configuração"><p className="mb-4 text-sm text-slate-500">Nesta etapa, configure o objetivo e a proposta. A persistência do perfil nutricional será habilitada após aprovação do SQL apresentado antes da migração.</p><div className="grid gap-4 md:grid-cols-2"><label className="grid gap-2 text-sm font-medium">Objetivo nutricional informado<Textarea value={goal} onChange={(event) => setGoal(event.target.value)} placeholder="Descreva o objetivo definido com o paciente" /></label><label className="grid gap-2 text-sm font-medium">Período do planejamento<select className="h-10 rounded-md border border-slate-200 bg-white px-3"><option value="1">1 dia</option><option value="3">3 dias</option><option value="7">7 dias</option></select></label></div><div className="mt-5 flex flex-wrap items-center gap-3"><Button type="button" disabled><Sparkles className="mr-2 size-4" />Gerar planejamento com IA</Button><span className="text-sm text-slate-500">A geração será habilitada após configurar persistência e a Edge Function segura.</span></div></SectionCard>
      <SectionCard title="Histórico de planejamentos"><div className="flex items-center gap-3 text-sm text-slate-500"><ClipboardList className="size-5" />Histórico ficará disponível após a criação das tabelas de planos e versões.</div></SectionCard>
    </>}
  </div></AdminLayout>;
}
