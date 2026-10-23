import { useState, type ChangeEvent } from "react";
import { FileSpreadsheet, Loader2, Upload } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/admin/admin-ui";
import { supabase } from "@/integrations/supabase/client";
import { checkTacoReferenceFoods, parseTacoWorkbook, validTacoRows, type TacoImportRow } from "@/lib/admin/taco-xlsx";

type ImportReport = { imported: number; updated: number; ignored: number; rejected: number; rejected_rows?: Array<{ codigo_taco: number | null; nome: string; error: string }> };
const sourceCode = (code: number) => `TACO-${code}`;

export function TacoXlsxImporter({ onImported }: { onImported?: () => void }) {
  const { role } = useAuth();
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<TacoImportRow[]>([]);
  const [databaseDuplicates, setDatabaseDuplicates] = useState<Set<string>>(new Set());
  const [referenceErrors, setReferenceErrors] = useState<Array<{ label: string; expected: number; actual: number | null; ok: boolean; detail: string }>>([]);
  const [loadingFile, setLoadingFile] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  const [report, setReport] = useState<ImportReport | null>(null);

  async function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = "";
    setError(""); setReport(null); setRows([]); setReferenceErrors([]); setDatabaseDuplicates(new Set());
    if (!file.name.toLocaleLowerCase("pt-BR").endsWith(".xlsx")) { setError("Selecione um arquivo .xlsx."); return; }
    if (file.size > 10 * 1024 * 1024) { setError("O arquivo excede o limite de 10 MB."); return; }
    setLoadingFile(true); setFileName(file.name);
    try {
      const parsed = parseTacoWorkbook(await file.arrayBuffer());
      setRows(parsed);
      const checks = checkTacoReferenceFoods(parsed);
      setReferenceErrors(checks);
      const valid = validTacoRows(parsed);
      if (valid.length) {
        const codes = valid.map((row) => sourceCode(row.codigo_taco));
        const { data, error: duplicateError } = await supabase.from("nutrition_food_library").select("source_code").in("source_code", codes);
        if (duplicateError) throw new Error("Não foi possível identificar os códigos TACO já cadastrados.");
        setDatabaseDuplicates(new Set((data ?? []).map((row) => row.source_code).filter((code): code is string => typeof code === "string")));
      }
    } catch (parseError) {
      setFileName(""); setRows([]);
      setError(parseError instanceof Error ? parseError.message : "Não foi possível ler a planilha.");
    } finally {
      setLoadingFile(false);
    }
  }

  async function confirmImport() {
    if (role !== "admin" || !rows.length || importing) return;
    const importRows = rows.filter((row) => row.errors.length === 0);
    if (!importRows.length || referenceErrors.some((check) => !check.ok)) return;
    setImporting(true); setError(""); setReport(null);
    const { data, error: invokeError } = await supabase.functions.invoke("nutrition-taco-import", { body: { rows: importRows.map(({ codigo_taco, nome, energia_kcal, proteinas_g, carboidratos_g, gorduras_g, fibras_g, sodio_mg }) => ({ codigo_taco, nome, energia_kcal, proteinas_g, carboidratos_g, gorduras_g, fibras_g, sodio_mg })) } });
    setImporting(false);
    if (invokeError) {
      const context = "context" in invokeError ? invokeError.context : null;
      let detail = invokeError.message;
      if (context instanceof Response) {
        const body = await context.clone().json().catch(() => null) as { error?: unknown; reference_errors?: string[] } | null;
        if (typeof body?.error === "string") detail = `${body.error}${body.reference_errors?.length ? ` ${body.reference_errors.join(" ")}` : ""}`;
      }
      setError(detail || "Não foi possível importar a planilha.");
      return;
    }
    if (data?.error) { setError(typeof data.error === "string" ? data.error : "Não foi possível importar a planilha."); return; }
    setReport(data as ImportReport);
    onImported?.();
    const codes = importRows.map((row) => sourceCode(row.codigo_taco));
    const { data: updatedCodes } = await supabase.from("nutrition_food_library").select("source_code").in("source_code", codes);
    if (updatedCodes) setDatabaseDuplicates(new Set(updatedCodes.map((row) => row.source_code).filter((code): code is string => typeof code === "string")));
  }

  const validCount = validTacoRows(rows).length;
  const duplicateInFileCount = rows.filter((row) => row.duplicate_in_file).length;
  const rejectedCount = rows.filter((row) => row.errors.length > 0).length;
  const criticalEnergyError = rows.some((row) => row.errors.some((item) => item.includes("energia fora do intervalo")));
  const existingCount = validTacoRows(rows).filter((row) => databaseDuplicates.has(sourceCode(row.codigo_taco))).length;

  if (role !== "admin") return <SectionCard title="Importar Banco Nutricional"><p className="text-sm text-slate-600">A importação da planilha TACO está disponível apenas para administradores autorizados.</p></SectionCard>;

  return <SectionCard title="Importar Banco Nutricional">
    <div className="space-y-4">
      <p className="text-sm text-slate-600">Selecione a planilha TACO. O importador lê apenas a aba “Alimentos - principais”, reconhece os cabeçalhos, preserva os números por 100 g e não substitui campos vazios por zero. “Composição completa” e “Leia-me” não são importadas.</p>
      <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[#8dbdb4] bg-[#f3f8f7] p-6 text-center hover:bg-[#eaf5f2]">
        <FileSpreadsheet className="size-7 text-[#2f8f82]" />
        <span className="font-medium text-slate-800">{loadingFile ? "Lendo planilha..." : fileName || "Selecionar arquivo .xlsx"}</span>
        <span className="text-xs text-slate-500">Máximo 10 MB. A prévia será mostrada antes de qualquer gravação.</span>
        <input type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="sr-only" onChange={(event) => void chooseFile(event)} disabled={loadingFile || importing} />
      </label>
      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {rows.length > 0 && <>
        <div className="grid gap-3 sm:grid-cols-4"><div className="rounded-lg bg-slate-50 p-3 text-sm"><strong>{rows.length}</strong><span className="ml-1 text-slate-500">linhas lidas</span></div><div className="rounded-lg bg-emerald-50 p-3 text-sm"><strong>{validCount}</strong><span className="ml-1 text-slate-500">válidas</span></div><div className="rounded-lg bg-amber-50 p-3 text-sm"><strong>{duplicateInFileCount + existingCount}</strong><span className="ml-1 text-slate-500">duplicadas (arquivo/banco; no banco serão atualizadas)</span></div><div className="rounded-lg bg-red-50 p-3 text-sm"><strong>{rejectedCount}</strong><span className="ml-1 text-slate-500">rejeitadas</span></div></div>
        <div className="space-y-2 rounded-xl border border-slate-200 p-4"><h3 className="font-semibold text-slate-800">Conferência de valores de referência</h3>{referenceErrors.map((check) => <p key={check.label} className={`text-sm ${check.ok ? "text-emerald-800" : "text-red-700"}`}>{check.ok ? "✓" : "✕"} {check.label}: {check.detail}</p>)}</div>
        <div className="overflow-x-auto rounded-xl border border-slate-200"><table className="min-w-full text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr>{["Código", "Alimento", "Energia", "Proteína", "Carboidratos", "Gorduras", "Fibras", "Sódio", "Situação"].map((title) => <th key={title} className="whitespace-nowrap px-3 py-2">{title}</th>)}</tr></thead><tbody>{rows.slice(0, 10).map((row) => <tr key={`${row.excel_row}-${row.codigo_taco}`} className="border-t border-slate-100"><td className="px-3 py-2">{row.codigo_taco || "—"}</td><td className="min-w-56 px-3 py-2">{row.nome || "—"}</td><td className="px-3 py-2">{row.energia_kcal ?? "—"}</td><td className="px-3 py-2">{row.proteinas_g ?? "—"}</td><td className="px-3 py-2">{row.carboidratos_g ?? "—"}</td><td className="px-3 py-2">{row.gorduras_g ?? "—"}</td><td className="px-3 py-2">{row.fibras_g ?? "—"}</td><td className="px-3 py-2">{row.sodio_mg ?? "—"}</td><td className="px-3 py-2">{row.errors.length ? <span className="text-red-700">Rejeitado: {row.errors.join(" ")}</span> : row.duplicate_in_file ? <span className="text-amber-700">Duplicado no arquivo</span> : databaseDuplicates.has(sourceCode(row.codigo_taco)) ? <span className="text-blue-700">Atualizar existente</span> : <span className="text-emerald-700">Novo</span>}</td></tr>)}</tbody></table></div>
        {rows.length > 10 && <p className="text-xs text-slate-500">Prévia mostrando 10 de {rows.length} registros.</p>}
        {criticalEnergyError && <p role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800">Há calorias negativas ou acima de 1.000 kcal/100 g. A importação inteira foi bloqueada.</p>}
        <div className="flex flex-wrap items-center gap-3"><Button type="button" onClick={() => void confirmImport()} disabled={importing || loadingFile || validCount === 0 || criticalEnergyError || referenceErrors.some((check) => !check.ok)} className="bg-[#2f8f82] hover:bg-[#26786e]">{importing ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Upload className="mr-2 size-4" />}Confirmar importação</Button><span className="text-xs text-slate-500">A confirmação grava até 50 itens por lote, usa código TACO para atualizar duplicados e preserva campos de revisão já existentes.</span></div>
      </>}
      {report && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4"><h3 className="font-semibold text-emerald-900">Resultado da importação</h3><p className="mt-2 text-sm text-emerald-900">{report.imported} importados · {report.updated} atualizados · {report.ignored} ignorados · {report.rejected} rejeitados</p>{report.rejected_rows?.length ? <ul className="mt-3 max-h-48 space-y-1 overflow-auto text-xs text-amber-900">{report.rejected_rows.map((item, index) => <li key={`${item.codigo_taco}-${index}`}>Código {item.codigo_taco ?? "inválido"} — {item.nome || "sem nome"}: {item.error}</li>)}</ul> : null}</div>}
      <p className="text-xs text-slate-500">Os dados da planilha são armazenados na tabela nutricional existente como TACO, por 100 g. Informações sobre alergênicos, glúten e lactose não constam nesta aba e permanecem marcadas como desconhecidas.</p>
    </div>
  </SectionCard>;
}
