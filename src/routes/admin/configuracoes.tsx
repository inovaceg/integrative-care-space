import { createFileRoute } from "@tanstack/react-router";
import { BellRing, Building2, Check, ShieldCheck, UserRound } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminLayout, AdminNotice, PageIntro } from "@/components/admin/admin-ui";

export const Route = createFileRoute("/admin/configuracoes")({ component: SettingsPage });

function SettingsPage() {
  const [saved, setSaved] = useState(false);
  return <AdminLayout><PageIntro eyebrow="Preferências" title="Configurações" description="Personalize as informações e preferências do seu ambiente administrativo." /><AdminNotice /><Tabs defaultValue="perfil" className="mt-6"><TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto bg-transparent p-0"><TabsTrigger value="perfil" className="gap-2 rounded-lg bg-white px-4 py-2.5 data-[state=active]:bg-[#e3f3ef] data-[state=active]:text-[#216d64]"><UserRound className="size-4" /> Perfil</TabsTrigger><TabsTrigger value="espaco" className="gap-2 rounded-lg bg-white px-4 py-2.5 data-[state=active]:bg-[#e3f3ef] data-[state=active]:text-[#216d64]"><Building2 className="size-4" /> Espaço</TabsTrigger><TabsTrigger value="notificacoes" className="gap-2 rounded-lg bg-white px-4 py-2.5 data-[state=active]:bg-[#e3f3ef] data-[state=active]:text-[#216d64]"><BellRing className="size-4" /> Notificações</TabsTrigger></TabsList><TabsContent value="perfil"><SettingsCard title="Informações do profissional" description="Dados exibidos apenas no ambiente administrativo."><div className="grid gap-5 sm:grid-cols-2"><div className="grid gap-2"><Label htmlFor="full-name">Nome completo</Label><Input id="full-name" defaultValue="Dr. Frederick Parreira" className="border-slate-200 bg-white" /></div><div className="grid gap-2"><Label htmlFor="professional-email">E-mail profissional</Label><Input id="professional-email" type="email" defaultValue="profissional@exemplo.com" className="border-slate-200 bg-white" /></div><div className="grid gap-2"><Label htmlFor="crp">Registro profissional</Label><Input id="crp" defaultValue="CRP 04/86194" className="border-slate-200 bg-white" /></div><div className="grid gap-2"><Label htmlFor="phone">Telefone</Label><Input id="phone" defaultValue="(32) 9 0000-0000" className="border-slate-200 bg-white" /></div></div><SaveButton saved={saved} onSave={() => setSaved(true)} /></SettingsCard><Card className="mt-4 border-[#cce7df] bg-[#eff9f6] shadow-none"><CardContent className="flex items-start gap-3 p-5"><ShieldCheck className="mt-0.5 size-5 text-[#2f8f82]" /><div><p className="text-sm font-semibold text-[#286a60]">Autenticação futura</p><p className="mt-1 text-sm leading-6 text-[#39766e]">A integração de sessão e controle de acesso será definida quando a autenticação real for implementada. Esta interface não oferece proteção de conta.</p></div></CardContent></Card></TabsContent><TabsContent value="espaco"><SettingsCard title="Dados do espaço" description="Informações fictícias usadas apenas para compor a interface."><div className="grid gap-5"><div className="grid gap-2"><Label htmlFor="space-name">Nome do espaço</Label><Input id="space-name" defaultValue="Espaço de Saúde Integrativa" className="border-slate-200 bg-white" /></div><div className="grid gap-2"><Label htmlFor="address">Endereço resumido</Label><Input id="address" defaultValue="Centro — Juiz de Fora/MG" className="border-slate-200 bg-white" /></div></div><SaveButton saved={saved} onSave={() => setSaved(true)} /></SettingsCard></TabsContent><TabsContent value="notificacoes"><SettingsCard title="Preferências de notificação" description="Escolha quais avisos seriam exibidos quando houver uma sessão configurada."><div className="divide-y divide-slate-100"><Preference title="Lembretes de atendimento" description="Receberia um aviso antes dos próximos atendimentos." defaultChecked /><Preference title="Resumo semanal" description="Receberia um resumo dos indicadores do espaço." defaultChecked /><Preference title="Novos cadastros" description="Seria avisado sobre novos pacientes cadastrados." /></div><SaveButton saved={saved} onSave={() => setSaved(true)} /></SettingsCard></TabsContent></Tabs></AdminLayout>;
}

function SettingsCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return <Card className="border-slate-200/80 shadow-sm"><CardHeader><CardTitle className="font-display text-base text-slate-800">{title}</CardTitle><p className="text-sm text-slate-500">{description}</p></CardHeader><CardContent>{children}</CardContent></Card>;
}

function SaveButton({ saved, onSave }: { saved: boolean; onSave: () => void }) {
  return <div className="mt-6 flex items-center gap-3"><Button type="button" onClick={onSave} className="bg-[#2f8f82] text-white hover:bg-[#26796e]">Salvar alterações</Button>{saved && <span className="inline-flex items-center gap-1.5 text-xs text-[#28786e]"><Check className="size-3.5" /> Alterações apenas nesta demonstração</span>}</div>;
}

function Preference({ title, description, defaultChecked }: { title: string; description: string; defaultChecked?: boolean }) {
  return <div className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"><div><p className="text-sm font-medium text-slate-700">{title}</p><p className="mt-1 text-xs leading-5 text-slate-500">{description}</p></div><Switch defaultChecked={defaultChecked ?? false} aria-label={title} /></div>;
}
