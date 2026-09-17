import { createFileRoute } from "@tanstack/react-router";
import { BarChart3, CalendarDays, Clock3, Globe2, Loader2, MousePointerClick, RefreshCw, Smartphone, UsersRound } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { AdminLayout, EmptyState, PageIntro, SectionCard } from "@/components/admin/admin-ui";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fetchAnalyticsEvents, type AnalyticsEventRecord } from "@/lib/admin/records";

export const Route = createFileRoute("/admin/estatisticas")({ component: StatisticsPage });

type Preset = "today" | "7" | "30" | "90" | "year" | "custom";
type DateRange = { start: Date; end: Date };
type BreakdownItem = { label: string; value: number };

const eventLabels: Record<AnalyticsEventRecord["event_type"], string> = {
  page_view: "Visitas",
  whatsapp_click: "Cliques no WhatsApp",
  appointment_click: "Cliques em agendamento",
  contact_form_submitted: "Formulários enviados",
};

function startOfDay(date: Date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function endOfDay(date: Date) {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
}

function localDateValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function rangeForPreset(preset: Preset, customFrom: string, customTo: string): DateRange {
  const now = new Date();
  if (preset === "today") return { start: startOfDay(now), end: endOfDay(now) };
  if (preset === "year") return { start: new Date(now.getFullYear(), 0, 1), end: endOfDay(now) };
  if (preset === "custom") {
    const from = customFrom ? new Date(`${customFrom}T00:00:00`) : startOfDay(now);
    const to = customTo ? new Date(`${customTo}T23:59:59.999`) : endOfDay(now);
    return from <= to ? { start: from, end: to } : { start: to, end: from };
  }
  const days = Number(preset);
  const start = startOfDay(now);
  start.setDate(start.getDate() - (days - 1));
  return { start, end: endOfDay(now) };
}

function isInRange(event: AnalyticsEventRecord, range: DateRange) {
  const date = new Date(event.occurred_at);
  return date >= range.start && date <= range.end;
}

function breakdown(values: string[], limit = 8): BreakdownItem[] {
  const counts = new Map<string, number>();
  values.forEach((value) => counts.set(value || "Não identificado", (counts.get(value || "Não identificado") ?? 0) + 1));
  return Array.from(counts, ([label, value]) => ({ label, value })).sort((first, second) => second.value - first.value).slice(0, limit);
}

function displayDevice(device: string | null) {
  if (device === "mobile") return "Celular";
  if (device === "tablet") return "Tablet";
  if (device === "desktop") return "Desktop";
  return "Não identificado";
}

function displayBrowser(browser: string | null) {
  return browser || "Não identificado";
}

function displayOrigin(origin: string | null) {
  if (!origin) return "Direto";
  try {
    const hostname = new URL(origin).hostname.replace(/^www\\./, "");
    if (hostname.includes("google")) return "Google";
    if (hostname.includes("instagram")) return "Instagram";
    if (hostname.includes("facebook") || hostname.includes("fb")) return "Facebook";
    if (hostname.includes("whatsapp") || hostname.includes("wa.me")) return "WhatsApp";
    return hostname || "Não identificado";
  } catch {
    return "Não identificado";
  }
}

function formatDate(date: Date) {
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }).replace(".", "");
}

function buildSeries(events: AnalyticsEventRecord[], range: DateRange) {
  const days = Math.max(1, Math.ceil((range.end.getTime() - range.start.getTime()) / 86400000));
  const monthly = days > 120;
  const buckets = new Map<string, { label: string; value: number }>();
  const cursor = new Date(range.start);
  cursor.setHours(0, 0, 0, 0);
  while (cursor <= range.end) {
    const key = monthly ? `${cursor.getFullYear()}-${cursor.getMonth()}` : localDateValue(cursor);
    buckets.set(key, { label: monthly ? cursor.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "") : formatDate(cursor), value: 0 });
    if (monthly) cursor.setMonth(cursor.getMonth() + 1);
    else cursor.setDate(cursor.getDate() + 1);
  }
  events.filter((event) => event.event_type === "page_view").forEach((event) => {
    const date = new Date(event.occurred_at);
    const key = monthly ? `${date.getFullYear()}-${date.getMonth()}` : localDateValue(date);
    const bucket = buckets.get(key);
    if (bucket) bucket.value += 1;
  });
  return Array.from(buckets.values());
}

function StatisticsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [events, setEvents] = useState<AnalyticsEventRecord[]>([]);
  const [preset, setPreset] = useState<Preset>("30");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const requestIdRef = useRef(0);

  const refreshEvents = useCallback(async () => {
    if (authLoading || !user?.id) return;
    const requestId = ++requestIdRef.current;
    setRefreshing(true);
    setError("");
    try {
      const result = await fetchAnalyticsEvents();
      if (requestId !== requestIdRef.current) return;
      if (result.error) {
        setError(result.error.message);
        return;
      }
      setEvents((result.data as AnalyticsEventRecord[] | null) ?? []);
    } catch (queryError: unknown) {
      if (requestId !== requestIdRef.current) return;
      setError(queryError instanceof Error ? queryError.message : "Não foi possível carregar as estatísticas.");
    } finally {
      if (requestId !== requestIdRef.current) return;
      setLoading(false);
      setRefreshing(false);
    }
  }, [authLoading, user?.id]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      requestIdRef.current += 1;
      setEvents([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    void refreshEvents();
    const intervalId = window.setInterval(() => void refreshEvents(), 30_000);
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") void refreshEvents();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      requestIdRef.current += 1;
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [authLoading, refreshEvents, user?.id]);

  const range = useMemo(() => rangeForPreset(preset, customFrom, customTo), [customFrom, customTo, preset]);
  const filteredEvents = useMemo(() => events.filter((event) => isInRange(event, range)), [events, range]);
  const pageViews = useMemo(() => filteredEvents.filter((event) => event.event_type === "page_view"), [filteredEvents]);
  const uniqueVisitors = useMemo(() => new Set(pageViews.map((event) => event.visitor_id)).size, [pageViews]);
  const today = useMemo(() => startOfDay(new Date()), []);
  const visitsToday = useMemo(() => events.filter((event) => event.event_type === "page_view" && isInRange(event, { start: today, end: endOfDay(today) })).length, [events, today]);
  const visitsForDays = (days: number) => {
    const end = new Date();
    const start = startOfDay(end);
    start.setDate(start.getDate() - (days - 1));
    return events.filter((event) => event.event_type === "page_view" && isInRange(event, { start, end: endOfDay(end) })).length;
  };
  const visits7 = useMemo(() => visitsForDays(7), [events]);
  const visits30 = useMemo(() => visitsForDays(30), [events]);
  const series = useMemo(() => buildSeries(filteredEvents, range), [filteredEvents, range]);
  const maxSeries = Math.max(...series.map((item) => item.value), 0);
  const eventCounts = useMemo(() => new Map(filteredEvents.map((event) => [event.event_type, filteredEvents.filter((item) => item.event_type === event.event_type).length])), [filteredEvents]);
  const whatsappClicks = eventCounts.get("whatsapp_click") ?? 0;
  const appointmentClicks = eventCounts.get("appointment_click") ?? 0;
  const formsSubmitted = eventCounts.get("contact_form_submitted") ?? 0;
  const conversionRate = pageViews.length === 0 ? 0 : ((appointmentClicks + formsSubmitted) / pageViews.length) * 100;

  const origins = useMemo(() => breakdown(pageViews.map((event) => displayOrigin(event.referrer_origin))), [pageViews]);
  const pages = useMemo(() => breakdown(pageViews.map((event) => event.page_path)), [pageViews]);
  const devices = useMemo(() => breakdown(pageViews.map((event) => displayDevice(event.device_type))), [pageViews]);
  const browsers = useMemo(() => breakdown(pageViews.map((event) => displayBrowser(event.browser))), [pageViews]);
  const hours = useMemo(() => Array.from({ length: 24 }, (_, hour) => ({ label: `${String(hour).padStart(2, "0")}h`, value: pageViews.filter((event) => new Date(event.occurred_at).getHours() === hour).length })), [pageViews]);
  const weekdays = useMemo(() => {
    const names = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    return names.map((label, day) => ({ label, value: pageViews.filter((event) => new Date(event.occurred_at).getDay() === day).length }));
  }, [pageViews]);
  const cities = useMemo(() => breakdown(pageViews.map((event) => event.city ?? "Não identificado")), [pageViews]);
  const states = useMemo(() => breakdown(pageViews.map((event) => event.state ?? "Não identificado")), [pageViews]);
  const countries = useMemo(() => breakdown(pageViews.map((event) => event.country ?? "Não identificado")), [pageViews]);

  return <AdminLayout>
    <PageIntro eyebrow="Audiência do site" title="Estatísticas" description="Acompanhe o comportamento anônimo dos visitantes e a origem dos acessos." action={<Button type="button" variant="outline" onClick={() => void refreshEvents()} disabled={authLoading || !user || refreshing} className="gap-2 border-slate-200 bg-white"><RefreshCw className={refreshing ? "size-4 animate-spin" : "size-4"} /> Atualizar</Button>} />
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-end sm:justify-between">
      <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-end">
        <label className="grid gap-2 text-xs font-medium text-slate-600">Período<Select value={preset} onValueChange={(value) => setPreset(value as Preset)}><SelectTrigger className="w-full border-slate-200 bg-white sm:w-48"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="today">Hoje</SelectItem><SelectItem value="7">Últimos 7 dias</SelectItem><SelectItem value="30">Últimos 30 dias</SelectItem><SelectItem value="90">Últimos 90 dias</SelectItem><SelectItem value="year">Este ano</SelectItem><SelectItem value="custom">Personalizado</SelectItem></SelectContent></Select></label>
        {preset === "custom" && <div className="flex flex-col gap-3 sm:flex-row"><label className="grid gap-2 text-xs font-medium text-slate-600">De<Input type="date" value={customFrom} onChange={(event) => setCustomFrom(event.target.value)} className="border-slate-200" /></label><label className="grid gap-2 text-xs font-medium text-slate-600">Até<Input type="date" value={customTo} onChange={(event) => setCustomTo(event.target.value)} className="border-slate-200" /></label></div>}
      </div>
      <p className="text-xs text-slate-400">{range.start.toLocaleDateString("pt-BR")} a {range.end.toLocaleDateString("pt-BR")}</p>
    </div>
    {error && <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">Não foi possível carregar as estatísticas: {error}</p>}
    {loading || authLoading ? <div className="mt-6 flex min-h-64 items-center justify-center rounded-xl border border-slate-200 bg-white text-sm text-slate-500"><Loader2 className="mr-2 size-4 animate-spin" /> Carregando estatísticas...</div> : <>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard icon={<CalendarDays className="size-5" />} label="Visitas hoje" value={visitsToday} note="páginas visualizadas" />
        <MetricCard icon={<UsersRound className="size-5" />} label="Visitantes únicos" value={uniqueVisitors} note="no período selecionado" />
        <MetricCard icon={<BarChart3 className="size-5" />} label="Visitas em 7 dias" value={visits7} note="janela móvel" />
        <MetricCard icon={<BarChart3 className="size-5" />} label="Visitas em 30 dias" value={visits30} note="janela móvel" />
        <MetricCard icon={<MousePointerClick className="size-5" />} label="Conversão" value={`${conversionRate.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`} note="agendamentos + formulários / visitas" />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_.65fr]">
        <SectionCard title="Acessos por período" action={<span className="text-xs text-slate-400">Visitas de páginas</span>}>
          {pageViews.length === 0 ? <EmptyState title="Nenhum acesso no período" description="Quando houver visitas, elas aparecerão neste gráfico." /> : <div className="overflow-x-auto"><div className="flex h-64 min-w-[620px] items-end gap-2 border-b border-l border-slate-100 px-3 pt-5">{series.map((item) => <div key={item.label} className="flex h-full min-w-5 flex-1 flex-col items-center justify-end gap-2"><div className="w-full max-w-10 rounded-t-md bg-[#72c7b5] transition-colors hover:bg-[#2f8f82]" style={{ height: `${item.value ? Math.max((item.value / maxSeries) * 88, 4) : 0}%` }} title={`${item.label}: ${item.value}`} /><span className="whitespace-nowrap text-[10px] text-slate-400">{item.label}</span></div>)}</div></div>}
        </SectionCard>
        <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-1"><MetricCard icon={<MousePointerClick className="size-5" />} label="Cliques no WhatsApp" value={whatsappClicks} note={eventLabels.whatsapp_click} /><MetricCard icon={<CalendarDays className="size-5" />} label="Cliques em agendamento" value={appointmentClicks} note={eventLabels.appointment_click} /><MetricCard icon={<UsersRound className="size-5" />} label="Formulários enviados" value={formsSubmitted} note={eventLabels.contact_form_submitted} /></div>
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <BreakdownCard title="Origem" icon={<Globe2 className="size-4" />} items={origins} />
        <BreakdownCard title="Páginas mais acessadas" icon={<BarChart3 className="size-4" />} items={pages} />
        <BreakdownCard title="Dispositivos" icon={<Smartphone className="size-4" />} items={devices} />
        <BreakdownCard title="Navegadores" icon={<Globe2 className="size-4" />} items={browsers} />
        <BreakdownCard title="Horários" icon={<Clock3 className="size-4" />} items={hours} />
        <BreakdownCard title="Dias da semana" icon={<CalendarDays className="size-4" />} items={weekdays} />
        <BreakdownCard title="Cidades" icon={<Globe2 className="size-4" />} items={cities} />
        <BreakdownCard title="Estados" icon={<Globe2 className="size-4" />} items={states} />
        <BreakdownCard title="Países" icon={<Globe2 className="size-4" />} items={countries} />
      </div>
    </>}
  </AdminLayout>;
}

function MetricCard({ icon, label, value, note }: { icon: React.ReactNode; label: string; value: number | string; note: string }) {
  return <Card className="border-slate-200/80 shadow-sm"><CardContent className="flex items-start gap-3 p-5"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#e3f3ef] text-[#2f8f82]">{icon}</span><div className="min-w-0"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 truncate font-display text-2xl font-semibold text-slate-800">{value}</p><p className="mt-1 text-[11px] text-slate-400">{note}</p></div></CardContent></Card>;
}

function BreakdownCard({ title, icon, items }: { title: string; icon: React.ReactNode; items: BreakdownItem[] }) {
  const max = Math.max(...items.map((item) => item.value), 0);
  return <SectionCard title={title} action={<span className="text-[#2f8f82]">{icon}</span>}>
    {items.length === 0 || max === 0 ? <EmptyState title={`Sem dados de ${title.toLowerCase()}`} description="Não identificado" /> : <div className="space-y-3">{items.map((item) => <div key={item.label}><div className="flex items-center justify-between gap-3 text-xs"><span className="min-w-0 truncate text-slate-600">{item.label}</span><strong className="shrink-0 text-slate-700">{item.value}</strong></div><div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#72c7b5]" style={{ width: `${Math.max((item.value / max) * 100, 3)}%` }} /></div></div>)}</div>}
  </SectionCard>;
}
