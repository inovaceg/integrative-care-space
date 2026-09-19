import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Activity,
  BarChart3,
  Bell,
  CalendarDays,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  FileBarChart,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Pill,
  Search,
  Settings,
  Stethoscope,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth/auth-provider";
import type { AppointmentStatus } from "@/lib/admin/types";

const navigation = [
  { label: "Visão geral", to: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Agenda", to: "/admin/agenda", icon: CalendarDays },
  { label: "Pacientes", to: "/admin/pacientes", icon: UsersRound },
  { label: "Evolução do Paciente", to: "/admin/evolucao-corporal", icon: Activity },
  { label: "Receituário", to: "/admin/receituario", icon: FileText },
  { label: "Controle de medicamentos", to: "/admin/medicamentos", icon: Pill },
  { label: "Financeiro", to: "/admin/financeiro", icon: CircleDollarSign },
  { label: "Relatórios", to: "/admin/relatorios", icon: FileBarChart },
  { label: "Estatísticas", to: "/admin/estatisticas", icon: BarChart3 },
  { label: "Configurações", to: "/admin/configuracoes", icon: Settings },
] as const;

const pageTitles: Record<string, { title: string; description: string }> = {
  "/admin/dashboard": { title: "Visão geral", description: "Acompanhe os principais indicadores do seu espaço." },
  "/admin/agenda": { title: "Agenda", description: "Organize seus atendimentos e compromissos." },
  "/admin/pacientes": { title: "Pacientes", description: "Acompanhe sua base de pacientes com privacidade." },
  "/admin/evolucao-corporal": { title: "Evolução do Paciente", description: "Avaliações corporais, histórico e progresso clínico." },
  "/admin/receituario": { title: "Receituário", description: "Criação e gerenciamento de documentos profissionais." },
  "/admin/medicamentos": { title: "Controle de medicamentos", description: "Acompanhe o estoque e o histórico de movimentações." },
  "/admin/financeiro": { title: "Financeiro", description: "Tenha clareza sobre receitas e despesas." },
  "/admin/relatorios": { title: "Relatórios", description: "Insights para acompanhar a evolução do espaço." },
  "/admin/estatisticas": { title: "Estatísticas", description: "Entenda como as pessoas encontram e usam o site." },
  "/admin/configuracoes": { title: "Configurações", description: "Ajuste as preferências do ambiente administrativo." },
};

export function AdminSidebar({ collapsed, mobileOpen, onClose, onToggle }: { collapsed: boolean; mobileOpen: boolean; onClose: () => void; onToggle: () => void }) {
  return (
    <>
      {mobileOpen && <button type="button" aria-label="Fechar menu" onClick={onClose} className="fixed inset-0 z-40 bg-slate-950/30 lg:hidden" />}
      <aside className={cn("fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-slate-200 bg-[#123c3d] text-white shadow-xl transition-transform duration-200 lg:static lg:z-auto lg:translate-x-0 lg:shadow-none", collapsed && "lg:w-[84px]", mobileOpen ? "translate-x-0" : "-translate-x-full")}>
        <div className="flex h-20 items-center justify-between border-b border-white/10 px-5">
          <Link to="/admin/dashboard" className={cn("flex min-w-0 items-center gap-3", collapsed && "lg:justify-center") } onClick={onClose} aria-label="Ir para visão geral">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#72c7b5] font-display text-xl font-semibold text-[#123c3d]">Ψ</span>
            <span className={cn("min-w-0", collapsed && "lg:hidden")}><strong className="block truncate font-display text-sm">Dr. Frederick</strong><span className="block truncate text-[10px] uppercase tracking-[0.14em] text-white/60">Painel administrativo</span></span>
          </Link>
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 lg:hidden" onClick={onClose} aria-label="Fechar menu"><X className="size-5" /></Button>
        </div>
        <div className={cn("px-4 pt-7", collapsed && "lg:px-3")}>
          <p className={cn("px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45", collapsed && "lg:hidden")}>Menu principal</p>
          <nav className="mt-3 space-y-1" aria-label="Navegação administrativa">
            {navigation.map(({ label, to, icon: Icon }) => <Link key={to} to={to} onClick={onClose} activeProps={{ className: "bg-[#2f7773] text-white shadow-sm" }} className={cn("group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white", collapsed && "lg:justify-center lg:px-2")} title={collapsed ? label : undefined}><Icon className="size-[18px] shrink-0" /><span className={cn(collapsed && "lg:hidden")}>{label}</span><ChevronRight className={cn("ml-auto size-4 opacity-0 transition-opacity group-hover:opacity-70", collapsed && "lg:hidden")} /></Link>)}
          </nav>
        </div>
        <div className="mt-auto p-4">
          <div className={cn("rounded-xl border border-white/10 bg-white/5 p-3", collapsed && "lg:hidden")}><div className="flex items-start gap-2"><Activity className="mt-0.5 size-4 text-[#8bd5c4]" /><div><p className="text-xs font-medium">Ambiente protegido</p><p className="mt-1 text-[11px] leading-4 text-white/55">Operações autorizadas ficam vinculadas à sua conta.</p></div></div></div>
          <button type="button" onClick={onToggle} className="mt-3 hidden w-full items-center justify-center gap-2 rounded-lg py-2 text-xs text-white/50 hover:bg-white/10 hover:text-white lg:flex" aria-label={collapsed ? "Expandir menu" : "Recolher menu"}>{collapsed ? <PanelLeftOpen className="size-4" /> : <><PanelLeftClose className="size-4" /> Recolher menu</>}</button>
        </div>
      </aside>
    </>
  );
}

export function AdminHeader({ onMenu }: { onMenu: () => void }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const current = pageTitles[pathname] ?? { title: "Painel administrativo", description: "Gerencie seu espaço de saúde com segurança." };
  const email = user?.email ?? "Usuário administrativo";
  const initials = email.slice(0, 2).toUpperCase();

  async function handleSignOut() {
    await signOut();
    void navigate({ to: "/", replace: true });
  }

  return <header className="flex min-h-20 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 sm:px-8"><div className="flex min-w-0 items-center gap-3"><Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenu} aria-label="Abrir menu"><Menu className="size-5" /></Button><div className="min-w-0"><h1 className="truncate font-display text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">{current.title}</h1><p className="hidden truncate text-xs text-slate-500 sm:block">{current.description}</p></div></div><div className="flex shrink-0 items-center gap-2 sm:gap-4"><span className="hidden text-right text-xs text-slate-500 md:block">{email}</span><button type="button" className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800" aria-label="Notificações"><Bell className="size-5" /><span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-[#2f8f82] ring-2 ring-white" /></button><div className="hidden h-8 w-px bg-slate-200 sm:block" /><Avatar className="size-9 border border-slate-200"><AvatarFallback className="bg-[#e1f2ee] text-xs font-semibold text-[#21655f]">{initials}</AvatarFallback></Avatar><span className="hidden text-sm font-medium text-slate-700 lg:block">{email}</span><Button type="button" variant="ghost" size="icon" onClick={handleSignOut} aria-label="Sair"><LogOut className="size-5" /></Button></div></header>;
}

