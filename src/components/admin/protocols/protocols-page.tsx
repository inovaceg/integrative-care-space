import { useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, FileDown, FileUp, Loader2, Printer, Search } from "lucide-react";
import { AdminLayout, PageIntro } from "@/components/admin/admin-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ProtocolCard } from "./protocol-card";
import { importProtocolWord, normalizeProtocolSearch, protocolStorageKey, type ProtocolLibrary } from "@/lib/admin/protocols";
import { downloadProtocolsPdf, printProtocols } from "@/lib/admin/protocols-report";

export default function ProtocolsPage() {
  const [library, setLibrary] = useState<ProtocolLibrary>({ source: "", protocols: [] });
  const [query, setQuery] = useState("");
  const [indexValue, setIndexValue] = useState("");
  const [viewRestored, setViewRestored] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setQuery(sessionStorage.getItem("admin:protocols:query") ?? "");
    setIndexValue(sessionStorage.getItem("admin:protocols:index") ?? "");
    setViewRestored(true);
  }, []);

  useEffect(() => {
    if (!viewRestored) return;
    sessionStorage.setItem("admin:protocols:query", query);
    sessionStorage.setItem("admin:protocols:index", indexValue);
  }, [query, indexValue, viewRestored]);

  function saveLibrary(result: ProtocolLibrary) {
    setLibrary(result);
    try {
      localStorage.setItem(protocolStorageKey, JSON.stringify(result));
    } catch {
      setNotice("A biblioteca está disponível nesta sessão, mas o navegador não permitiu salvá-la. Você poderá importar o Word novamente ao retornar.");
    }
  }

  useEffect(() => {
    let active = true;
    try {
      const saved = localStorage.getItem(protocolStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as ProtocolLibrary;
        if (Array.isArray(parsed.protocols) && parsed.protocols.length > 0) {
          setLibrary(parsed);
          setLoading(false);
          return;
        }
      }
    } catch {
      // Reimport the source Word when a saved library cannot be read.
    }
    fetch("/protocolos-dr-frederick-martins.docx")
      .then(response => {
        if (!response.ok) throw new Error("Não foi possível carregar o documento Word inicial.");
        return response.blob();
      })
      .then(file => importProtocolWord(file, "Protocolos_Dr_Frederick_Martins.docx"))
      .then(result => { if (active) saveLibrary(result); })
      .catch(cause => { if (active) setError(cause instanceof Error ? cause.message : "Não foi possível importar o Word. Tente selecionar o arquivo novamente."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const filtered = useMemo(() => {
    const term = normalizeProtocolSearch(query);
    return library.protocols.map((protocol, index) => ({ protocol, id: `protocolo-${index}` }))
      .filter(({ protocol }) => !term || normalizeProtocolSearch([
        protocol.number, protocol.category, protocol.title,
        ...protocol.fields.flatMap(field => [field.label, field.value]),
      ].join(" ")).includes(term));
  }, [library, query]);

  async function importFile(file?: File) {
    if (!file) return;
    setError("");
    setNotice("");
    if (!file.name.toLowerCase().endsWith(".docx")) {
      setError("Selecione um documento Word no formato .docx.");
      return;
    }
    setLoading(true);
    try {
      const imported = await importProtocolWord(file, file.name);
      saveLibrary(imported);
      setQuery("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível importar esse documento Word.");
    } finally {
      setLoading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return <AdminLayout>
    <PageIntro eyebrow="Biblioteca clínica" title="Protocolos" description="Cada protocolo organizado com fórmula, via, técnica e demais informações do documento original." action={<>
      <input ref={fileRef} type="file" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="hidden" onChange={event => void importFile(event.target.files?.[0])} />
      <div className="flex flex-wrap gap-2">
        <Button disabled={loading || filtered.length === 0} variant="outline" onClick={() => printProtocols(filtered.map(item => item.protocol))}><Printer className="mr-2 size-4" />Imprimir</Button>
        <Button disabled={loading || filtered.length === 0} variant="outline" onClick={() => downloadProtocolsPdf(filtered.map(item => item.protocol))}><FileDown className="mr-2 size-4" />Gerar PDF</Button>
        <Button disabled={loading} onClick={() => fileRef.current?.click()} className="bg-[#2f8f82] text-white hover:bg-[#26796e]"><FileUp className="mr-2 size-4" />Importar Word</Button>
      </div>
    </>} />
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5" aria-label="Localizar protocolos">
        <label htmlFor="protocol-search" className="mb-2 block text-sm font-semibold text-[#102e4e]">Localizar protocolo</label>
        <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><Input id="protocol-search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Número, nome, indicação ou componente da fórmula" className="h-11 bg-white pl-9" /></div>
        {!loading && <p className="mt-3 text-xs text-slate-500" role="status">{filtered.length} de {library.protocols.length} protocolos{library.source && ` · ${library.source}`}</p>}
      </section>
      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
      {notice && <p role="status" className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">{notice}</p>}
      {loading && <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-500"><Loader2 className="size-5 animate-spin" />Organizando os cards a partir das tabelas do Word…</div>}
      {viewRestored && filtered.length > 0 && <Accordion type="single" collapsible value={indexValue} onValueChange={setIndexValue} className="rounded-xl border border-slate-200 bg-white px-5 shadow-sm">
        <AccordionItem value="index" className="border-0">
          <AccordionTrigger className="font-semibold text-[#102e4e]"><span className="flex items-center gap-2"><BookOpen className="size-4 text-[#b18b45]" />Índice dos protocolos</span></AccordionTrigger>
          <AccordionContent><ol className="grid gap-2 sm:grid-cols-2">{filtered.map(({ protocol, id }) => <li key={id}><a href={`#${id}`} className="flex gap-3 rounded-md px-2 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-[#102e4e]"><span className="font-bold tabular-nums text-[#b18b45]">{protocol.number}</span><span>{protocol.title}</span></a></li>)}</ol></AccordionContent>
        </AccordionItem>
      </Accordion>}
      <div className="space-y-7">
        {filtered.map(({ protocol, id }) => <ProtocolCard key={id} protocol={protocol} id={id} />)}
        {!loading && filtered.length === 0 && <div className="rounded-xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center"><BookOpen className="mx-auto mb-3 size-7 text-slate-400" /><p className="font-semibold text-slate-700">{query ? "Nenhum protocolo encontrado" : "Nenhum protocolo disponível"}</p><p className="mt-2 text-sm text-slate-500">{query ? "Tente outro número, nome ou componente da fórmula." : "Selecione o Word com as tabelas dos protocolos para importar."}</p></div>}
      </div>
    </div>
  </AdminLayout>;
}
