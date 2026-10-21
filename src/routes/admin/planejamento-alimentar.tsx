import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Activity, ClipboardList, HeartPulse, Loader2, Save, Sparkles } from "lucide-react";
import { AdminLayout, AdminNotice, PageIntro, SectionCard } from "@/components/admin/admin-ui";
import { NutritionPlanPreview } from "@/components/admin/nutrition-plan-preview";
import { HydrationSection, type HydrationPlan } from "@/components/admin/hydration-section";
import { ProteinSection, type ProteinPlan } from "@/components/admin/protein-section";
import { EnergySection, calculateEnergyEstimate, type EnergyPlan } from "@/components/admin/energy-section";
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
type Meal = { name: string; items: { food: string; portion: string; alternatives?: string[]; protein_g?: number; protein_source?: string; calories_kcal?: number; calories_source?: string }[]; notes?: string };
type PlanContent = { summary: string; objective: string; warnings: string[]; meals: Meal[]; observations: string[]; professional_confirmations: string[]; hydration?: HydrationPlan; protein?: ProteinPlan; energy?: EnergyPlan };
type Plan = { id: string; goal: string; duration_days: number; status: string; plan_content: PlanContent; model_name: string | null; created_at: string; approved_at: string | null; approved_by: string | null; approved_version_id: string | null };
type WeightMeasurement = { weight_kg: number; weight_date: string; weight_source: string };
const emptyHydration: HydrationPlan = { weight_kg: null, weight_date: null, weight_source: null, factor_ml_per_kg: 33, estimated_total_water_ml: null, adjusted_pure_water_ml: null, activity: "", climate: "", pregnancy: false, breastfeeding: false, kidney_disease: false, cardiac_disease: false, fluid_restriction: false, observations: "", professional_reviewed: false };
const emptyProtein: ProteinPlan = { weight_kg: null, weight_date: null, weight_source: null, factor_g_per_kg: 1.2, calculated_target_g: null, adjusted_target_g: null, kidney_disease: false, special_clinical_condition: false, clinical_info_sufficient: false, observations: "", professional_reviewed: false };
const latestWeight = (evaluations: Evaluation[], applications: Application[]): WeightMeasurement | null => [...evaluations.flatMap((item) => item.weight_kg !== null && item.weight_kg > 0 ? [{ weight_kg: item.weight_kg, weight_date: item.evaluation_date, weight_source: "Avaliação corporal" }] : []), ...applications.flatMap((item) => item.current_weight_kg > 0 ? [{ weight_kg: item.current_weight_kg, weight_date: item.application_date, weight_source: `Aplicação: ${item.procedure_name}` }] : [])].sort((a, b) => b.weight_date.localeCompare(a.weight_date))[0] ?? null;
const hydrationForPlan = (content: PlanContent | null | undefined, measurements: WeightMeasurement | null): HydrationPlan => content?.hydration ?? { ...emptyHydration, ...(measurements ?? {}) };
const proteinForPlan = (content: PlanContent | null | undefined, measurements: WeightMeasurement | null): ProteinPlan => content?.protein ?? { ...emptyProtein, ...(measurements ?? {}) };
const emptyEnergy: EnergyPlan = { method: "Mifflin-St Jeor", sex_parameter: null, bmr_kcal: null, activity_factor: null, estimated_daily_kcal: null, adjusted_daily_kcal: null, observations: "", professional_reviewed: false };
const energyForPlan = (content: PlanContent | null | undefined): EnergyPlan => content?.energy ?? { ...emptyEnergy };
type PlanVersion = { id: string; version_number: number; plan_content: PlanContent; created_at: string; created_by: string };
const emptyProfile: Profile = { height_cm: "", reference_weight_kg: "", goal: "", activity_level: "", exercise_details: "", wake_time: "", sleep_time: "", meal_schedule: "", desired_meals: "", work_routine: "", cooking_availability: "", food_budget: "", preferred_foods: "", avoided_foods: "", cultural_restrictions: "", simple_meals_preference: false, affordable_food_preference: false, allergies: "", intolerances: "", diagnosed_conditions: "", pregnancy_or_breastfeeding: "", medications: "", supplements: "", eating_disorder_history: "" };
const asProfile = (row: Record<string, unknown> | null): Profile => row ? Object.fromEntries(Object.keys(emptyProfile).map((key) => [key, key === "meal_schedule" ? Array.isArray(row[key]) ? (row[key] as string[]).join("\n") : "" : key.endsWith("preference") ? Boolean(row[key]) : row[key] == null ? "" : String(row[key])])) as Profile : { ...emptyProfile };
const ageFrom = (date: string | null) => { if (!date) return null; const birth = new Date(`${date}T00:00:00`); if (Number.isNaN(birth.getTime())) return null; const now = new Date(); return now.getFullYear() - birth.getFullYear() - (now < new Date(now.getFullYear(), birth.getMonth(), birth.getDate()) ? 1 : 0); };
const display = (value: string | number | null | undefined, unit = "") => value === null || value === undefined || value === "" ? "Não informado" : `${value}${unit}`;
const statusNames: Record<string, string> = { draft: "Rascunho", pending_review: "Aguardando revisão", approved: "Aprovado por nutricionista", archived: "Arquivado" };
type PlanningDraft = { patientId?: string; profile?: Profile; hydration?: HydrationPlan; protein?: ProteinPlan; energy?: EnergyPlan; activePlanId?: string | null; contentText?: string; duration?: string };
const planningDraftKey = (userId: string) => `admin:planning-alimentar:draft:${userId}`;
const readPlanningDraft = (userId: string): PlanningDraft => {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(window.sessionStorage.getItem(planningDraftKey(userId)) ?? "{}") as PlanningDraft; }
  catch { return {}; }
};
const savePlanningDraft = (userId: string, draft: PlanningDraft) => {
  try { window.sessionStorage.setItem(planningDraftKey(userId), JSON.stringify(draft)); }
  catch { return; }
};
const scrollDraftKey = "admin:planning-alimentar:scroll";
const saveScrollPosition = () => {
  try { window.sessionStorage.setItem(scrollDraftKey, String(window.scrollY)); }
  catch { return; }
};
const readScrollPosition = () => {
  try { return Number(window.sessionStorage.getItem(scrollDraftKey)); }
  catch { return 0; }
};