export function AdminLayout({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  return <div className="min-h-screen bg-[#f4f7f7] text-slate-900"><div className="flex min-h-screen"><AdminSidebar collapsed={collapsed} mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} onToggle={() => setCollapsed((value) => !value)} /><div className="flex min-w-0 flex-1 flex-col"><AdminHeader onMenu={() => setMobileOpen(true)} /><main className="flex-1 px-4 py-6 sm:px-8 sm:py-8"><div className="mx-auto max-w-[1480px]">{children}</div></main></div></div></div>;
}

export function PageIntro({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description: string; action?: ReactNode }) {
  return <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#2f8f82]">{eyebrow && <><Stethoscope className="size-3.5" /> {eyebrow}</>}</div><h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">{title}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{description}</p></div>{action}</div>;
}

export function DashboardCard({ label, value, trend, note, tone }: { label: string; value: string; trend: string; note: string; tone: "teal" | "blue" | "amber" | "violet" }) {
  const colors = { teal: "bg-[#e3f4ef] text-[#25796d]", blue: "bg-[#e7effb] text-[#3d6eaa]", amber: "bg-[#fcf3df] text-[#ae7a1e]", violet: "bg-[#eeeafb] text-[#725ca9]" };
  return <Card className="border-slate-200/80 shadow-sm"><CardContent className="p-5"><div className="flex items-start justify-between gap-3"><p className="text-sm font-medium text-slate-500">{label}</p><span className={cn("rounded-md px-2 py-1 text-[11px] font-semibold", colors[tone])}>{trend}</span></div><p className="mt-4 font-display text-2xl font-semibold text-slate-900 sm:text-3xl">{value}</p><p className="mt-2 text-xs text-slate-400">{note}</p></CardContent></Card>;
}

