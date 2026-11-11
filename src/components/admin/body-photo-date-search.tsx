import { useEffect, useState } from "react";
import { format, subDays, subMonths, subYears } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { signedPhoto, type PhotoStage, type ProgressPhoto } from "@/lib/admin/body-progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

type Props = { professionalId: string; patientId: string; stage: PhotoStage; refreshKey?: ProgressPhoto[]; id: string };
const viewLabels = { front: "Frente", side: "Perfil", back: "Costas" };

export function BodyPhotoDateSearch({ professionalId, patientId, stage, refreshKey, id }: Props) {
  const [period, setPeriod] = useState("");
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setPhotos([]);
    setError("");
    if (!period) return;
    setLoading(true);
    async function search() {
      try {
        const today = new Date();
        const start = period === "7d" ? subDays(today, 6)
          : period === "3m" ? subMonths(today, 3)
          : period === "6m" ? subMonths(today, 6)
          : subYears(today, 1);
        let query = supabase.from("body_progress_photos").select("*")
          .eq("profissional_id", professionalId).eq("patient_id", patientId).eq("stage", stage)
          .order("record_date", { ascending: false }).order("id");
        if (period !== "all") query = query.gte("record_date", format(start, "yyyy-MM-dd")).lte("record_date", format(today, "yyyy-MM-dd"));
        const { data, error: queryError } = await query;
        if (queryError) throw queryError;
        const results = await Promise.all(((data ?? []) as ProgressPhoto[]).map(async (photo) => {
          const signed = await signedPhoto(professionalId, patientId, photo.evaluation_id, photo.storage_path);
          if (signed.error) throw signed.error;
          return { ...photo, url: signed.data?.signedUrl };
        }));
        if (active) setPhotos(results);
      } catch (failure) {
        if (active) setError(failure instanceof Error ? failure.message : "Não foi possível buscar as fotos. Tente novamente.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void search();
    return () => { active = false; };
  }, [professionalId, patientId, stage, period, refreshKey]);

  return (
    <div className="mb-4 space-y-3 rounded-lg border border-[#2c5f4f]/15 bg-[#faf9f6] p-3">
      <Label htmlFor={id} className="text-xs text-[#2c5f4f]">Buscar fotos {stage === "before" ? "ANTES" : "DEPOIS"} por período</Label>
      <Select value={period} onValueChange={setPeriod}>
        <SelectTrigger id={id} className="w-full bg-white"><SelectValue placeholder="Selecione o período de busca" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="7d">Últimos 7 dias</SelectItem>
          <SelectItem value="3m">Últimos 3 meses</SelectItem>
          <SelectItem value="6m">Últimos 6 meses</SelectItem>
          <SelectItem value="1y">Último ano</SelectItem>
          <SelectItem value="all">Todo o período</SelectItem>
        </SelectContent>
      </Select>
      <p className="text-xs text-slate-600">Busca pela data do registro da foto em todas as avaliações deste paciente, sem alterar as fotos salvas.</p>
      {loading && <p role="status" className="text-xs text-slate-600">Buscando fotos...</p>}
      {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
      {period && !loading && !error && <>
        <p role="status" className="text-xs text-[#2c5f4f]">{photos.length ? `${photos.length} foto(s) encontrada(s). Clique para ampliar.` : "Nenhuma foto neste período. Selecione Todo o período para buscar registros mais antigos."}</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((photo) => <Dialog key={photo.id}>
            <DialogTrigger asChild>
              <button type="button" className="overflow-hidden rounded-lg border border-slate-200 bg-white text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2c5f4f]" aria-label={`Ampliar foto ${viewLabels[photo.view]} de ${format(new Date(`${photo.record_date}T12:00:00`), "dd/MM/yyyy")}`}>
                <img src={photo.url} alt={photo.caption || `Foto ${viewLabels[photo.view]}`} loading="lazy" className="aspect-[3/4] w-full object-contain" />
                <span className="block px-2 py-2 text-xs text-slate-600">{viewLabels[photo.view]} · {format(new Date(`${photo.record_date}T12:00:00`), "dd/MM/yyyy")}</span>
              </button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl" aria-describedby={undefined}>
              <DialogHeader><DialogTitle>{stage === "before" ? "ANTES" : "DEPOIS"} · {viewLabels[photo.view]} · {format(new Date(`${photo.record_date}T12:00:00`), "dd/MM/yyyy")}</DialogTitle></DialogHeader>
              <img src={photo.url} alt={photo.caption || `Foto ${viewLabels[photo.view]}`} className="max-h-[70vh] w-full object-contain" />
              {photo.caption && <p className="text-sm text-slate-600">{photo.caption}</p>}
            </DialogContent>
          </Dialog>)}
        </div>
      </>}
    </div>
  );
}
