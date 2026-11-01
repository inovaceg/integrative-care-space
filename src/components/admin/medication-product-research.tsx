import { useState, type FormEvent } from "react";
import { Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { generateMedicationObservation, type MedicationObservationResult } from "@/lib/admin/medication-observation-ai";

export function MedicationProductResearch() {
  const [name, setName] = useState("");
  const [details, setDetails] = useState("");
  const [result, setResult] = useState<MedicationObservationResult | null>(null);
  const [error, setError] = useState("");
  const [searching, setSearching] = useState(false);

  async function searchProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const productName = name.trim();
    if (productName.length < 2) {
      setError("Informe o nome do produto para iniciar a pesquisa.");
      return;
    }
    setSearching(true);
    setResult(null);
    setError("");
    try {
      const response = await generateMedicationObservation({ name: productName, unit: "unit", additionalDetails: details.trim() });
      if (response.error) {
        setError(response.error.message || "Não foi possível pesquisar o produto.");
        return;
      }
      if (!response.data?.draft) {
        setError("A pesquisa não retornou informações. Tente novamente.");
        return;
      }
      setResult(response.data);
    } catch {
      setError("Não foi possível acessar o serviço de pesquisa. Verifique sua conexão e tente novamente.");
    } finally {
      setSearching(false);
    }
  }

  return <section aria-label="Pesquisa de produto" className="space-y-5">
    <p className="text-sm text-slate-600">Pesquise informações técnicas em fontes oficiais e científicas. O resultado é apenas informativo e não altera o cadastro nem as observações do estoque.</p>
    <form onSubmit={searchProduct} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="medication-product-search">Nome do produto</Label>
        <Input id="medication-product-search" value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex.: princípio ativo ou nome comercial" maxLength={200} required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="medication-product-details">Dados complementares (opcional)</Label>
        <Textarea id="medication-product-details" value={details} onChange={(event) => setDetails(event.target.value)} placeholder="Concentração, forma farmacêutica, via ou dados do rótulo" maxLength={3000} rows={3} />
      </div>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <div><Button type="submit" disabled={searching} className="gap-2 bg-[#39245d] text-white hover:bg-[#2f1d4b]">{searching ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}{searching ? "Pesquisando…" : "Pesquisar produto"}</Button></div>
    </form>
    {result && <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
      <h3 className="font-display text-base font-semibold text-[#39245d]">Resultado da pesquisa</h3>
      <p className="mt-1 text-xs text-slate-500">Conteúdo gerado para revisão profissional; não constitui recomendação individual.</p>
      <div className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-700">{result.draft}</div>
      {result.sources.length > 0 && <div className="mt-5 border-t border-slate-100 pt-4">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-[#26796e]">Fontes consultadas</h4>
        <ul className="mt-2 grid gap-2">
          {result.sources.map((source) => <li key={source.url}><a href={source.url} target="_blank" rel="noreferrer" className="break-words text-sm text-[#26796e] underline underline-offset-2 hover:text-[#1e5f57]">{source.title}</a></li>)}
        </ul>
      </div>}
    </div>}
  </section>;
}
