import { createFileRoute } from "@tanstack/react-router";
import { ClipboardList, Edit3, MoreHorizontal, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminLayout, AdminNotice, PageIntro, SearchInput, StatusBadge } from "@/components/admin/admin-ui";
import { protocols } from "@/lib/admin/mocks";

export const Route = createFileRoute("/admin/protocolos")({ component: ProtocolsPage });

function ProtocolsPage() {
  const [search, setSearch] = useState("");
  const visibleProtocols = useMemo(() => protocols.filter((protocol) => `${protocol.name} ${protocol.area}`.toLowerCase().includes(search.toLowerCase())), [search]);
  return <AdminLayout><PageIntro eyebrow="Método de trabalho" title="Protocolos" description="Roteiros organizados para apoiar a consistência de cada atendimento." action={<Button className="gap-2 bg-[#2f8f82] text-white hover:bg-[#26796e]"><Plus className="size-4" /> Novo protocolo</Button>} /><AdminNotice /><div className="mt-6"><Tabs defaultValue="todos"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><TabsList className="w-fit"><TabsTrigger value="todos">Todos <span className="ml-1 text-xs text-slate-400">{protocols.length}</span></TabsTrigger><TabsTrigger value="ativos">Ativos</TabsTrigger><TabsTrigger value="rascunhos">Rascunhos</TabsTrigger></TabsList><div className="w-full sm:w-72"><SearchInput value={search} onChange={setSearch} placeholder="Buscar protocolo" /></div></div><TabsContent value="todos"><ProtocolGrid items={visibleProtocols} /></TabsContent><TabsContent value="ativos"><ProtocolGrid items={visibleProtocols.filter((item) => item.status === "Ativo")} /></TabsContent><TabsContent value="rascunhos"><ProtocolGrid items={visibleProtocols.filter((item) => item.status === "Rascunho")} /></TabsContent></Tabs></div></AdminLayout>;
}

function ProtocolGrid({ items }: { items: typeof protocols }) {
  return <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{items.map((protocol) => <Card key={protocol.id} className="border-slate-200/80 shadow-sm transition-shadow hover:shadow-md"><CardContent className="p-5"><div className="flex items-start justify-between gap-3"><div className="grid size-10 place-items-center rounded-lg bg-[#e3f3ef] text-[#2f8f82]"><ClipboardList className="size-5" /></div><div className="flex items-center gap-2"><StatusBadge status={protocol.status} /><button type="button" aria-label={`Mais opções para ${protocol.name}`} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100"><MoreHorizontal className="size-4" /></button></div></div><h3 className="mt-5 font-display font-semibold text-slate-800">{protocol.name}</h3><p className="mt-2 min-h-12 text-sm leading-5 text-slate-500">{protocol.description}</p><div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-xs text-slate-400"><span>{protocol.area} · {protocol.steps} etapas</span><span>{protocol.updatedAt}</span></div><Button variant="outline" className="mt-4 w-full gap-2 border-slate-200 text-slate-600"><Edit3 className="size-3.5" /> Visualizar estrutura</Button></CardContent></Card>)}{items.length === 0 && <p className="col-span-full rounded-xl border border-dashed border-slate-200 p-10 text-center text-sm text-slate-500">Nenhum protocolo encontrado.</p>}</div>;
}
