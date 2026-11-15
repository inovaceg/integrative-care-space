import { createFileRoute } from "@tanstack/react-router";
import { BellRing, Building2, Check, ShieldCheck, Stethoscope, UserRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminLayout, AdminNotice, PageIntro } from "@/components/admin/admin-ui";
import { useAuth } from "@/components/auth/auth-provider";
import { supabase } from "@/integrations/supabase/client";
import { useAdminFormDraft } from "@/lib/admin/use-admin-form-draft";

export const Route = createFileRoute("/admin/configuracoes")({ component: SettingsPage });

let settingsDraftState = { tab: "perfil", saved: false };

function SettingsPage() {
  const { user } = useAuth();
  const [saved, setSaved] = useState(settingsDraftState.saved);
  const [tab, setTab] = useState(settingsDraftState.tab);
  const [nutritionistName, setNutritionistName] = useState("");
  const [nutritionistCrn, setNutritionistCrn] = useState("");
  const [credentialLoading, setCredentialLoading] = useState(true);
  const [credentialSaving, setCredentialSaving] = useState(false);
  const [credentialMessage, setCredentialMessage] = useState("");
  const [credentialError, setCredentialError] = useState("");
  const [draftReady, setDraftReady] = useState(false);
  const settingsDraft = useAdminFormDraft<{ nutritionistName: string; nutritionistCrn: string }>(user?.id, 'settings:nutritionist-credential');

  useEffect(() => {
    if (!user) { setCredentialLoading(false); return; }
    let active = true;
    void supabase.from("nutritionist_credentials").select("full_name,crn").eq("profissional_id", user.id).order("updated_at", { ascending: false }).limit(1).maybeSingle().then(({ data, error }) => {
      if (!active) return;
      if (error) setCredentialError("Não foi possível carregar o cadastro da nutricionista.");
      else if (data) { setNutritionistName(data.full_name); setNutritionistCrn(data.crn); }
      setCredentialLoading(false);
    });
    return () => { active = false; };
  }, [user]);

  useEffect(() => {
    if (settingsDraft.status === 'loading' || credentialLoading) return;
    if (settingsDraft.restoredPayload) {
      setNutritionistName(settingsDraft.restoredPayload.nutritionistName);
      setNutritionistCrn(settingsDraft.restoredPayload.nutritionistCrn);
      setTab(settingsDraft.stage === 1 ? 'nutricionista' : 'perfil');
    }
    setDraftReady(true);
  }, [credentialLoading, settingsDraft.restoredPayload, settingsDraft.stage, settingsDraft.status]);
  useEffect(() => {
    if (draftReady && (nutritionistName || nutritionistCrn)) settingsDraft.scheduleSave({ nutritionistName, nutritionistCrn }, tab === 'nutricionista' ? 1 : 0);
  }, [draftReady, nutritionistCrn, nutritionistName, settingsDraft.scheduleSave, tab]);

  function updateSaved() { settingsDraftState.saved = true; setSaved(true); }
  function updateTab(value: string) { settingsDraftState.tab = value; setTab(value); }

  async function saveNutritionistCredential() {
    if (!user || !nutritionistName.trim() || !nutritionistCrn.trim()) {
      setCredentialError("Informe o nome completo e o número de registro CRN.");
      setCredentialMessage("");
      return;
    }
    setCredentialSaving(true);
    setCredentialError("");
    setCredentialMessage("");
    const { data: existing, error: lookupError } = await supabase.from("nutritionist_credentials").select("id").eq("profissional_id", user.id).order("updated_at", { ascending: false }).limit(1).maybeSingle();
    if (lookupError) {
      setCredentialError("Não foi possível verificar o cadastro existente.");
      setCredentialSaving(false);
      return;
    }
    const values = { full_name: nutritionistName.trim(), crn: nutritionistCrn.trim(), updated_at: new Date().toISOString() };
    const result = existing
      ? await supabase.from("nutritionist_credentials").update(values).eq("id", existing.id)
      : await supabase.from("nutritionist_credentials").insert({ ...values, profissional_id: user.id });
    setCredentialSaving(false);
    if (result.error) {
      setCredentialError("Não foi possível salvar o cadastro da nutricionista. Confira suas permissões e tente novamente.");
      return;
    }
    await settingsDraft.clear();
    setCredentialMessage("Nome e CRN salvos. O cadastro ainda precisa estar verificado para permitir a aprovação de propostas.");
  }

  return <AdminLayout><PageIntro eyebrow="Preferências" title="Configurações" description="Personalize as informações e preferências do seu ambiente administrativo." /><AdminNotice /><Tabs value={tab} onValueChange={updateTab} className="mt-6"><TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto bg-transparent p-0"><TabsTrigger value="perfil" className="gap-2 rounded-lg bg-white px-4 py-2.5 data-[state=active]:bg-[#e3f3ef] data-[state=active]:text-[#216d64]"><UserRound className="size-4" /> Perfil</TabsTrigger><TabsTrigger value="nutricionista" className="gap-2 rounded-lg bg-white px-4 py-2.5 data-[state=active]:bg-[#e3f3ef] data-[state=active]:text-[#216d64]"><Stethoscope className="size-4" /> Nutricionista</TabsTrigger><TabsTrigger value="espaco" className="gap-2 rounded-lg bg-white px-4 py-2.5 data-[state=active]:bg-[#e3f3ef] data-[state=active]:text-[#216d64]"><Building2 className="size-4" /> Espaço</TabsTrigger><TabsTrigger value="notificacoes" className="gap-2 rounded-lg bg-white px-4 py-2.5 data-[state=active]:bg-[#e3f3ef] data-[state=active]:text-[#216d64]"><BellRing className="size-4" /> Notificações</TabsTrigger></TabsList><TabsContent value="perfil"><SettingsCard title="Informações do profissional" description="Dados exibidos apenas no ambiente administrativo."><div className="grid gap-5 sm:grid-cols-2"><div className="grid gap-2"><Label htmlFor="full-name">Nome completo</Label><Input id="full-name" defaultValue="Dr. Frederick Parreira" className="border-slate-200 bg-white" /></div><div className="grid gap-2"><Label htmlFor="professional-email">E-mail profissional</Label><Input id="professional-email" type="email" defaultValue="profissional@exemplo.com" className="border-slate-200 bg-white" /></div><div className="grid gap-2"><Label htmlFor="crp">Registro profissional</Label><Input id="crp" defaultValue="CRP 04/86194" className="border-slate-200 bg-white" /></div><div className="grid gap-2"><Label htmlFor="phone">Telefone</Label><Input id="phone" defaultValue="(32) 9 0000-0000" className="border-slate-200 bg-white" /></div></div><SaveButton saved={saved} onSave={updateSaved} /></SettingsCard><Card className="mt-4 border-[#cce7df] bg-[#eff9f6] shadow-none"><CardContent className="flex items-start gap-3 p-5"><ShieldCheck className="mt-0.5 size-5 text-[#2f8f82]" /><div><p className="text-sm font-semibold text-[#286a60]">Conta protegida</p><p className="mt-1 text-sm leading-6 text-[#39766e]">A sessão atual usa autenticação e controle de acesso para proteger as operações do ambiente.</p></div></CardContent></Card></TabsContent><TabsContent value="nutricionista"><SettingsCard title="Cadastro da nutricionista" description="Informe o nome e o registro profissional que serão associados à aprovação dos planejamentos alimentares."><div className="grid gap-5 sm:grid-cols-2"><div className="grid gap-2"><Label htmlFor="nutritionist-name">Nome completo da nutricionista</Label><Input id="nutritionist-name" value={nutritionistName} onChange={(event) => setNutritionistName(event.target.value)} placeholder="Nome completo" disabled={credentialLoading || credentialSaving} /></div><div className="grid gap-2"><Label htmlFor="nutritionist-crn">Registro CRN</Label><Input id="nutritionist-crn" value={nutritionistCrn} onChange={(event) => setNutritionistCrn(event.target.value)} placeholder="Ex.: CRN- X/00000" disabled={credentialLoading || credentialSaving} /></div></div><div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Salvar o nome e o CRN cadastra os dados de identificação; isso não confirma a autenticidade do registro. A aprovação e o PDF final sem rascunho exigem que a credencial esteja verificada.</div>{credentialError && <p role="alert" className="mt-3 text-sm text-red-700">{credentialError}</p>}{credentialMessage && <p role="status" className="mt-3 text-sm text-emerald-800">{credentialMessage}</p>}<div className="mt-6"><Button type="button" onClick={() => void saveNutritionistCredential()} disabled={credentialLoading || credentialSaving || !user} className="bg-[#2f8f82] text-white hover:bg-[#26796e]">{credentialSaving ? "Salvando..." : "Salvar dados da nutricionista"}</Button></div></SettingsCard></TabsContent><TabsContent value="espaco"><SettingsCard title="Dados do espaço" description="Informações do seu espaço administrativo."><div className="grid gap-5"><div className="grid gap-2"><Label htmlFor="space-name">Nome do espaço</Label><Input id="space-name" defaultValue="Espaço de Saúde Integrativa" className="border-slate-200 bg-white" /></div><div className="grid gap-2"><Label htmlFor="address">Endereço resumido</Label><Input id="address" defaultValue="Centro — Juiz de Fora/MG" className="border-slate-200 bg-white" /></div></div><SaveButton saved={saved} onSave={updateSaved} /></SettingsCard></TabsContent><TabsContent value="notificacoes"><SettingsCard title="Preferências de notificação" description="Escolha quais avisos deseja receber."><div className="divide-y divide-slate-100"><Preference title="Lembretes de atendimento" description="Receba um aviso antes dos próximos atendimentos." defaultChecked /><Preference title="Resumo semanal" description="Receba um resumo dos indicadores do espaço." defaultChecked /><Preference title="Novos cadastros" description="Receba um aviso sobre novos pacientes cadastrados." /></div><SaveButton saved={saved} onSave={updateSaved} /></SettingsCard></TabsContent></Tabs></AdminLayout>;
}

function SettingsCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) { return <Card className="border-slate-200/80 shadow-sm"><CardHeader><CardTitle className="font-display text-base text-slate-800">{title}</CardTitle><p className="text-sm text-slate-500">{description}</p></CardHeader><CardContent>{children}</CardContent></Card>; }
function SaveButton({ saved, onSave }: { saved: boolean; onSave: () => void }) { return <div className="mt-6 flex items-center gap-3"><Button type="button" onClick={onSave} className="bg-[#2f8f82] text-white hover:bg-[#26796e]">Salvar alterações</Button>{saved && <span className="inline-flex items-center gap-1.5 text-xs text-[#28786e]"><Check className="size-3.5" /> Alterações salvas nesta sessão</span>}</div>; }
function Preference({ title, description, defaultChecked }: { title: string; description: string; defaultChecked?: boolean }) { return <div className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"><div><p className="text-sm font-medium text-slate-700">{title}</p><p className="mt-1 text-xs leading-5 text-slate-500">{description}</p></div><Switch defaultChecked={defaultChecked ?? false} aria-label={title} /></div>; }