export function StatusBadge({ status }: { status: AppointmentStatus | string }) {
  const labels: Record<string, string> = { pending: "Pendente", confirmed: "Confirmado", completed: "Concluído", cancelled: "Cancelado" };
  const styles: Record<string, string> = { Confirmado: "bg-[#e2f4ed] text-[#277767]", Pendente: "bg-[#fff4dc] text-[#a36c12]", Concluído: "bg-slate-100 text-slate-600", Cancelado: "bg-red-50 text-red-600", Ativo: "bg-[#e2f4ed] text-[#277767]", Rascunho: "bg-[#e7effb] text-[#3d6eaa]", Arquivado: "bg-slate-100 text-slate-500", Recebido: "bg-[#e2f4ed] text-[#277767]", Pago: "bg-slate-100 text-slate-600" };
  const label = labels[status] ?? status;
  return <Badge className={cn("border-0 font-medium", styles[label] ?? "bg-slate-100 text-slate-600")}>{label}</Badge>;
}

export function SearchInput({ value, onChange, placeholder = "Buscar..." }: { value: string; onChange: (value: string) => void; placeholder?: string }) {
  return <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><Input aria-label={placeholder} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="h-10 border-slate-200 bg-white pl-9 shadow-none" /></div>;
}

export function SectionCard({ title, action, children, className }: { title: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return <Card className={cn("border-slate-200/80 shadow-sm", className)}><CardHeader className="flex-row items-center justify-between space-y-0 border-b border-slate-100 px-5 py-4"><CardTitle className="font-display text-base text-slate-800">{title}</CardTitle>{action}</CardHeader><CardContent className="p-5">{children}</CardContent></Card>;
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <div className="rounded-xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center"><div className="mx-auto grid size-11 place-items-center rounded-full bg-[#e6f3f0] text-[#2f8f82]"><ClipboardList className="size-5" /></div><h3 className="mt-4 font-display font-semibold text-slate-800">{title}</h3><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">{description}</p>{action && <div className="mt-5">{action}</div>}</div>;
}

export function PatientAvatar({ initials, className }: { initials: string; className?: string }) {
  return <Avatar className={cn("size-9", className)}><AvatarFallback className="bg-[#e3f3ef] text-xs font-semibold text-[#28786e]">{initials}</AvatarFallback></Avatar>;
}

export function AdminNotice() {
  return <div className="flex items-start gap-3 rounded-xl border border-[#cce7df] bg-[#eff9f6] px-4 py-3 text-sm text-[#286a60]"><Activity className="mt-0.5 size-4 shrink-0" /><p><strong className="font-semibold">Operações protegidas:</strong> os dados são consultados e atualizados conforme as permissões da sua conta.</p></div>;
}

export function AdminBrandMark() {
  return <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-[#123c3d] font-display text-3xl text-[#8bd5c4] shadow-lg">Ψ</div>;
}

export function LoginInput({ id, label, type = "text", placeholder }: { id: string; label: string; type?: string; placeholder: string }) {
  return <div className="grid gap-2"><Label htmlFor={id} className="text-sm font-medium text-slate-700">{label}</Label><Input id={id} type={type} placeholder={placeholder} autoComplete="off" className="h-11 border-slate-200 bg-white" /></div>;
}

export const iconMap = { calendar: CalendarDays, users: UsersRound, money: CircleDollarSign };
export type AdminNavPath = (typeof navigation)[number]["to"];
