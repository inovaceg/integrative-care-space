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
      const codes = valid.map((row) => sourceCode(row.codigo_taco));
      const existingCodes = new Set<string>();
      for (let index = 0; index < codes.length; index += 200) {
        const { data, error: duplicateError } = await supabase.from("nutrition_food_library").select("source_code").in("source_code", codes.slice(index, index + 200));
        if (duplicateError) throw new Error("Não foi possível identificar os códigos TACO já cadastrados.");
        for (const row of data ?? []) if (typeof row.source_code === "string") existingCodes.add(row.source_code);
      }
      setDatabaseDuplicates(existingCodes);
    } catch (parseError) {
      setFileName(""); setRows([]);
      setError(parseError instanceof Error ? parseError.message : "Não foi possível ler a planilha.");
    } finally {
      setLoadingFile(false);
    }
  }

  async function confirmImport() {
    if (!(["admin", "doctor"].includes(role ?? "")) || !rows.length || importing) return;
    const importRows = rows.filter((row) => row.errors.length === 0 && !row.duplicate_in_file);
    if (!importRows.length || referenceErrors.some((check) => !check.ok)) return;
    setImporting(true);
    setError("");
    setReport(null);
    try {
      const rejectedRows: NonNullable<ImportReport["rejected_rows"]> = rows
        .filter((row) => row.errors.length > 0)
        .map((row) => ({ codigo_taco: row.codigo_taco || null, nome: row.nome, error: row.errors.join(" ") }));
      const existingByCode = new Map<string, { id: string; source_code: string; source: string }>();
      let ignored = rows.filter((row) => row.duplicate_in_file).length;
      let imported = 0;
      let updated = 0;

      for (let index = 0; index < importRows.length; index += 200) {
        const batch = importRows.slice(index, index + 200);
        const codes = batch.map((row) => sourceCode(row.codigo_taco));
        const { data: existing, error: lookupError } = await supabase.from("nutrition_food_library").select("id,source_code,source").in("source_code", codes);
        if (lookupError) {
          for (const row of batch) rejectedRows.push({ codigo_taco: row.codigo_taco, nome: row.nome, error: `Falha ao consultar duplicidade: ${lookupError.message}` });
          continue;
        }
        for (const item of existing ?? []) {
          if (item.source_code && item.id) existingByCode.set(item.source_code, { id: item.id, source_code: item.source_code, source: item.source ?? "" });
        }

        const inserts: Record<string, unknown>[] = [];
        const updates: Array<{ id: string; row: TacoImportRow }> = [];
        for (const row of batch) {
          const code = sourceCode(row.codigo_taco);
          const existingRow = existingByCode.get(code);
          if (existingRow && existingRow.source !== "TACO") { ignored += 1; continue; }
          if (existingRow) { updates.push({ id: existingRow.id, row }); continue; }
          inserts.push({
            source_code: code,
            name: row.nome,
            category: "TACO — Alimentos principais",
            energy_kcal_100g: row.energia_kcal,
            proteins_g_100g: row.proteinas_g,
            carbohydrates_g_100g: row.carboidratos_g,
            fats_g_100g: row.gorduras_g,
            fibers_g_100g: row.fibras_g,
            sodium_mg_100g: row.sodio_mg,
            source: "TACO",
            license: "Planilha TACO fornecida pelo administrador; conferir termos da fonte antes de redistribuição.",
            validation_status: "verified",
            allergens: [],
            allergen_info_known: false,
            gluten_status: "unknown",
            lactose_status: "unknown",
            nutrition_missing: ["allergens", "gluten_status", "lactose_status"],
            import_notes: "Aba Alimentos - principais; nutrientes por 100 g sem conversão. A planilha não fornece dados de alergênicos, glúten ou lactose.",
          });
        }

        if (inserts.length) {
          const { error: insertError } = await supabase.from("nutrition_food_library").insert(inserts);
          if (insertError) {
            for (const item of inserts) rejectedRows.push({ codigo_taco: Number(String(item.source_code).slice(5)), nome: String(item.name), error: `Falha ao gravar no banco: ${insertError.message}` });
          } else imported += inserts.length;
        }

        const updateResults = await Promise.all(updates.map(async ({ id, row }) => {
          const { error: updateError } = await supabase.from("nutrition_food_library").update({
            name: row.nome,
            category: "TACO — Alimentos principais",
            energy_kcal_100g: row.energia_kcal,
            proteins_g_100g: row.proteinas_g,
            carbohydrates_g_100g: row.carboidratos_g,
            fats_g_100g: row.gorduras_g,
            fibers_g_100g: row.fibras_g,
            sodium_mg_100g: row.sodio_mg,
            updated_at: new Date().toISOString(),
          }).eq("id", id);
          return { row, error: updateError };
        }));
        for (const result of updateResults) {
          if (result.error) rejectedRows.push({ codigo_taco: result.row.codigo_taco, nome: result.row.nome, error: `Falha ao atualizar no banco: ${result.error.message}` });
          else updated += 1;
        }
      }

      const result: ImportReport = { imported, updated, ignored, rejected: rejectedRows.length, rejected_rows: rejectedRows };
      setReport(result);
      setDatabaseDuplicates(new Set(importRows.map((row) => sourceCode(row.codigo_taco))));
      onImported?.();
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : "Falha de conexão durante a importação. Tente novamente.");
    } finally {
      setImporting(false);
    }
  }

  const validCount = validTacoRows(rows).length;
  const duplicateInFileCount = rows.filter((row) => row.duplicate_in_file).length;
  const rejectedCount = rows.filter((row) => row.errors.length > 0).length;
  const criticalEnergyError = rows.some((row) => row.errors.some((item) => item.includes("energia fora do intervalo")));
  const existingCount = validTacoRows(rows).filter((row) => databaseDuplicates.has(sourceCode(row.codigo_taco))).length;

  if (!(["admin", "doctor"].includes(role ?? ""))) return <SectionCard title="Importar Banco Nutricional"><p className="text-sm text-slate-600">A importação da planilha TACO está disponível apenas para profissionais administradores autorizados.</p></SectionCard>;

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
        <div className="flex flex-wrap items-center gap-3"><Button type="button" onClick={() => void confirmImport()} disabled={importing || loadingFile || validCount === 0 || criticalEnergyError || referenceErrors.some((check) => !check.ok)} className="bg-[#2f8f82] hover:bg-[#26786e]">{importing ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Upload className="mr-2 size-4" />}{importing ? `Importando ${validCount} registros...` : "Confirmar importação"}</Button><span className="text-xs text-slate-500">Uma confirmação processa todos os registros válidos, em lotes automáticos de até 200, e atualiza duplicados pelo código TACO.</span></div>
      </>}
      {report && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4"><h3 className="font-semibold text-emerald-900">Resultado da importação</h3><p className="mt-2 text-sm text-emerald-900">{report.imported} importados · {report.updated} atualizados · {report.ignored} ignorados · {report.rejected} rejeitados</p>{report.rejected_rows?.length ? <ul className="mt-3 max-h-48 space-y-1 overflow-auto text-xs text-amber-900">{report.rejected_rows.map((item, index) => <li key={`${item.codigo_taco}-${index}`}>Código {item.codigo_taco ?? "inválido"} — {item.nome || "sem nome"}: {item.error}</li>)}</ul> : null}</div>}
      <p className="text-xs text-slate-500">Os dados da planilha são armazenados na tabela nutricional existente como TACO, por 100 g. Informações sobre alergênicos, glúten e lactose não constam nesta aba e permanecem marcadas como desconhecidas.</p>
    </div>
  </SectionCard>;
}
