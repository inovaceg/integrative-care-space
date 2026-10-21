import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Activity, ClipboardList, HeartPulse, Loader2, Save, Sparkles } from "lucide-react";
import { AdminLayout, AdminNotice, PageIntro, SectionCard } from "@/components/admin/admin-ui";
import { NutritionPlanPreview } from "@/components/admin/nutrition-plan-preview";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { downloadDocumentPdf, type DocumentPage } from "@/lib/admin/document-layout";

type Patient = { id: string; nome: string; data_nascimento: string | null; genero: string | null; area: string | null; queixa_principal: string | null; observacoes_iniciais: string | null };
type Evaluation = { id: string; evaluation_date: string; weight_kg: number | null; height_cm: number | null; bmi: number | null; waist_cm: number | null; abdomen_cm: number | null; hip_cm: number | null; body_fat_percentage: number | null; muscle_mass_kg: number | null; visceral_fat_level: number | null; body_water_percentage: number | null; basal_metabolism_kcal: number | null; clinical_notes: string | null };
type Application = { id: string; procedure_name: string; current_weight_kg: number; application_date: string; notes: string | null };
type Anamnesis = { alimentacao: string | null; atividade_fisica: string | null; qualidade_sono: string | null; doencas_fisicas: string | null; medicamentos_atuais: string | null; usa_medicamentos: boolean | null; sintomas_atuais: unknown };
type Profile = { height_cm: string; reference_weight_kg: string; goal: string; activity_level: string; exercise_details: string; wake_time: string; sleep_time: string; meal_schedule: string; desired_meals: string; work_routine: string; cooking_availability: string; food_budget: string; preferred_foods: string; avoided_foods: string; cultural_restrictions: string; simple_meals_preference: boolean; affordable_food_preference: boolean; allergies: string; intolerances: string; diagnosed_conditions: string; pregnancy_or_breastfeeding: string; medications: string; supplements: string; eating_disorder_history: string };
type Meal = { name: string; items: { food: string; portion: string; alternatives?: string[] }[]; notes?: string };
type PlanContent = { summary: string; objective: string; warnings: string[]; meals: Meal[]; observations: string[]; professional_confirmations: string[] };
type Plan = { id: string; goal: string; duration_days: number; status: string; plan_content: PlanContent; model_name: string | null; created_at: string; approved_at: string | null; approved_by: string | null; approved_version_id: string | null };
type PlanVersion = { id: string; version_number: number; plan_content: PlanContent; created_at: string; created_by: string };
const emptyProfile: Profile = { height_cm: "", reference_weight_kg: "", goal: "", activity_level: "", exercise_details: "", wake_time: "", sleep_time: "", meal_schedule: "", desired_meals: "", work_routine: "", cooking_availability: "", food_budget: "", preferred_foods: "", avoided_foods: "", cultural_restrictions: "", simple_meals_preference: false, affordable_food_preference: false, allergies: "", intolerances: "", diagnosed_conditions: "", pregnancy_or_breastfeeding: "", medications: "", supplements: "", eating_disorder_history: "" };
const asProfile = (row: Record<string, unknown> | null): Profile => row ? Object.fromEntries(Object.keys(emptyProfile).map((key) => [key, key === "meal_schedule" ? Array.isArray(row[key]) ? (row[key] as string[]).join("\n") : "" : key.endsWith("preference") ? Boolean(row[key]) : row[key] == null ? "" : String(row[key])])) as Profile : { ...emptyProfile };
const ageFrom = (date: string | null) => { if (!date) return null; const birth = new Date(`${date}T00:00:00`); if (Number.isNaN(birth.getTime())) return null; const now = new Date(); return now.getFullYear() - birth.getFullYear() - (now < new Date(now.getFullYear(), birth.getMonth(), birth.getDate()) ? 1 : 0); };
const display = (value: string | number | null | undefined, unit = "") => value === null || value === undefined || value === "" ? "Não informado" : `${value}${unit}`;
const statusNames: Record<string, string> = { draft: "Rascunho", pending_review: "Aguardando revisão", approved: "Aprovado por nutricionista", archived: "Arquivado" };

