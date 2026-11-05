import { useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, FileUp, Search } from "lucide-react";
import * as mammoth from "mammoth";
import { AdminLayout, PageIntro } from "@/components/admin/admin-ui";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Protocol = { number: string; title: string; content: string[] };
type ProtocolLibrary = { index: string[]; protocols: Protocol[] };
const storageKey = "admin:protocol-library";

function parseProtocolDocument(raw: string): ProtocolLibrary {
  const lines = raw.split(/\r?\n/).map(line => line.replace(/\s+/g, " ").trim()).filter(Boolean);
  const protocols: Protocol[] = [];
  const index: string[] = [];
  const indexNumbers = new Set<string>();
  let current: Protocol | null = null;
  let bodyStarted = false;

  for (const line of lines) {
    const heading = line.match(/^(?:protocolo\s*)?(\d{1,3})[.)\-:]\s*(.+)$/i);
    if (heading) {
      const [, number, title] = heading;
      if (!bodyStarted && !/^protocolo\s*\d/i.test(line) && !indexNumbers.has(number)) {
        indexNumbers.add(number);
        index.push(`${number}. ${title}`);
        continue;
      }
      bodyStarted = true;
      current = { number, title, content: [] };
      protocols.push(current);
      continue;
    }
    if (/^(índice|sumário|conteúdo)$/i.test(line)) continue;
    if (!bodyStarted && /^protocolo\s*\d/i.test(line)) bodyStarted = true;
    if (current) current.content.push(line);
    else if (!bodyStarted) index.push(line);
  }
  return { index, protocols };
}

async function readDocx(file: Blob): Promise<ProtocolLibrary> {
  const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
  return parseProtocolDocument(result.value);
}

export default function ProtocolsPage() {
  const [library, setLibrary] = useState<ProtocolLibrary>({ index: [], protocols: [] });
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      setLibrary(JSON.parse(saved) as ProtocolLibrary);
      setLoading(false);
      return;
    }
    fetch("/protocolos-dr-frederick-martins.docx")
      .then(response => {
        if (!response.ok) throw new Error("Não foi possível carregar o arquivo inicial de protocolos.");
        return response.blob();
      })
      .then(readDocx)
      .then(result => {
        if (!active) return;
        setLibrary(result);
        localStorage.setItem(storageKey, JSON.stringify(result));
      })
      .catch(() => { if (active) setError("Não foi possível importar o Word inicial. Você pode selecionar o arquivo novamente."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase("pt-BR");
    if (!term) return library.protocols;
    return library.protocols.filter(protocol => `${protocol.number} ${protocol.title} ${protocol.content.join(" ")}`.toLocaleLowerCase("pt-BR").includes(term));
  }, [library, query]);

  async function importFile(file?: File) {
    if (!file) return;
    setError("");
    setLoading(true);
    try {
      const imported = await readDocx(file);
      if (!imported.index.length && !imported.protocols.length) throw new Error("Nenhum conteúdo de texto foi encontrado no Word.");
      setLibrary(imported);
      localStorage.setItem(storageKey, JSON.stringify(imported));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível importar esse documento Word.");
    } finally {
      setLoading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return <AdminLayout>
    <PageIntro eyebrow="Biblioteca clínica" title="Protocolos" description="Consulte o índice e localize protocolos pelo número, título ou conteúdo." action={<><input ref={fileRef} type="file" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="hidden" onChange={event => void importFile(event.target.files?.[0])} /><Button onClick={() => fileRef.current?.click()} className="bg-[#2f8f82] text-white hover:bg-[#26796e]"><FileUp className="mr-2 size-4" />Importar Word</Button></>} />
    <div className="space-y-5">
      <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><Input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar protocolo por número, nome ou conteúdo" className="h-11 bg-white pl-9" aria-label="Buscar protocolos" /></div>
      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {loading && <p className="text-sm text-slate-500">Importando protocolos do Word…</p>}
      {library.index.length > 0 && <Card className="border-slate-200/80 shadow-sm"><CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><BookOpen className="size-4 text-[#2f8f82]" />Índice de protocolos</CardTitle></CardHeader><CardContent><ol className="grid gap-2 sm:grid-cols-2">{library.index.map((item, index) => <li key={`${index}-${item}`} className="text-sm text-slate-600">{item}</li>)}</ol></CardContent></Card>}
      <div className="space-y-4">
        {filtered.map(protocol => <Card key={`${protocol.number}-${protocol.title}`} className="border-slate-200/80 shadow-sm"><CardHeader className="pb-3"><CardTitle className="font-display text-base text-slate-800">Protocolo {protocol.number}: {protocol.title}</CardTitle></CardHeader><CardContent className="space-y-2">{protocol.content.map((line, index) => <p key={`${index}-${line}`} className="whitespace-pre-wrap text-sm leading-6 text-slate-600">{line}</p>)}</CardContent></Card>)}
        {!loading && query && filtered.length === 0 && <div className="rounded-xl border border-dashed border-slate-200 bg-white px-6 py-10 text-center text-sm text-slate-500">Nenhum protocolo corresponde à busca.</div>}
        {!loading && !query && !library.protocols.length && <div className="rounded-xl border border-dashed border-slate-200 bg-white px-6 py-10 text-center text-sm text-slate-500">Importe o documento Word para exibir os protocolos completos.</div>}
      </div>
    </div>
  </AdminLayout>;
}

export { parseProtocolDocument };