export const Route = createFileRoute("/admin/planejamento-alimentar")({ component: NutritionPlanningPage });

function NutritionPlanningPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [entryDraft, setEntryDraft] = useState<PlanningDraft>({});
  const loadedPatientId = useRef<string | null>(null);
  const scrollRestored = useRef(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientId, setPatientId] = useState("");
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [anamnesis, setAnamnesis] = useState<Anamnesis | null>(null);
  const [profile, setProfile] = useState<Profile>({ ...emptyProfile });
  const [hydration, setHydration] = useState<HydrationPlan>({ ...emptyHydration });
  const [protein, setProtein] = useState<ProteinPlan>({ ...emptyProtein });
  const [energy, setEnergy] = useState<EnergyPlan>({ ...emptyEnergy });
  const [plans, setPlans] = useState<Plan[]>([]);
  const [versions, setVersions] = useState<PlanVersion[]>([]);
  const [activePlan, setActivePlan] = useState<Plan | null>(null);
  const [contentText, setContentText] = useState("");
  const [duration, setDuration] = useState("1");
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [syntheticTest, setSyntheticTest] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const selected = patients.find((patient) => patient.id === patientId) ?? null;
  const currentEvaluation = evaluations[0] ?? null;
  useEffect(() => {
    if (!user) return;
    const draft = readPlanningDraft(user.id);
    setEntryDraft(draft);
    if (!draft.patientId) return;
    setPatientId(draft.patientId);
    if (draft.profile) setProfile({ ...emptyProfile, ...draft.profile });
    if (draft.hydration) setHydration({ ...emptyHydration, ...draft.hydration });
    if (draft.protein) setProtein({ ...emptyProtein, ...draft.protein });
    if (draft.energy) setEnergy({ ...emptyEnergy, ...draft.energy });
    setContentText(draft.contentText ?? "");
    setDuration(draft.duration ?? "1");
  }, [user]);
  useEffect(() => {
    let timer: number | undefined;
    const onScroll = () => { if (timer !== undefined) window.clearTimeout(timer); timer = window.setTimeout(saveScrollPosition, 100); };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); if (timer !== undefined) window.clearTimeout(timer); saveScrollPosition(); };
  }, []);
  useEffect(() => {
    if (scrollRestored.current || !patientId || loadedPatientId.current !== patientId) return;
    const position = readScrollPosition();
    if (Number.isFinite(position) && position > 0) requestAnimationFrame(() => window.scrollTo(0, position));
    scrollRestored.current = true;
  }, [patientId, loading]);
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

  function selectPlan(plan: Plan) { setSyntheticTest(false); setActivePlan(plan); setContentText(JSON.stringify(plan.plan_content, null, 2)); setDuration(String(plan.duration_days)); const measurements = latestWeight(evaluations, applications); setHydration(hydrationForPlan(plan.plan_content, measurements)); setProtein(proteinForPlan(plan.plan_content, measurements)); setEnergy(energyForPlan(plan.plan_content)); }

  useEffect(() => {
    if (authLoading || !user) return;
    let active = true;
    void supabase.from("pacientes").select("id,nome,data_nascimento,genero,area,queixa_principal,observacoes_iniciais").eq("profissional_id", user.id).order("nome").then(({ data, error: loadError }) => { if (!active) return; if (loadError) setError("Não foi possível carregar os pacientes."); else setPatients((data as Patient[] | null) ?? []); });
    return () => { active = false; };
  }, [authLoading, user]);

  useEffect(() => {
    if (!patientId || !user) { loadedPatientId.current = null; setSyntheticTest(false); setEvaluations([]); setApplications([]); setAnamnesis(null); setProfile({ ...emptyProfile }); setHydration({ ...emptyHydration }); setProtein({ ...emptyProtein }); setEnergy({ ...emptyEnergy }); setPlans([]); setActivePlan(null); return; }
    setSyntheticTest(false);
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
      const evaluationRows = (evaluationResult.data as Evaluation[] | null) ?? [];
      const applicationRows = ((applicationResult.data as Application[] | null) ?? []).slice(0, 1);
      const list = (planResult.data as Plan[] | null) ?? [];
      const savedDraft = readPlanningDraft(user.id);
      const resume = savedDraft.patientId === patientId;
      const selectedPlan = resume && savedDraft.activePlanId === null ? null : list.find((plan) => plan.id === savedDraft.activePlanId) ?? list[0] ?? null;
      setEvaluations(evaluationRows); setApplications(applicationRows); setAnamnesis((anamnesisResult.data as Anamnesis | null) ?? null); setProfile(resume && savedDraft.profile ? savedDraft.profile : asProfile(profileResult.data as Record<string, unknown> | null));
      setPlans(list); setActivePlan(selectedPlan);
      const lastWeight = latestWeight(evaluationRows, applicationRows);
      if (selectedPlan) {
        setContentText(resume && savedDraft.contentText !== undefined ? savedDraft.contentText : JSON.stringify(selectedPlan.plan_content, null, 2));
        setDuration(resume && savedDraft.duration ? savedDraft.duration : String(selectedPlan.duration_days));
        setHydration(resume && savedDraft.hydration ? savedDraft.hydration : hydrationForPlan(selectedPlan.plan_content, lastWeight));
        setProtein(resume && savedDraft.protein ? savedDraft.protein : proteinForPlan(selectedPlan.plan_content, lastWeight));
        setEnergy(resume && savedDraft.energy ? savedDraft.energy : energyForPlan(selectedPlan.plan_content));
      } else {
        setContentText(resume ? savedDraft.contentText ?? "" : "");
        setDuration(resume && savedDraft.duration ? savedDraft.duration : "1");
        setHydration(resume && savedDraft.hydration ? savedDraft.hydration : hydrationForPlan(null, lastWeight));
        setProtein(resume && savedDraft.protein ? savedDraft.protein : proteinForPlan(null, lastWeight));
        setEnergy(resume && savedDraft.energy ? savedDraft.energy : { ...emptyEnergy });
      }
      loadedPatientId.current = patientId;
      setLoading(false);
    });
    return () => { active = false; };
  }, [patientId, user]);

  useEffect(() => {
    if (!user || !patientId || loading || loadedPatientId.current !== patientId) return;
    savePlanningDraft(user.id, { patientId, profile, hydration, protein, energy, activePlanId: activePlan?.id ?? null, contentText, duration });
  }, [user, patientId, loading, profile, hydration, protein, energy, activePlan, contentText, duration]);

  useEffect(() => {
    if (entryDraft.patientId === patientId && entryDraft.profile) return;
    const latestWeight = evaluations[0]?.weight_kg;
    if (latestWeight !== null && latestWeight !== undefined) {
      setProfile((current) => ({ ...current, reference_weight_kg: String(latestWeight) }));
    }
  }, [entryDraft, evaluations, patientId]);

  async function saveProfile(): Promise<boolean> {
    if (!user || !patientId) return false;
    setSaving(true); setError(""); setMessage("");
    const payload = { patient_id: patientId, profissional_id: user.id, height_cm: profile.height_cm ? Number(profile.height_cm) : null, reference_weight_kg: profile.reference_weight_kg ? Number(profile.reference_weight_kg) : null, goal: profile.goal || null, activity_level: profile.activity_level || null, exercise_details: profile.exercise_details || null, wake_time: profile.wake_time || null, sleep_time: profile.sleep_time || null, meal_schedule: profile.meal_schedule.split("\n").map((item) => item.trim()).filter(Boolean), desired_meals: profile.desired_meals ? Number(profile.desired_meals) : null, work_routine: profile.work_routine || null, cooking_availability: profile.cooking_availability || null, food_budget: profile.food_budget || null, preferred_foods: profile.preferred_foods || null, avoided_foods: profile.avoided_foods || null, cultural_restrictions: profile.cultural_restrictions || null, simple_meals_preference: profile.simple_meals_preference, affordable_food_preference: profile.affordable_food_preference, allergies: profile.allergies || null, intolerances: profile.intolerances || null, diagnosed_conditions: profile.diagnosed_conditions || null, pregnancy_or_breastfeeding: profile.pregnancy_or_breastfeeding || null, medications: profile.medications || null, supplements: profile.supplements || null, eating_disorder_history: profile.eating_disorder_history || null, updated_at: new Date().toISOString() };
    const { error: saveError } = await supabase.from("patient_nutrition_profiles").upsert(payload, { onConflict: "patient_id" });
    setSaving(false); if (saveError) { setError("Não foi possível salvar o perfil nutricional."); return false; } setMessage("Perfil nutricional salvo."); return true;
  }
  const setField = (key: keyof Profile, value: string | boolean) => setProfile((old) => ({ ...old, [key]: value }));

  async function savePlan(status: "draft" | "pending_review" = "draft", contentOverride?: PlanContent, modelName?: string, allowFreshGeneratedPlan = false) {
    if (syntheticTest && !allowFreshGeneratedPlan) { setError("O resultado do teste é fictício e não pode ser salvo como plano de paciente."); return; }
    if (!user || !patientId || !selected) return;
    let parsed: PlanContent;
    try { parsed = contentOverride ?? JSON.parse(contentText) as PlanContent; if (!parsed || !Array.isArray(parsed.meals)) throw new Error(); }
    catch { setError("O conteúdo precisa ser um JSON válido com uma lista de refeições."); return; }
    const proteinFactorInput = Number(protein.factor_g_per_kg);
    if (!Number.isFinite(proteinFactorInput) || proteinFactorInput < 0.1 || proteinFactorInput > 10) { setError("O fator de proteína deve estar entre 0,1 e 10 g/kg/dia."); return; }
    if (protein.adjusted_target_g !== null && (!Number.isFinite(protein.adjusted_target_g) || protein.adjusted_target_g < 1 || protein.adjusted_target_g > 1000 || !protein.observations.trim())) { setError("A meta manual deve estar entre 1 e 1.000 g/dia e exige justificativa profissional."); return; }
    if (energy.adjusted_daily_kcal !== null && (!Number.isFinite(energy.adjusted_daily_kcal) || energy.adjusted_daily_kcal < 500 || energy.adjusted_daily_kcal > 10000 || !energy.observations.trim())) { setError("A meta energética manual deve estar entre 500 e 10.000 kcal/dia e exige justificativa profissional."); return; }
    const energyHeight = currentEvaluation?.height_cm ?? (profile.height_cm ? Number(profile.height_cm) : null);
    const energyCalculation = calculateEnergyEstimate(latestWeight(evaluations, applications)?.weight_kg ?? null, energyHeight, ageFrom(selected.data_nascimento), selected.genero, profile.activity_level);
    const hydrationNeedsReview = hydration.pregnancy || hydration.breastfeeding || hydration.kidney_disease || hydration.cardiac_disease || hydration.fluid_restriction;
    const hydrationFactor = Number(hydration.factor_ml_per_kg);
    const hydrationEstimate = ageFrom(selected.data_nascimento) !== null && ageFrom(selected.data_nascimento)! >= 18 && !hydrationNeedsReview && hydration.weight_kg !== null && hydration.weight_kg > 0 && hydrationFactor > 0 ? Math.round(hydration.weight_kg * hydrationFactor) : null;
    const proteinBlocked = ageFrom(selected.data_nascimento) === null || ageFrom(selected.data_nascimento)! < 18 || !protein.clinical_info_sufficient || protein.kidney_disease || protein.special_clinical_condition || protein.weight_kg === null || protein.weight_kg <= 0;
    const proteinFactor = proteinFactorInput;
    const proteinEstimate = !proteinBlocked ? Math.round(protein.weight_kg! * proteinFactor * 100) / 100 : null;
    parsed = { ...parsed, hydration: { ...hydration, estimated_total_water_ml: hydrationEstimate }, protein: { ...protein, calculated_target_g: proteinEstimate }, energy: { ...energy, bmr_kcal: energyCalculation?.bmr_kcal ?? null, activity_factor: energyCalculation?.activity_factor ?? null, estimated_daily_kcal: energyCalculation?.estimated_daily_kcal ?? null } };
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
    const list = (data as Plan[] | null) ?? []; setPlans(list); const match = list.find((plan) => plan.id === (selectId ?? activePlan?.id)) ?? list[0]; if (match) { setActivePlan(match); setContentText(JSON.stringify(match.plan_content, null, 2)); const measurements = latestWeight(evaluations, applications); setHydration(hydrationForPlan(match.plan_content, measurements)); setProtein(proteinForPlan(match.plan_content, measurements)); setEnergy(energyForPlan(match.plan_content)); const { data: versionData } = await supabase.from("nutrition_plan_versions").select("id,version_number,plan_content,created_at,created_by").eq("plan_id", match.id).order("version_number", { ascending: false }); setVersions((versionData as PlanVersion[] | null) ?? []); }
  }

  async function generatePlan(testMode = false) {
    if (!user) return;
    if (!testMode && (!patientId || profile.goal.trim().length < 3)) {
      setError("Selecione um paciente e informe um objetivo com pelo menos 3 caracteres.");
      return;
    }
    setError("");
    setMessage(testMode ? "Testando o Gemini com dados fictícios..." : "Gerando com o Gemini. A resposta pode levar até 45 segundos...");
    setGenerating(true);
    try {
      const body = testMode
        ? { test_mode: true }
        : { patient_id: patientId, goal: profile.goal.trim(), duration_days: Number(duration), desired_meals: profile.desired_meals ? Number(profile.desired_meals) : null, nutritional_profile: profile };
      const { data, error: functionError } = await supabase.functions.invoke("nutrition-planning", { body });
      if (functionError || !data?.plan) {
        let responseError: string | undefined;
        const response = functionError?.context as Response | undefined;
        if (response instanceof Response) {
          const body = await response.json().catch(() => null) as { error?: string } | null;
          responseError = body?.error;
        }
        setError(data?.error ?? responseError ?? functionError?.message ?? "Não foi possível gerar o planejamento no Gemini.");
        setMessage("");
        return;
      }
      setContentText(JSON.stringify(data.plan as PlanContent, null, 2));
      if (testMode) {
        setSyntheticTest(true);
        setMessage("Teste Gemini concluído com dados fictícios. Este resultado não foi salvo no paciente.");
      } else {
        setSyntheticTest(false);
        setMessage("Planejamento gerado. Revise o conteúdo antes de salvar ou enviar para aprovação.");
        await savePlan("draft", data.plan as PlanContent, data.model ?? null, true);
      }
    } catch {
      setError("Ocorreu um erro ao chamar o serviço Gemini.");
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
  function selectVersion(version: PlanVersion) {
    setSyntheticTest(false);
    setContentText(JSON.stringify(version.plan_content, null, 2));
    const measurements = latestWeight(evaluations, applications);
    setHydration(hydrationForPlan(version.plan_content, measurements));
    setProtein(proteinForPlan(version.plan_content, measurements));
    setEnergy(energyForPlan(version.plan_content));
  }

  async function approvePlan() {
    if (!activePlan?.id || !versions[0]) return;
    setSaving(true); const { data, error: approvalError } = await supabase.functions.invoke("nutrition-approve", { body: { plan_id: activePlan.id, version_id: versions[0].id } }); setSaving(false);
    if (approvalError || !data?.approved) setError(data?.error ?? "A aprovação exige credencial CRN verificada e uma versão válida enviada para revisão."); else { setMessage("Planejamento aprovado."); await refreshPlans(activePlan.id); }
  }

  async function exportPdf(_draftMark?: boolean) {
    if (syntheticTest) { setError("O resultado do teste é fictício e não pode ser exportado como documento de paciente."); return; }
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
    for (const meal of plan.meals ?? []) { line(meal.name, 13, true); for (const item of meal.items ?? []) { line(`- ${item.food}: ${item.portion}`); if (typeof item.protein_g === "number" && item.protein_source?.trim()) line(`Proteína por porção: ${item.protein_g.toFixed(2)} g (${item.protein_source}).`); if (typeof item.calories_kcal === "number" && item.calories_source?.trim()) line(`Energia por porção: ${item.calories_kcal.toFixed(2)} kcal (${item.calories_source}).`); if (item.alternatives?.length) line(`Alternativas: ${item.alternatives.join(", ")}`); } if (meal.notes) line(`Observacoes: ${meal.notes}`); y += 8; }
    for (const observation of plan.observations ?? []) line(`Orientacao: ${observation}`);
    if (activePlan?.status === "approved" && plan.hydration?.professional_reviewed) {
      const hydrationPlan = plan.hydration;
      line("HIDRATACAO DIARIA - ORIENTACAO REVISADA", 13, true);
      line(`Peso usado: ${display(hydrationPlan.weight_kg, " kg")} · Origem: ${hydrationPlan.weight_source ?? "Não informada"} · Data: ${hydrationPlan.weight_date ?? "Não informada"}`);
      line("Estimativa de água total diária (alimentos + bebidas; não equivale à água pura a beber):", 9);
      if (hydrationPlan.estimated_total_water_ml !== null) {
        line(`Fórmula: ${hydrationPlan.weight_kg} kg × ${hydrationPlan.factor_ml_per_kg} mL/kg/dia = ${hydrationPlan.estimated_total_water_ml} mL/dia (${(hydrationPlan.estimated_total_water_ml / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} L/dia).`);
      } else line("Estimativa automática não calculada; requer avaliação específica do profissional.");
      if (hydrationPlan.adjusted_pure_water_ml !== null) line(`Ajuste profissional de água pura a beber: ${hydrationPlan.adjusted_pure_water_ml} mL/dia.`);
      if (hydrationPlan.activity) line(`Atividade física: ${hydrationPlan.activity}`);
      if (hydrationPlan.climate) line(`Clima/temperatura: ${hydrationPlan.climate}`);
      if (hydrationPlan.observations) line(`Observações: ${hydrationPlan.observations}`);
    }
    if (activePlan?.status === "approved" && plan.protein?.professional_reviewed) {
      const proteinPlan = plan.protein;
      const target = proteinPlan.adjusted_target_g ?? proteinPlan.calculated_target_g;
      line("NECESSIDADE DIARIA DE PROTEINAS - META REVISADA", 13, true);
      line(`Peso de referência: ${display(proteinPlan.weight_kg, " kg")} · Origem: ${proteinPlan.weight_source ?? "Não informada"} · Data: ${proteinPlan.weight_date ?? "Não informada"}`);
      if (proteinPlan.calculated_target_g !== null) line(`Referência: ${proteinPlan.weight_kg} kg × ${proteinPlan.factor_g_per_kg} g/kg/dia = ${proteinPlan.calculated_target_g.toFixed(2)} g/dia.`);
      if (target !== null) line(`Meta revisada pela nutricionista: ${target.toFixed(2)} g/dia${proteinPlan.adjusted_target_g !== null ? " (ajuste manual)" : " (referência calculada)"}.`);
      if (proteinPlan.observations) line(`Justificativa/observações: ${proteinPlan.observations}`);
      const completeMeals = (plan.meals ?? []).map((meal) => {
        const items = meal.items ?? [];
        const complete = items.length > 0 && items.every((item) => typeof item.protein_g === "number" && Number.isFinite(item.protein_g) && item.protein_g >= 0 && typeof item.protein_source === "string" && item.protein_source.trim());
        return { name: meal.name, total: complete ? items.reduce((sum, item) => sum + (item.protein_g ?? 0), 0) : null };
      });
      for (const meal of completeMeals) if (meal.total !== null) line(`Proteína estimada — ${meal.name}: ${meal.total.toFixed(1)} g.`);
      if (completeMeals.length > 0 && completeMeals.every((meal) => meal.total !== null)) {
        const dailyProtein = completeMeals.reduce((sum, meal) => sum + (meal.total ?? 0), 0);
        line(`Total estimado do planejamento: ${dailyProtein.toFixed(1)} g/dia.`);
        if (target !== null) line(`Diferença para a meta: ${(dailyProtein - target >= 0 ? "+" : "")}${(dailyProtein - target).toFixed(1)} g.`);
      } else line("Total de proteína das refeições não calculado: faltam valores por porção e/ou fontes nutricionais confiáveis.");
    }
    if (activePlan?.status === "approved" && plan.energy?.professional_reviewed) {
      const energyPlan = plan.energy;
      line("AVALIAÇÃO ENERGÉTICA - REVISADA", 13, true);
      if (energyPlan.bmr_kcal !== null && energyPlan.activity_factor !== null && energyPlan.estimated_daily_kcal !== null) line(`Mifflin-St Jeor: metabolismo basal estimado ${energyPlan.bmr_kcal} kcal/dia × fator de atividade ${energyPlan.activity_factor} = ${energyPlan.estimated_daily_kcal} kcal/dia.`);
      if (energyPlan.adjusted_daily_kcal !== null) line(`Meta energética ajustada pela nutricionista: ${energyPlan.adjusted_daily_kcal} kcal/dia.`);
      if (energyPlan.observations) line(`Justificativa/observações: ${energyPlan.observations}`);
    }
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
      <SectionCard title="3. Histórico de evolução corporal"><div className="space-y-4">{evaluations.length ? <><div className="rounded-xl border border-slate-200 p-4"><div className="flex items-center gap-2 font-semibold"><Activity className="size-4 text-[#2f8f82]" />{new Date(`${evaluations[0].evaluation_date}T00:00:00`).toLocaleDateString("pt-BR")}<span className="rounded-full bg-[#e3f3ef] px-2 py-0.5 text-xs text-[#26786e]">Mais recente</span></div><div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">{[["Peso", display(evaluations[0].weight_kg, " kg")],["Altura", display(evaluations[0].height_cm, " cm")],["IMC", display(evaluations[0].bmi)],["Gordura corporal", display(evaluations[0].body_fat_percentage, "%")],["Massa muscular", display(evaluations[0].muscle_mass_kg, " kg")],["Cintura", display(evaluations[0].waist_cm, " cm")],["Abdômen", display(evaluations[0].abdomen_cm, " cm")],["Quadril", display(evaluations[0].hip_cm, " cm")],["Gordura visceral", display(evaluations[0].visceral_fat_level)],["Água corporal", display(evaluations[0].body_water_percentage, "%")],["Metabolismo basal registrado", display(evaluations[0].basal_metabolism_kcal, " kcal")]].map(([label, value]) => <div key={label}><p className="text-xs text-slate-500">{label}</p><p>{value}</p></div>)}</div>{evaluations[0].clinical_notes && <p className="mt-3 text-sm text-slate-600">Observações: {evaluations[0].clinical_notes}</p>}</div><div className="rounded-xl bg-[#f3f8f7] px-4 py-3 text-sm"><strong>Variação desde a primeira avaliação: </strong>{evaluations.length > 1 && evaluations[evaluations.length - 1].weight_kg !== null && evaluations[0].weight_kg !== null ? (() => { const change = evaluations[evaluations.length - 1].weight_kg! - evaluations[0].weight_kg!; const amount = Math.abs(change).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }); return change > 0 ? `Perda de ${amount} kg` : change < 0 ? `Ganho de ${amount} kg` : "Sem alteração (0,0 kg)"; })() : "São necessárias duas avaliações com peso registrado para calcular."}</div></> : <p className="text-sm text-slate-500">Sem avaliações corporais cadastradas.</p>}</div></SectionCard>
      <SectionCard title="4. Aplicações e procedimentos"><div className="space-y-3">{applications.length ? applications.map((application) => <div key={application.id} className="flex flex-wrap items-start justify-between gap-2 rounded-lg border p-3 text-sm"><div><p className="font-medium">{application.procedure_name}</p><p className="text-slate-500">{new Date(`${application.application_date}T00:00:00`).toLocaleDateString("pt-BR")} · peso registrado {application.current_weight_kg} kg</p>{application.notes && <p className="mt-1 text-slate-500">{application.notes}</p>}</div><span className="text-xs text-slate-400">Contexto registrado; sem inferir efeitos clínicos</span></div>) : <p className="text-sm text-slate-500">Sem procedimentos registrados.</p>}</div></SectionCard>
    </>}
    {alerts.length > 0 && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4"><h3 className="flex items-center gap-2 font-semibold text-amber-900"><AlertTriangle className="size-4" /> Conferir antes de planejar</h3><ul className="mt-2 list-inside list-disc space-y-1 text-sm text-amber-800">{alerts.map((alert) => <li key={alert}>{alert}</li>)}</ul></div>}
    <SectionCard title="5. Perfil nutricional complementar"><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[["height_cm","Altura (cm)"],["reference_weight_kg","Peso de referência (kg)"],["desired_meals","Número de refeições desejado"]].map(([key,label]) => <div key={key}><Label>{label}</Label><Input className="mt-1" type="number" value={profile[key as keyof Profile] as string} onChange={(e) => setField(key as keyof Profile, e.target.value)} /></div>)}<div><Label>Atividade física</Label><Select value={profile.activity_level} onValueChange={(value) => setField("activity_level", value)}><SelectTrigger className="mt-1"><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{["Sedentário", "Leve", "Moderado", "Intenso", "Muito intenso"].map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select></div>{[["wake_time","Horário de acordar"],["sleep_time","Horário de dormir"]].map(([key,label]) => <div key={key}><Label>{label}</Label><Input className="mt-1" type="time" value={profile[key as keyof Profile] as string} onChange={(e) => setField(key as keyof Profile, e.target.value)} /></div>)}<div className="sm:col-span-2 lg:col-span-3"><Label>Objetivo alimentar</Label><Textarea className="mt-1" value={profile.goal} onChange={(e) => setField("goal", e.target.value)} placeholder="Objetivo acordado para avaliação do profissional" /></div>{textFields.map(([key,label]) => <div key={key} className="grid gap-1"><Label>{label}</Label><Textarea value={profile[key] as string} onChange={(e) => setField(key, e.target.value)} /></div>)}<div className="grid gap-1 sm:col-span-2"><Label>Horários habituais das refeições (um por linha)</Label><Textarea value={profile.meal_schedule} onChange={(e) => setField("meal_schedule", e.target.value)} /></div></div><div className="mt-4 flex flex-wrap gap-4 text-sm">{([["simple_meals_preference","Prefere refeições simples"],["affordable_food_preference","Priorizar alimentos acessíveis"]] as [keyof Profile,string][]).map(([key,label]) => <label key={key} className="flex items-center gap-2"><input type="checkbox" checked={profile[key] as boolean} onChange={(e) => setField(key,e.target.checked)} />{label}</label>)}</div><div className="mt-5 flex flex-wrap items-center gap-3"><Button type="button" variant="outline" onClick={() => void saveProfile()} disabled={saving}>{saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}Salvar perfil</Button></div></SectionCard>
    <EnergySection value={energy} onChange={setEnergy} weightKg={latestWeight(evaluations, applications)?.weight_kg ?? null} heightCm={currentEvaluation?.height_cm ?? (profile.height_cm ? Number(profile.height_cm) : null)} patientAge={ageFrom(selected.data_nascimento)} gender={selected.genero} activityLevel={profile.activity_level} onSave={() => void savePlan("draft")} saving={saving} canSave={Boolean(contentText)} />
    <HydrationSection value={hydration} onChange={setHydration} patientAge={ageFrom(selected.data_nascimento)} onSave={() => void savePlan("draft")} saving={saving} canSave={Boolean(contentText)} />
    <ProteinSection value={protein} onChange={setProtein} patientAge={ageFrom(selected.data_nascimento)} rawPlan={contentText} onPlanChange={setContentText} onSave={() => void savePlan("draft")} saving={saving} canSave={Boolean(contentText)} />
    <SectionCard title="6. Configuração da proposta e geração">
      <div className="grid gap-4 md:grid-cols-2">
        <div><Label>Objetivo da proposta</Label><Input className="mt-1" value={profile.goal} onChange={(e) => setField("goal", e.target.value)} placeholder="Ex.: organizar rotina alimentar" /></div>
        <div><Label>Período</Label><Select value={duration} onValueChange={setDuration}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="1">1 dia</SelectItem><SelectItem value="3">3 dias</SelectItem><SelectItem value="7">7 dias</SelectItem></SelectContent></Select></div>
      </div>
      <p className="mt-4 text-sm text-amber-800">A geração com dados reais encaminha informações clínicas ao Gemini conforme sua autorização e está sujeita aos termos de privacidade do Google. O modo de teste usa apenas dados fictícios.</p>
      <div className="mt-4 flex flex-wrap gap-2"><Button type="button" onClick={() => void generatePlan()} disabled={generating || saving}><Sparkles className="mr-2 size-4" />{generating ? "Gerando..." : "Gerar planejamento alimentar"}</Button><Button type="button" variant="outline" onClick={() => void generatePlan(true)} disabled={generating || saving}>Testar somente com dados fictícios</Button></div>
      {message && <p className="mt-3 text-sm text-[#26786e]" role="status">{message}</p>}
      {error && <p className="mt-3 text-sm text-red-600" role="alert">{error}</p>}
    </SectionCard>
    {(activePlan || contentText) && <SectionCard title={syntheticTest ? "Teste Gemini — somente dados fictícios" : "7. Proposta editável"}><p className="mb-3 text-sm text-slate-500">Edite os dados estruturados em JSON para ajustar refeições, alimentos, porções, alternativas e observações. A prévia abaixo é organizada por refeição.</p><Textarea className="min-h-[24rem] font-mono text-xs" value={contentText} onChange={(event) => setContentText(event.target.value)} disabled={syntheticTest || activePlan?.status === "approved"} /><NutritionPlanPreview raw={contentText} /><div className="mt-4 flex flex-wrap gap-2"><Button type="button" onClick={() => void savePlan("draft")} disabled={saving || syntheticTest || activePlan?.status === "approved"}>{saving ? "Salvando..." : "Salvar nova versão"}</Button><Button type="button" variant="outline" onClick={() => void savePlan("pending_review")} disabled={saving || syntheticTest || activePlan?.status === "approved"}>Enviar para revisão</Button><Button type="button" variant="outline" onClick={() => void exportPdf()} disabled={syntheticTest}>Exportar PDF</Button>{!syntheticTest && activePlan?.status === "pending_review" && <Button type="button" onClick={() => void approvePlan()} disabled={saving}>Aprovar como nutricionista</Button>}</div>{syntheticTest && <p className="mt-3 text-sm font-medium text-amber-800">Conteúdo fictício de teste. Não salve, aprove ou use como recomendação clínica.</p>}{!syntheticTest && activePlan?.status === "approved" && <p className="mt-3 text-sm text-amber-800">Versão aprovada protegida contra edição. Gere outro plano para criar uma proposta nova.</p>}</SectionCard>}
    <SectionCard title="8. Histórico de planejamentos"><div className="space-y-3">{plans.length ? plans.map((plan) => <button key={plan.id} type="button" onClick={() => void loadVersions(plan)} className={`flex w-full flex-wrap items-center justify-between gap-3 rounded-xl border p-4 text-left ${activePlan?.id === plan.id ? "border-[#2f8f82] bg-[#f2f9f7]" : "border-slate-200 bg-white"}`}><span><strong>{plan.goal}</strong><span className="ml-2 rounded-full bg-slate-100 px-2 py-1 text-xs">{statusNames[plan.status] ?? plan.status}</span><span className="mt-1 block text-xs text-slate-500">{new Date(plan.created_at).toLocaleString("pt-BR")} · {plan.duration_days} dia(s) · {versions.length} versão(ões)</span></span><span className="text-sm text-[#26786e]">Ver versões</span></button>) : <div className="flex items-center gap-3 text-sm text-slate-500"><ClipboardList className="size-5" />Nenhum planejamento salvo para este paciente.</div>}{versions.length > 0 && <div className="border-t pt-4"><h3 className="font-semibold">Versões do plano selecionado</h3><div className="mt-2 flex flex-wrap gap-2">{versions.map((version) => <Button key={version.id} type="button" size="sm" variant="outline" onClick={() => selectVersion(version)}>v{version.version_number} · {new Date(version.created_at).toLocaleDateString("pt-BR")}</Button>)}</div></div>}</div></SectionCard>
    </>}
  </div></AdminLayout>;
}