export const Route = createFileRoute("/admin/planejamento-alimentar")({ component: NutritionPlanningPage });

function NutritionPlanningPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientId, setPatientId] = useState("");
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [anamnesis, setAnamnesis] = useState<Anamnesis | null>(null);
  const [profile, setProfile] = useState<Profile>({ ...emptyProfile });
  const [plans, setPlans] = useState<Plan[]>([]);
  const [versions, setVersions] = useState<PlanVersion[]>([]);
  const [activePlan, setActivePlan] = useState<Plan | null>(null);
  const [contentText, setContentText] = useState("");
  const [duration, setDuration] = useState("1");
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const selected = patients.find((patient) => patient.id === patientId) ?? null;
  const currentEvaluation = evaluations[0] ?? null;
  const alerts = useMemo(() => {
    const found: string[] = [];
    if (!currentEvaluation) found.push("Não há avaliação corporal registrada.");
    else {
      if (currentEvaluation.weight_kg !== null && (currentEvaluation.weight_kg < 20 || currentEvaluation.weight_kg > 350)) found.push("Peso fora da faixa usual; confira o registro.");
      if (currentEvaluation.height_cm !== null && (currentEvaluation.height_cm < 100 || currentEvaluation.height_cm > 250)) found.push("Altura fora da faixa usual; confira o registro.");
      if (currentEvaluation.weight_kg && currentEvaluation.height_cm && currentEvaluation.bmi) { const bmi = currentEvaluation.weight_kg / ((currentEvaluation.height_cm / 100) ** 2); if (Math.abs(bmi - currentEvaluation.bmi) > 2) found.push("IMC registrado difere do cálculo com peso e altura atuais."); }
    }
    if (!selected?.data_nascimento) found.push("Data de nascimento não informada.");
    if (!currentEvaluation?.height_cm && !profile.height_cm) found.push("Altura não disponível.");
    return found;
  }, [currentEvaluation, profile.height_cm, selected]);

  function selectPlan(plan: Plan) { setActivePlan(plan); setContentText(JSON.stringify(plan.plan_content, null, 2)); setDuration(String(plan.duration_days)); }

  useEffect(() => {
    if (authLoading || !user) return;
    let active = true;
    void supabase.from("pacientes").select("id,nome,data_nascimento,genero,area,queixa_principal,observacoes_iniciais").eq("profissional_id", user.id).order("nome").then(({ data, error: loadError }) => { if (!active) return; if (loadError) setError("Não foi possível carregar os pacientes."); else setPatients((data as Patient[] | null) ?? []); });
    return () => { active = false; };
  }, [authLoading, user]);

  useEffect(() => {
    if (!patientId || !user) { setEvaluations([]); setApplications([]); setAnamnesis(null); setProfile({ ...emptyProfile }); setPlans([]); setActivePlan(null); return; }
    let active = true;
    setLoading(true); setError(""); setActivePlan(null); setContentText("");
    void Promise.all([
      supabase.from("body_evaluations").select("id,evaluation_date,weight_kg,height_cm,bmi,waist_cm,abdomen_cm,hip_cm,body_fat_percentage,muscle_mass_kg,visceral_fat_level,body_water_percentage,basal_metabolism_kcal,clinical_notes").eq("patient_id", patientId).eq("profissional_id", user.id).order("evaluation_date", { ascending: false }),
      supabase.from("patient_applications").select("id,procedure_name,current_weight_kg,application_date,notes").eq("patient_id", patientId).eq("profissional_id", user.id).order("application_date", { ascending: false }),
      supabase.from("anamneses").select("alimentacao,atividade_fisica,qualidade_sono,doencas_fisicas,medicamentos_atuais,usa_medicamentos,sintomas_atuais").eq("paciente_id", patientId).eq("profissional_id", user.id).order("updated_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("patient_nutrition_profiles").select("*").eq("patient_id", patientId).eq("profissional_id", user.id).maybeSingle(),
      supabase.from("nutrition_plans").select("id,goal,duration_days,status,plan_content,model_name,created_at,approved_at,approved_by,approved_version_id").eq("patient_id", patientId).eq("profissional_id", user.id).order("created_at", { ascending: false }),
    ]).then(([evaluationResult, applicationResult, anamnesisResult, profileResult, planResult]) => {
      if (!active) return;
      const failed = evaluationResult.error || applicationResult.error || anamnesisResult.error || profileResult.error || planResult.error;
      if (failed) setError("Não foi possível carregar todos os dados. Confira as permissões e tente novamente.");
      setEvaluations((evaluationResult.data as Evaluation[] | null) ?? []); setApplications((applicationResult.data as Application[] | null) ?? []); setAnamnesis((anamnesisResult.data as Anamnesis | null) ?? null); setProfile(asProfile(profileResult.data as Record<string, unknown> | null));
      const list = (planResult.data as Plan[] | null) ?? []; setPlans(list); if (list.length) { setActivePlan(list[0]); setContentText(JSON.stringify(list[0].plan_content, null, 2)); setDuration(String(list[0].duration_days)); }
      setLoading(false);
    });
    return () => { active = false; };
  }, [patientId, user]);

  useEffect(() => {
    const latestWeight = evaluations[0]?.weight_kg;
    if (latestWeight !== null && latestWeight !== undefined) {
      setProfile((current) => ({ ...current, reference_weight_kg: String(latestWeight) }));
    }
  }, [evaluations]);

  async function saveProfile(): Promise<boolean> {
    if (!user || !patientId) return false;
    setSaving(true); setError(""); setMessage("");
    const payload = { patient_id: patientId, profissional_id: user.id, height_cm: profile.height_cm ? Number(profile.height_cm) : null, reference_weight_kg: profile.reference_weight_kg ? Number(profile.reference_weight_kg) : null, goal: profile.goal || null, activity_level: profile.activity_level || null, exercise_details: profile.exercise_details || null, wake_time: profile.wake_time || null, sleep_time: profile.sleep_time || null, meal_schedule: profile.meal_schedule.split("\n").map((item) => item.trim()).filter(Boolean), desired_meals: profile.desired_meals ? Number(profile.desired_meals) : null, work_routine: profile.work_routine || null, cooking_availability: profile.cooking_availability || null, food_budget: profile.food_budget || null, preferred_foods: profile.preferred_foods || null, avoided_foods: profile.avoided_foods || null, cultural_restrictions: profile.cultural_restrictions || null, simple_meals_preference: profile.simple_meals_preference, affordable_food_preference: profile.affordable_food_preference, allergies: profile.allergies || null, intolerances: profile.intolerances || null, diagnosed_conditions: profile.diagnosed_conditions || null, pregnancy_or_breastfeeding: profile.pregnancy_or_breastfeeding || null, medications: profile.medications || null, supplements: profile.supplements || null, eating_disorder_history: profile.eating_disorder_history || null, updated_at: new Date().toISOString() };
    const { error: saveError } = await supabase.from("patient_nutrition_profiles").upsert(payload, { onConflict: "patient_id" });
    setSaving(false); if (saveError) { setError("Não foi possível salvar o perfil nutricional."); return false; } setMessage("Perfil nutricional salvo."); return true;
  }
  const setField = (key: keyof Profile, value: string | boolean) => setProfile((old) => ({ ...old, [key]: value }));

  async function savePlan(status: "draft" | "pending_review" = "draft", contentOverride?: PlanContent, modelName?: string) {
    if (!user || !patientId || !selected) return;
    let parsed: PlanContent;
    try { parsed = contentOverride ?? JSON.parse(contentText) as PlanContent; if (!parsed || !Array.isArray(parsed.meals)) throw new Error(); }
    catch { setError("O conteúdo precisa ser um JSON válido com uma lista de refeições."); return; }
    setSaving(true); setError(""); setMessage("");
    let planId = activePlan?.id;
    const planPayload = { patient_id: patientId, profissional_id: user.id, goal: profile.goal || "Objetivo a confirmar", duration_days: Number(duration), status, plan_content: parsed, model_name: modelName ?? activePlan?.model_name ?? null, updated_at: new Date().toISOString() };
    if (activePlan && activePlan.status !== "approved") {
      const { error: updateError } = await supabase.from("nutrition_plans").update({ goal: planPayload.goal, duration_days: planPayload.duration_days, status, plan_content: parsed, model_name: planPayload.model_name, updated_at: planPayload.updated_at }).eq("id", activePlan.id).eq("profissional_id", user.id);
      if (updateError) { setSaving(false); setError("Não foi possível atualizar o plano."); return; }
    } else {
      const { data, error: insertError } = await supabase.from("nutrition_plans").insert(planPayload).select("id").single();
      if (insertError || !data) { setSaving(false); setError("Não foi possível criar o planejamento."); return; }
      planId = data.id;
    }
    setSaving(false);
    setMessage(status === "pending_review" ? "Enviado para revisão profissional." : "Planejamento e nova versão salvos.");
    await refreshPlans(planId!);
  }
  async function refreshPlans(selectId?: string) {
    if (!user || !patientId) return;
    const { data } = await supabase.from("nutrition_plans").select("id,goal,duration_days,status,plan_content,model_name,created_at,approved_at,approved_by,approved_version_id").eq("patient_id", patientId).eq("profissional_id", user.id).order("created_at", { ascending: false });
    const list = (data as Plan[] | null) ?? []; setPlans(list); const match = list.find((plan) => plan.id === (selectId ?? activePlan?.id)) ?? list[0]; if (match) { setActivePlan(match); setContentText(JSON.stringify(match.plan_content, null, 2)); const { data: versionData } = await supabase.from("nutrition_plan_versions").select("id,version_number,plan_content,created_at,created_by").eq("plan_id", match.id).order("version_number", { ascending: false }); setVersions((versionData as PlanVersion[] | null) ?? []); }
  }

  async function generatePlan() {
    if (!patientId || !user) return;
    if (profile.goal.trim().length < 3) {
      setError("Preencha um objetivo com pelo menos 3 caracteres antes de gerar a proposta.");
      return;
    }
    setError("");
    setMessage("Iniciando geração do planejamento...");
    setGenerating(true);
    try {
      const { data, error: functionError } = await supabase.functions.invoke("nutrition-planning", { body: { patient_id: patientId, goal: profile.goal.trim(), duration_days: Number(duration), desired_meals: profile.desired_meals ? Number(profile.desired_meals) : null, nutritional_profile: profile } });
      if (functionError || !data?.plan) {
        let responseError: string | undefined;
        const response = functionError?.context as Response | undefined;
        if (response instanceof Response) {
          const body = await response.json().catch(() => null) as { error?: string } | null;
          responseError = body?.error;
        }
        setError(data?.error ?? responseError ?? functionError?.message ?? "Não foi possível gerar a proposta. Confira a configuração do serviço e tente novamente.");
        setMessage("");
        return;
      }
      const nextContent = data.plan as PlanContent;
      setContentText(JSON.stringify(nextContent, null, 2));
      setMessage("Proposta gerada. Revise e edite todo o conteúdo antes de salvar.");
      await savePlan("draft", nextContent, data.model ?? null);
    } catch {
      setError("Ocorreu um erro ao chamar o serviço de geração. Tente novamente.");
      setMessage("");
    } finally {
      setGenerating(false);
    }
  }

  async function loadVersions(plan: Plan) {
    selectPlan(plan);
    if (!user) return;
    const { data } = await supabase.from("nutrition_plan_versions").select("id,version_number,plan_content,created_at,created_by").eq("plan_id", plan.id).order("version_number", { ascending: false });
    setVersions((data as PlanVersion[] | null) ?? []);
  }
  async function approvePlan() {
    if (!activePlan?.id || !versions[0]) return;
    setSaving(true); const { data, error: approvalError } = await supabase.functions.invoke("nutrition-approve", { body: { plan_id: activePlan.id, version_id: versions[0].id } }); setSaving(false);
    if (approvalError || !data?.approved) setError(data?.error ?? "A aprovação exige credencial CRN verificada e uma versão válida enviada para revisão."); else { setMessage("Planejamento aprovado."); await refreshPlans(activePlan.id); }
  }

  async function exportPdf(_draftMark?: boolean) {
    if (!selected) return;
    let plan: PlanContent;
    try { plan = JSON.parse(contentText) as PlanContent; } catch { setError("Revise o conteúdo: não foi possível interpretar o planejamento para o PDF."); return; }
    if (activePlan?.status === "approved" && activePlan.approved_version_id) {
      const { data } = await supabase.from("nutrition_plan_versions").select("plan_content").eq("id", activePlan.approved_version_id).eq("plan_id", activePlan.id).maybeSingle();
      if (!data) { setError("Não foi possível carregar a versão aprovada imutável."); return; }
      plan = data.plan_content as PlanContent;
    }
    const pages: DocumentPage[] = [[]];
    let page = pages[0];
    let y = 125;
    const line = (text: string, size = 10, bold = false) => {
      const words = text.split(" ").filter(Boolean);
      let chunk = "";
      const rows: string[] = [];
      for (const word of words) { if (chunk && `${chunk} ${word}`.length > 82) { rows.push(chunk); chunk = word; } else chunk = chunk ? `${chunk} ${word}` : word; }
      if (chunk) rows.push(chunk);
      for (const row of rows) { if (y > 770) { page = []; pages.push(page); y = 55; } page.push({ text: row, x: 42, y, size, bold, color: bold ? "#123c3d" : "#334155" }); y += size + 7; }
    };
    if (activePlan?.status !== "approved") line("RASCUNHO - NAO UTILIZAR COMO PRESCRICAO", 13, true);
    line("PLANEJAMENTO ALIMENTAR", 18, true); line(`Paciente: ${selected.nome}`); line(`Data: ${new Date().toLocaleDateString("pt-BR")}`); line(`Objetivo: ${plan.objective || activePlan?.goal || profile.goal || "A confirmar"}`); line(`Status: ${statusNames[activePlan?.status ?? "draft"] ?? "Rascunho"}`, 10, true); y += 8;
    for (const meal of plan.meals ?? []) { line(meal.name, 13, true); for (const item of meal.items ?? []) { line(`- ${item.food}: ${item.portion}`); if (item.alternatives?.length) line(`Alternativas: ${item.alternatives.join(", ")}`); } if (meal.notes) line(`Observacoes: ${meal.notes}`); y += 8; }
    for (const observation of plan.observations ?? []) line(`Orientacao: ${observation}`);
    if (activePlan?.status === "approved" && activePlan.approved_by) {
      const { data: nutritionist } = await supabase.from("nutritionist_credentials").select("full_name,crn").eq("profissional_id", activePlan.approved_by).eq("verification_status", "verified").maybeSingle();
      if (!nutritionist) { setError("Não foi possível carregar a identificação do nutricionista verificado."); return; }
      line(`Nutricionista responsavel: ${nutritionist.full_name}`); line(`CRN: ${nutritionist.crn}`); line(`Aprovado em: ${new Date(activePlan.approved_at ?? "").toLocaleString("pt-BR")}`);
    }
    await downloadDocumentPdf(pages, `planejamento-alimentar-${selected.nome.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`, true);
  }

  const textFields: [keyof Profile, string][] = [["exercise_details", "Tipo e frequência de exercícios"],["work_routine", "Rotina de trabalho"],["cooking_availability", "Disponibilidade para cozinhar"],["food_budget", "Orçamento alimentar"],["preferred_foods", "Alimentos preferidos"],["avoided_foods", "Alimentos que não consome"],["cultural_restrictions", "Restrições culturais/religiosas"],["allergies", "Alergias alimentares"],["intolerances", "Intolerâncias"],["diagnosed_conditions", "Doenças diagnosticadas"],["pregnancy_or_breastfeeding", "Gestação ou amamentação"],["medications", "Medicamentos em uso"],["supplements", "Suplementos"],["eating_disorder_history", "Histórico de transtornos alimentares"]];

  return <AdminLayout><PageIntro eyebrow="Nutrição" title="Planejamento Alimentar com IA" description="Revise dados reais do paciente, configure os objetivos e prepare uma proposta para avaliação profissional." /><div className="space-y-6"><AdminNotice /><SectionCard title="1. Selecionar paciente"><Select value={patientId} onValueChange={setPatientId}><SelectTrigger className="max-w-xl"><SelectValue placeholder="Escolha um paciente cadastrado" /></SelectTrigger><SelectContent>{patients.map((patient) => <SelectItem key={patient.id} value={patient.id}>{patient.nome}</SelectItem>)}</SelectContent></Select>{error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}{message && <p role="status" className="mt-3 text-sm text-[#26786e]">{message}</p>}</SectionCard>
    {selected && <>{loading ? <p className="py-8 text-center text-sm text-slate-500">Carregando dados do paciente...</p> : <>
      <SectionCard title="2. Resumo clínico e corporal"><div className="grid gap-5 md:grid-cols-2"><div className="rounded-xl bg-slate-50 p-4"><h3 className="font-semibold text-slate-800">Dados do paciente</h3><dl className="mt-3 grid grid-cols-2 gap-3 text-sm"><div><dt className="text-slate-500">Nome</dt><dd>{selected.nome}</dd></div><div><dt className="text-slate-500">Idade</dt><dd>{display(ageFrom(selected.data_nascimento), " anos")}</dd></div><div><dt className="text-slate-500">Gênero registrado</dt><dd>{display(selected.genero)}</dd></div><div><dt className="text-slate-500">Área</dt><dd>{display(selected.area)}</dd></div></dl><p className="mt-3 text-sm"><span className="text-slate-500">Queixa principal: </span>{display(selected.queixa_principal)}</p><p className="mt-2 text-sm"><span className="text-slate-500">Observações iniciais: </span>{display(selected.observacoes_iniciais)}</p></div><div className="rounded-xl bg-slate-50 p-4"><h3 className="flex items-center gap-2 font-semibold text-slate-800"><HeartPulse className="size-4 text-[#2f8f82]" /> Anamnese relevante</h3>{anamnesis ? <div className="mt-3 space-y-2 text-sm">{([["Alimentação", anamnesis.alimentacao], ["Atividade física", anamnesis.atividade_fisica], ["Sono", anamnesis.qualidade_sono], ["Condições físicas", anamnesis.doencas_fisicas], ["Medicamentos", anamnesis.usa_medicamentos ? anamnesis.medicamentos_atuais : null]] as [string, string | null][]).map(([label, value]) => <p key={label}><span className="text-slate-500">{label}: </span>{display(value)}</p>)}</div> : <p className="mt-3 text-sm text-slate-500">Anamnese não localizada.</p>}</div></div></SectionCard>
      <SectionCard title="3. Histórico de evolução corporal"><div className="space-y-4">{evaluations.length ? evaluations.map((evaluation, index) => <div key={evaluation.id} className="rounded-xl border border-slate-200 p-4"><div className="flex items-center gap-2 font-semibold"><Activity className="size-4 text-[#2f8f82]" />{new Date(`${evaluation.evaluation_date}T00:00:00`).toLocaleDateString("pt-BR")} {index === 0 && <span className="rounded-full bg-[#e3f3ef] px-2 py-0.5 text-xs text-[#26786e]">Mais recente</span>}</div><div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">{[["Peso", display(evaluation.weight_kg, " kg")],["Altura", display(evaluation.height_cm, " cm")],["IMC", display(evaluation.bmi)],["Gordura corporal", display(evaluation.body_fat_percentage, "%")],["Massa muscular", display(evaluation.muscle_mass_kg, " kg")],["Cintura", display(evaluation.waist_cm, " cm")],["Abdômen", display(evaluation.abdomen_cm, " cm")],["Quadril", display(evaluation.hip_cm, " cm")],["Gordura visceral", display(evaluation.visceral_fat_level)],["Água corporal", display(evaluation.body_water_percentage, "%")],["Metabolismo basal registrado", display(evaluation.basal_metabolism_kcal, " kcal")]].map(([label, value]) => <div key={label}><p className="text-xs text-slate-500">{label}</p><p>{value}</p></div>)}</div>{evaluation.clinical_notes && <p className="mt-3 text-sm text-slate-600">Observações: {evaluation.clinical_notes}</p>}</div>) : <p className="text-sm text-slate-500">Sem avaliações corporais cadastradas.</p>}</div></SectionCard>
      <SectionCard title="4. Aplicações e procedimentos"><div className="space-y-3">{applications.length ? applications.map((application) => <div key={application.id} className="flex flex-wrap items-start justify-between gap-2 rounded-lg border p-3 text-sm"><div><p className="font-medium">{application.procedure_name}</p><p className="text-slate-500">{new Date(`${application.application_date}T00:00:00`).toLocaleDateString("pt-BR")} · peso registrado {application.current_weight_kg} kg</p>{application.notes && <p className="mt-1 text-slate-500">{application.notes}</p>}</div><span className="text-xs text-slate-400">Contexto registrado; sem inferir efeitos clínicos</span></div>) : <p className="text-sm text-slate-500">Sem procedimentos registrados.</p>}</div></SectionCard>
    </>}
    {alerts.length > 0 && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4"><h3 className="flex items-center gap-2 font-semibold text-amber-900"><AlertTriangle className="size-4" /> Conferir antes de planejar</h3><ul className="mt-2 list-inside list-disc space-y-1 text-sm text-amber-800">{alerts.map((alert) => <li key={alert}>{alert}</li>)}</ul></div>}
    <SectionCard title="5. Perfil nutricional complementar"><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[["height_cm","Altura (cm)"],["reference_weight_kg","Peso de referência (kg)"],["desired_meals","Número de refeições desejado"]].map(([key,label]) => <div key={key}><Label>{label}</Label><Input className="mt-1" type="number" value={profile[key as keyof Profile] as string} onChange={(e) => setField(key as keyof Profile, e.target.value)} /></div>)}<div><Label>Atividade física</Label><Select value={profile.activity_level} onValueChange={(value) => setField("activity_level", value)}><SelectTrigger className="mt-1"><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{["Sedentário", "Leve", "Moderado", "Intenso", "Muito intenso"].map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select></div>{[["wake_time","Horário de acordar"],["sleep_time","Horário de dormir"]].map(([key,label]) => <div key={key}><Label>{label}</Label><Input className="mt-1" type="time" value={profile[key as keyof Profile] as string} onChange={(e) => setField(key as keyof Profile, e.target.value)} /></div>)}<div className="sm:col-span-2 lg:col-span-3"><Label>Objetivo alimentar</Label><Textarea className="mt-1" value={profile.goal} onChange={(e) => setField("goal", e.target.value)} placeholder="Objetivo acordado para avaliação do profissional" /></div>{textFields.map(([key,label]) => <div key={key} className="grid gap-1"><Label>{label}</Label><Textarea value={profile[key] as string} onChange={(e) => setField(key, e.target.value)} /></div>)}<div className="grid gap-1 sm:col-span-2"><Label>Horários habituais das refeições (um por linha)</Label><Textarea value={profile.meal_schedule} onChange={(e) => setField("meal_schedule", e.target.value)} /></div></div><div className="mt-4 flex flex-wrap gap-4 text-sm">{([["simple_meals_preference","Prefere refeições simples"],["affordable_food_preference","Priorizar alimentos acessíveis"]] as [keyof Profile,string][]).map(([key,label]) => <label key={key} className="flex items-center gap-2"><input type="checkbox" checked={profile[key] as boolean} onChange={(e) => setField(key,e.target.checked)} />{label}</label>)}</div><div className="mt-5 flex flex-wrap items-center gap-3"><Button type="button" variant="outline" onClick={() => void saveProfile()} disabled={saving}>{saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}Salvar perfil</Button></div></SectionCard>
    <SectionCard title="6. Configuração da proposta e geração"><div className="grid gap-4 md:grid-cols-2"><div><Label>Objetivo da proposta</Label><Input className="mt-1" value={profile.goal} onChange={(e) => setField("goal", e.target.value)} placeholder="Ex.: organizar rotina alimentar" /></div><div><Label>Período</Label><Select value={duration} onValueChange={setDuration}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="1">1 dia</SelectItem><SelectItem value="3">3 dias</SelectItem><SelectItem value="7">7 dias</SelectItem></SelectContent></Select></div></div><p className="mt-4 text-sm text-slate-500">A geração só ocorre após sua solicitação. Não define metas calóricas nem substitui avaliação de nutricionista.</p><Button type="button" className="mt-4" onClick={() => void generatePlan()} disabled={generating || saving}><Sparkles className="mr-2 size-4" />{generating ? "Gerando proposta..." : "Gerar planejamento com IA"}</Button></SectionCard>
    {(activePlan || contentText) && <SectionCard title="7. Proposta editável"><p className="mb-3 text-sm text-slate-500">Edite os dados estruturados em JSON para ajustar refeições, alimentos, porções, alternativas e observações. A prévia abaixo é organizada por refeição.</p><Textarea className="min-h-[24rem] font-mono text-xs" value={contentText} onChange={(event) => setContentText(event.target.value)} disabled={activePlan?.status === "approved"} /><NutritionPlanPreview raw={contentText} /><div className="mt-4 flex flex-wrap gap-2"><Button type="button" onClick={() => void savePlan("draft")} disabled={saving || activePlan?.status === "approved"}>{saving ? "Salvando..." : "Salvar nova versão"}</Button><Button type="button" variant="outline" onClick={() => void savePlan("pending_review")} disabled={saving || activePlan?.status === "approved"}>Enviar para revisão</Button><Button type="button" variant="outline" onClick={() => void exportPdf()}>Exportar PDF</Button>{activePlan?.status === "pending_review" && <Button type="button" onClick={() => void approvePlan()} disabled={saving}>Aprovar como nutricionista</Button>}</div>{activePlan?.status === "approved" && <p className="mt-3 text-sm text-amber-800">Versão aprovada protegida contra edição. Gere outro plano para criar uma proposta nova.</p>}</SectionCard>}
    <SectionCard title="8. Histórico de planejamentos"><div className="space-y-3">{plans.length ? plans.map((plan) => <button key={plan.id} type="button" onClick={() => void loadVersions(plan)} className={`flex w-full flex-wrap items-center justify-between gap-3 rounded-xl border p-4 text-left ${activePlan?.id === plan.id ? "border-[#2f8f82] bg-[#f2f9f7]" : "border-slate-200 bg-white"}`}><span><strong>{plan.goal}</strong><span className="ml-2 rounded-full bg-slate-100 px-2 py-1 text-xs">{statusNames[plan.status] ?? plan.status}</span><span className="mt-1 block text-xs text-slate-500">{new Date(plan.created_at).toLocaleString("pt-BR")} · {plan.duration_days} dia(s) · {versions.length} versão(ões)</span></span><span className="text-sm text-[#26786e]">Ver versões</span></button>) : <div className="flex items-center gap-3 text-sm text-slate-500"><ClipboardList className="size-5" />Nenhum planejamento salvo para este paciente.</div>}{versions.length > 0 && <div className="border-t pt-4"><h3 className="font-semibold">Versões do plano selecionado</h3><div className="mt-2 flex flex-wrap gap-2">{versions.map((version) => <Button key={version.id} type="button" size="sm" variant="outline" onClick={() => setContentText(JSON.stringify(version.plan_content,null,2))}>v{version.version_number} · {new Date(version.created_at).toLocaleDateString("pt-BR")}</Button>)}</div></div>}</div></SectionCard>
    </>}
  </div></AdminLayout>;
}
