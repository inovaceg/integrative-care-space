import { useEffect, useRef, useState } from "react";
import { FileText, Loader2, Trash2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const allowed = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
const maxSize = 15 * 1024 * 1024;
type Attachment = { id: string; file_name: string; storage_path: string; content_type: string; file_size: number; created_at: string };

function filenameWithoutExtension(filename: string) {
  const name = filename.split(/[\\/]/).pop() ?? filename;
  const extensionIndex = name.lastIndexOf(".");
  return extensionIndex > 0 ? name.slice(0, extensionIndex) : name;
}

export function ExamAttachments({ patientId, profissionalId }: { patientId: string; profissionalId: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<Attachment[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [displayName, setDisplayName] = useState("");

  async function load() {
    const { data, error: queryError } = await supabase.from("patient_exam_attachments").select("id,file_name,storage_path,content_type,file_size,created_at").eq("profissional_id", profissionalId).eq("patient_id", patientId).order("created_at", { ascending: false });
    if (queryError) setError(queryError.message); else setItems((data ?? []) as Attachment[]);
  }
  useEffect(() => { void load(); }, [patientId, profissionalId]);

  function selectFile(file?: File) {
    if (!file) return;
    setError("");
    if (!allowed.includes(file.type)) { setError("Envie apenas PDF, JPEG, PNG ou WebP."); return; }
    if (file.size > maxSize) { setError("O arquivo deve ter no máximo 15 MB."); return; }
    setPendingFile(file);
    setDisplayName(filenameWithoutExtension(file.name));
  }

  async function upload() {
    if (!pendingFile || !displayName.trim()) return;
    const file = pendingFile;
    setBusy(true);
    setError("");
    const id = crypto.randomUUID();
    const path = `${profissionalId}/${patientId}/${id}`;
    const { error: storageError } = await supabase.storage.from("patient-exams").upload(path, file, { contentType: file.type, upsert: false });
    if (storageError) { setError(storageError.message); setBusy(false); return; }
    const { error: rowError } = await supabase.from("patient_exam_attachments").insert({ id, profissional_id: profissionalId, patient_id: patientId, file_name: displayName.trim(), storage_path: path, content_type: file.type, file_size: file.size });
    if (rowError) { await supabase.storage.from("patient-exams").remove([path]); setError(rowError.message); }
    else await load();
    setBusy(false);
    setPendingFile(null);
    setDisplayName("");
    if (inputRef.current) inputRef.current.value = "";
  }

  async function open(item: Attachment) {
    setError("");
    const { data: metadata } = await supabase.from("patient_exam_attachments").select("storage_path").eq("id", item.id).eq("profissional_id", profissionalId).eq("patient_id", patientId).maybeSingle();
    if (!metadata?.storage_path || !metadata.storage_path.startsWith(`${profissionalId}/${patientId}/`)) { setError("Arquivo não encontrado."); return; }
    const { data, error: urlError } = await supabase.storage.from("patient-exams").createSignedUrl(metadata.storage_path, 300);
    if (urlError || !data?.signedUrl) setError(urlError?.message ?? "Não foi possível abrir o arquivo."); else window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }
  async function remove(item: Attachment) {
    if (!item.storage_path.startsWith(`${profissionalId}/${patientId}/`)) return;
    setBusy(true); setError("");
    const { error: storageError } = await supabase.storage.from("patient-exams").remove([item.storage_path]);
    if (storageError) { setError(storageError.message); setBusy(false); return; }
    const { error: rowError } = await supabase.from("patient_exam_attachments").delete().eq("id", item.id).eq("profissional_id", profissionalId).eq("patient_id", patientId);
    if (rowError) setError(rowError.message); else await load();
    setBusy(false);
  }

  return <Card className="mt-4 border-slate-200 shadow-sm"><CardHeader><CardTitle className="text-base">Exames anexados</CardTitle></CardHeader><CardContent className="space-y-3">
    <div className="space-y-2 rounded-md border border-slate-200 p-3">
      <label htmlFor="exam-display-name" className="text-sm font-medium text-slate-700">Nome do exame/arquivo</label>
      <Input id="exam-display-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Digite o nome do exame ou arquivo" disabled={busy} />
      <input ref={inputRef} type="file" accept="application/pdf,image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => selectFile(e.target.files?.[0])} />
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" disabled={busy} onClick={() => inputRef.current?.click()}><Upload className="mr-2 size-4" /> Selecionar arquivo</Button>
        <span className="text-sm text-slate-500">{pendingFile ? pendingFile.name : "Nenhum arquivo selecionado"}</span>
        {pendingFile && <Button type="button" disabled={busy || !displayName.trim()} onClick={() => void upload()}>{busy && <Loader2 className="mr-2 size-4 animate-spin" />}Confirmar upload</Button>}
      </div>
    </div>
    {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    {items.length === 0 ? <p className="text-sm text-slate-500">Nenhum exame anexado.</p> : <div className="divide-y">{items.map((item) => <div key={item.id} className="flex items-center justify-between gap-3 py-3"><div className="flex min-w-0 items-center gap-2"><FileText className="size-4 shrink-0 text-[#2f8f82]" /><span className="truncate text-sm"><strong className="font-semibold text-slate-700">Exame:</strong> {item.file_name}</span><span className="text-xs text-slate-400">{(item.file_size / 1024 / 1024).toFixed(1)} MB</span></div><div className="flex gap-1"><Button type="button" variant="outline" onClick={() => void open(item)}>Abrir anexo</Button><Button type="button" size="icon" variant="ghost" aria-label="Excluir exame" disabled={busy} onClick={() => void remove(item)}><Trash2 className="size-4 text-red-600" /></Button></div></div>)}</div>}
  </CardContent></Card>;
}
