import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Camera, ImagePlus, Maximize2, Pencil, Trash2 } from "lucide-react";
import { AdminLayout, PageIntro, SectionCard } from "@/components/admin/admin-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAuth } from "@/components/auth/auth-provider";
import {
  calculateBmi,
  deleteEvaluation,
  fetchBodyPatients,
  fetchEvaluations,
  listPhotos,
  measurementFields,
  removePhoto,
  saveEvaluation,
  savePhoto,
  signedPhoto,
  type BodyEvaluation,
  type PhotoStage,
  type PhotoView,
  type ProgressPhoto,
} from "@/lib/admin/body-progress";

export const Route = createFileRoute("/admin/evolucao-corporal")({
  component: BodyProgressPage,
});

const labels: Record<string, string> = {
  weight_kg: "Peso (kg)",
  height_cm: "Altura (cm)",
  bmi: "IMC",
  waist_cm: "Cintura (cm)",
  abdomen_cm: "Abdômen (cm)",
  hip_cm: "Quadril (cm)",
  chest_cm: "Tórax (cm)",
  right_arm_cm: "Braço direito (cm)",
  left_arm_cm: "Braço esquerdo (cm)",
  right_thigh_cm: "Coxa direita (cm)",
  left_thigh_cm: "Coxa esquerda (cm)",
  right_calf_cm: "Panturrilha direita (cm)",
  left_calf_cm: "Panturrilha esquerda (cm)",
  body_fat_percentage: "Gordura (%)",
  muscle_mass_kg: "Massa muscular (kg)",
};

const stages: PhotoStage[] = ["before", "after"];
const views: PhotoView[] = ["front", "side", "back"];
const stageLabels: Record<PhotoStage, string> = { before: "ANTES", after: "DEPOIS" };
const viewLabels: Record<PhotoView, string> = {
  front: "Frontal",
  side: "Lateral",
  back: "Posterior",
};

function photoKey(stage: PhotoStage, view: PhotoView) {
  return `${stage}-${view}`;
}

function PhotoPreviewDialog({
  url,
  alt,
  stage,
  view,
  caption,
}: {
  url: string;
  alt: string;
  stage: PhotoStage;
  view: PhotoView;
  caption: string | null | undefined;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="group relative h-full w-full overflow-hidden rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f8f82] focus-visible:ring-offset-2"
          aria-label={`Visualizar maior: ${alt}`}
        >
          <img src={url} alt={alt} className="h-full w-full object-contain" />
          <span className="absolute inset-x-2 bottom-2 flex items-center justify-center gap-1 rounded-md bg-slate-950/75 px-2 py-1.5 text-xs font-medium text-white opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-visible:opacity-100">
            <Maximize2 className="h-3.5 w-3.5" />
            Visualizar maior
          </span>
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{stageLabels[stage]} · {viewLabels[view]}</DialogTitle>
          <DialogDescription>{caption || "Visualização ampliada da foto"}</DialogDescription>
        </DialogHeader>
        <img src={url} alt={alt} className="max-h-[72vh] w-full object-contain" />
      </DialogContent>
    </Dialog>
  );
}

function PhotoRegistry({
  professionalId,
  patientId,
  evaluation,
}: {
  professionalId: string;
  patientId: string;
  evaluation: BodyEvaluation;
}) {
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [dates, setDates] = useState<Record<PhotoStage, string>>({
    before: evaluation.evaluation_date,
    after: evaluation.evaluation_date,
  });
  const [captions, setCaptions] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadPhotos = useCallback(async () => {
    setLoading(true);
    setError("");
    const result = await listPhotos(professionalId, patientId, evaluation.id);

    if (result.error) {
      setPhotos([]);
      setError(result.error.message);
      setLoading(false);
      return;
    }

    const records = (result.data ?? []) as ProgressPhoto[];
    const photosWithUrls = await Promise.all(
      records.map(async (photo) => {
        const signed = await signedPhoto(
          professionalId,
          patientId,
          evaluation.id,
          photo.storage_path,
        );
        return signed.data?.signedUrl
          ? { ...photo, url: signed.data.signedUrl }
          : photo;
      }),
    );

    setPhotos(photosWithUrls);
    setCaptions(
      Object.fromEntries(
        records.map((photo) => [photoKey(photo.stage, photo.view), photo.caption ?? ""]),
      ),
    );
    setDates((current) => ({
      before: records.find((photo) => photo.stage === "before")?.record_date ?? current.before,
      after: records.find((photo) => photo.stage === "after")?.record_date ?? current.after,
    }));
    setLoading(false);
  }, [evaluation.id, patientId, professionalId]);

  useEffect(() => {
    void loadPhotos();
  }, [loadPhotos]);

  async function handleUpload(stage: PhotoStage, view: PhotoView, file: File) {
    const key = photoKey(stage, view);
    if (!dates[stage]) {
      setError(`Informe a data do registro ${stageLabels[stage].toLowerCase()}.`);
      return;
    }

    setBusy(key);
    setError("");
    try {
      const result = await savePhoto(
        professionalId,
        patientId,
        evaluation.id,
        stage,
        view,
        dates[stage],
        file,
        captions[key] ?? "",
      );
      if (result.error) throw result.error;
      await loadPhotos();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Não foi possível salvar a foto.");
    } finally {
      setBusy(null);
    }
  }

  async function handleRemove(photo: ProgressPhoto) {
    if (!window.confirm("Excluir esta foto? Esta ação não poderá ser desfeita.")) return;

    setBusy(photo.id);
    setError("");
    try {
      const result = await removePhoto(
        professionalId,
        patientId,
        evaluation.id,
        photo.id,
        photo.storage_path,
      );
      if (result.error) throw result.error;
      await loadPhotos();
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "Não foi possível excluir a foto.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
      <div className="mb-4 flex items-start gap-3">
        <div className="rounded-lg bg-[#2f8f82]/10 p-2 text-[#2f8f82]">
          <Camera className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-900">Registro Fotográfico</h3>
          <p className="text-sm text-slate-500">
            Imagens privadas em qualidade original. Formatos JPEG, PNG ou WebP, até 15 MB.
          </p>
        </div>
      </div>

      {loading ? (
        <p className="py-8 text-center text-sm text-slate-500">Carregando fotografias...</p>
      ) : (
        <div className="grid gap-5 xl:grid-cols-2">
          {stages.map((stage) => (
            <div key={stage} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-semibold tracking-[0.16em] text-[#2f8f82]">
                    {stageLabels[stage]}
                  </p>
                  <Label htmlFor={`${evaluation.id}-${stage}-date`} className="text-xs text-slate-500">
                    Data do registro
                  </Label>
                </div>
                <Input
                  id={`${evaluation.id}-${stage}-date`}
                  className="sm:w-44"
                  type="date"
                  required
                  value={dates[stage]}
                  onChange={(event) =>
                    setDates((current) => ({ ...current, [stage]: event.target.value }))
                  }
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                {views.map((view) => {
                  const key = photoKey(stage, view);
                  const photo = photos.find(
                    (item) => item.stage === stage && item.view === view,
                  );
                  const inputId = `${evaluation.id}-${key}-file`;
                  const isBusy = busy === key || busy === photo?.id;

                  return (
                    <div key={view} className="space-y-2">
                      <Label className="text-xs font-medium text-slate-700">
                        {viewLabels[view]}
                      </Label>
                      <div className="aspect-[3/4] overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                        {photo?.url ? (
                          <PhotoPreviewDialog
                            url={photo.url}
                            alt={photo.caption || `Foto ${viewLabels[view].toLowerCase()} ${stageLabels[stage].toLowerCase()}`}
                            stage={stage}
                            view={view}
                            caption={photo.caption}
                          />
                        ) : (
                          <div className="flex h-full flex-col items-center justify-center gap-2 px-2 text-center text-xs text-slate-400">
                            <ImagePlus className="h-6 w-6" />
                            Sem foto
                          </div>
                        )}
                      </div>

                      <Input
                        aria-label={`Legenda da foto ${viewLabels[view]}`}
                        placeholder="Legenda opcional"
                        value={captions[key] ?? ""}
                        onChange={(event) =>
                          setCaptions((current) => ({ ...current, [key]: event.target.value }))
                        }
                      />

                      <input
                        id={inputId}
                        className="sr-only"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        disabled={Boolean(busy)}
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (file) void handleUpload(stage, view, file);
                          event.currentTarget.value = "";
                        }}
                      />
                      <label
                        htmlFor={inputId}
                        className="flex h-9 cursor-pointer items-center justify-center rounded-md border border-slate-200 bg-white px-3 text-center text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
                      >
                        {isBusy ? "Salvando..." : photo ? "Substituir foto" : "Adicionar foto"}
                      </label>
                      {photo && (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="w-full text-red-600 hover:bg-red-50 hover:text-red-700"
                          disabled={Boolean(busy)}
                          onClick={() => void handleRemove(photo)}
                        >
                          <Trash2 className="mr-1 h-3.5 w-3.5" />
                          Excluir foto
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </div>
  );
}

type DraftPhoto = { file: File; url: string };

type DraftPhotoState = {
  dates: Record<PhotoStage, string>;
  captions: Record<string, string>;
  files: Record<string, DraftPhoto>;
};

const emptyDraft = (): DraftPhotoState => ({
  dates: { before: new Date().toISOString().slice(0, 10), after: new Date().toISOString().slice(0, 10) },
  captions: {},
  files: {},
});

function DraftPhotoRegistry({
  draft,
  onChange,
  onError,
}: {
  draft: DraftPhotoState;
  onChange: (next: DraftPhotoState) => void;
  onError: (message: string) => void;
}) {
  function selectFile(stage: PhotoStage, view: PhotoView, file: File) {
    if (!validDraftPhoto(file)) {
      onError("A foto deve ser JPEG, PNG ou WebP e ter no máximo 15 MB.");
      return;
    }
    onError("");
    const key = photoKey(stage, view);
    const previous = draft.files[key];
    if (previous) URL.revokeObjectURL(previous.url);
    onChange({ ...draft, files: { ...draft.files, [key]: { file, url: URL.createObjectURL(file) } } });
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
      <div className="mb-4 flex items-start gap-3"><Camera className="mt-1 h-5 w-5 text-[#2f8f82]" /><div><h3 className="font-semibold text-slate-900">Registro Fotográfico</h3><p className="text-sm text-slate-500">JPEG, PNG ou WebP, até 15 MB. As fotos serão enviadas ao salvar.</p></div></div>
      <div className="grid gap-5 xl:grid-cols-2">
        {stages.map((stage) => <div key={stage} className="rounded-xl border border-slate-200 bg-white p-4"><div className="mb-4 flex items-center justify-between"><Label htmlFor={`draft-${stage}-date`}>{stageLabels[stage]} · Data</Label><Input id={`draft-${stage}-date`} className="w-44" type="date" required value={draft.dates[stage]} onChange={(e) => onChange({ ...draft, dates: { ...draft.dates, [stage]: e.target.value } })} /></div><div className="grid gap-4 sm:grid-cols-3">{views.map((view) => { const key = photoKey(stage, view); const selected = draft.files[key]; const inputId = `draft-${key}-file`; return <div key={view} className="space-y-2"><Label className="text-xs">{viewLabels[view]}</Label><div className="aspect-[3/4] overflow-hidden rounded-lg border bg-slate-100">{selected ? <PhotoPreviewDialog url={selected.url} alt={`Prévia ${viewLabels[view]}`} stage={stage} view={view} caption={draft.captions[key]} /> : <div className="flex h-full items-center justify-center text-xs text-slate-400"><ImagePlus className="mr-1 h-5 w-5" />Sem foto</div>}</div><Input aria-label={`Legenda ${viewLabels[view]} ${stageLabels[stage]}`} placeholder="Legenda opcional" value={draft.captions[key] ?? ""} onChange={(e) => onChange({ ...draft, captions: { ...draft.captions, [key]: e.target.value } })} /><input id={inputId} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => { const file = e.target.files?.[0]; if (file) selectFile(stage, view, file); e.currentTarget.value = ""; }} /><label htmlFor={inputId} className="flex h-9 cursor-pointer items-center justify-center rounded-md border bg-white px-3 text-xs font-medium">{selected ? "Substituir foto" : "Adicionar foto"}</label></div>; })}</div></div>)}
      </div>
    </div>
  );
}

function validDraftPhoto(file: File) {
  return ["image/jpeg", "image/png", "image/webp"].includes(file.type) && file.size <= 15 * 1024 * 1024;
}

const comparisonRows = [
  { key: "weight_kg", label: "Peso", unit: "kg" },
  { key: "height_cm", label: "Altura", unit: "cm" },
  { key: "bmi", label: "IMC", unit: "" },
  { key: "waist_cm", label: "Cintura", unit: "cm" },
  { key: "abdomen_cm", label: "Abdômen", unit: "cm" },
  { key: "hip_cm", label: "Quadril", unit: "cm" },
  { key: "chest_cm", label: "Tórax", unit: "cm" },
  { key: "right_arm_cm", label: "Braço direito", unit: "cm" },
  { key: "left_arm_cm", label: "Braço esquerdo", unit: "cm" },
  { key: "right_thigh_cm", label: "Coxa direita", unit: "cm" },
  { key: "left_thigh_cm", label: "Coxa esquerda", unit: "cm" },
  { key: "right_calf_cm", label: "Panturrilha direita", unit: "cm" },
  { key: "left_calf_cm", label: "Panturrilha esquerda", unit: "cm" },
  { key: "body_fat_percentage", label: "Percentual de gordura", unit: "%" },
  { key: "muscle_mass_kg", label: "Massa muscular", unit: "kg" },
] as const;

function formatComparisonValue(value: unknown, unit: string) {
  if (value == null || value === "") return "—";
  const number = Number(value);
  if (!Number.isFinite(number)) return "—";
  return `${number.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}${unit ? ` ${unit}` : ""}`;
}

function ComparisonSection({ items }: { items: BodyEvaluation[] }) {
  const ordered = useMemo(
    () => [...items].sort((a, b) => a.evaluation_date.localeCompare(b.evaluation_date)),
    [items],
  );
  const [beforeId, setBeforeId] = useState("");
  const [afterId, setAfterId] = useState("");

  useEffect(() => {
    if (ordered.length < 2) {
      setBeforeId("");
      setAfterId("");
      return;
    }
    setBeforeId((current) => ordered.some((item) => item.id === current) ? current : ordered[0]!.id);
    setAfterId((current) => ordered.some((item) => item.id === current) ? current : ordered[ordered.length - 1]!.id);
  }, [ordered]);

  const before = ordered.find((item) => item.id === beforeId);
  const after = ordered.find((item) => item.id === afterId);
  const sameEvaluation = Boolean(before && after && before.id === after.id);

  return (
    <SectionCard title="Comparar avaliações">
      {ordered.length < 2 ? (
        <p className="text-sm text-slate-500">É necessário ter pelo menos duas avaliações para comparar medidas.</p>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {[{ label: "Avaliação inicial", value: beforeId, set: setBeforeId }, { label: "Avaliação atual", value: afterId, set: setAfterId }].map((field) => (
              <label key={field.label} className="grid gap-1 text-sm font-medium text-slate-700">
                {field.label}
                <select className="h-10 rounded-md border border-slate-200 bg-white px-3 font-normal" value={field.value} onChange={(event) => field.set(event.target.value)}>
                  {ordered.map((item) => <option key={item.id} value={item.id}>{new Date(`${item.evaluation_date}T12:00:00`).toLocaleDateString("pt-BR")}</option>)}
                </select>
              </label>
            ))}
          </div>
          {sameEvaluation && <p className="text-sm text-slate-500">Escolha datas diferentes para visualizar a variação.</p>}
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full min-w-[620px] text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Medida</th><th className="px-4 py-3">Antes</th><th className="px-4 py-3">Atual</th><th className="px-4 py-3">Variação</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {comparisonRows.map(({ key, label, unit }) => {
                  const initial = before?.[key];
                  const current = after?.[key];
                  const variation = !sameEvaluation && initial != null && current != null ? Number(current) - Number(initial) : null;
                  const variationText = variation == null || !Number.isFinite(variation) ? "—" : `${variation >= 0 ? "+" : "−"}${Math.abs(variation).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}${unit ? ` ${unit}` : ""}`;
                  const indicator = variation == null || !Number.isFinite(variation) ? "" : variation > 0 ? "↑" : variation < 0 ? "↓" : "→";
                  return <tr key={key}><td className="px-4 py-3 font-medium text-slate-700">{label}</td><td className="px-4 py-3 text-slate-600">{formatComparisonValue(initial, unit)}</td><td className="px-4 py-3 text-slate-600">{formatComparisonValue(current, unit)}</td><td className="px-4 py-3 font-medium text-slate-600"><span className="mr-1 text-slate-400" aria-hidden="true">{indicator}</span>{variationText}</td></tr>;
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </SectionCard>
  );
}

function BodyProgressPage() {
  const { user } = useAuth();
  const [patients, setPatients] = useState<{ id: string; nome: string }[]>([]);
  const [patientId, setPatientId] = useState("");
  const [items, setItems] = useState<BodyEvaluation[]>([]);
  const [editingId, setEditingId] = useState<string>();
  const [openPhotosId, setOpenPhotosId] = useState<string | null>(null);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [values, setValues] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");
  const [draft, setDraft] = useState<DraftPhotoState>(emptyDraft);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const draftRef = useRef(draft);
  draftRef.current = draft;

  useEffect(() => () => Object.values(draftRef.current.files).forEach(({ url }) => URL.revokeObjectURL(url)), []);

  const editing = useMemo(
    () => items.find((item) => item.id === editingId),
    [editingId, items],
  );

  const loadEvaluations = useCallback(async () => {
    if (!user || !patientId) return;
    const result = await fetchEvaluations(user.id, patientId);
    if (result.error) {
      setError(result.error.message);
      return;
    }
    setItems((result.data ?? []) as BodyEvaluation[]);
  }, [patientId, user]);

  useEffect(() => {
    if (!user) return;
    void fetchBodyPatients(user.id).then((result) => {
      if (result.error) setError(result.error.message);
      setPatients((result.data ?? []) as { id: string; nome: string }[]);
    });
  }, [user]);

  useEffect(() => {
    if (!patientId) {
      setItems([]);
      return;
    }
    void loadEvaluations();
  }, [loadEvaluations, patientId]);

  function clearDraftPhotos() {
    Object.values(draftRef.current.files).forEach(({ url }) => URL.revokeObjectURL(url));
    setDraft(emptyDraft());
  }

  function resetForm() {
    clearDraftPhotos();
    setValues({});
    setNotes("");
    setEditingId(undefined);
    setDate(new Date().toISOString().slice(0, 10));
  }

  function changeMeasurement(key: string, value: string) {
    if (value && Number(value) < 0) return;
    setValues((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!user || !patientId || !date) return;

    setSaving(true);
    setError("");
    const payload: Record<string, unknown> = {
      evaluation_date: date,
      clinical_notes: notes || null,
    };
    measurementFields.forEach((key) => {
      if (key !== "bmi" && values[key] !== undefined && values[key] !== "") {
        payload[key] = Number(values[key]);
      }
    });
    const bmi = calculateBmi(
      Number(values["weight_kg"]) || null,
      Number(values["height_cm"]) || null,
    );
    payload["bmi"] = bmi;

    const result = await saveEvaluation(user.id, patientId, payload, editingId);
    if (result.error) {
      setError(result.error.message);
    } else {
      const evaluationId = (result.data as BodyEvaluation).id;
      const failedPhotoKeys: string[] = [];
      for (const [key, selected] of Object.entries(draft.files)) {
        const [stage, view] = key.split("-") as [PhotoStage, PhotoView];
        try {
          const photoResult = await savePhoto(user.id, patientId, evaluationId, stage, view, draft.dates[stage], selected.file, draft.captions[key] ?? "");
          if (photoResult.error) failedPhotoKeys.push(key);
        } catch {
          failedPhotoKeys.push(key);
        }
      }
      await loadEvaluations();
      if (failedPhotoKeys.length) {
        const failedFiles = Object.fromEntries(
          Object.entries(draft.files).filter(([key]) => failedPhotoKeys.includes(key)),
        );
        Object.entries(draft.files)
          .filter(([key]) => !failedPhotoKeys.includes(key))
          .forEach(([, selected]) => URL.revokeObjectURL(selected.url));
        setDraft((current) => ({ ...current, files: failedFiles }));
        setEditingId(evaluationId);
        setError(`Avaliação salva, mas estas fotos não foram enviadas: ${failedPhotoKeys.map((key) => {
          const [stage, view] = key.split("-") as [PhotoStage, PhotoView];
          return `${stageLabels[stage]} ${viewLabels[view]}`;
        }).join(", ")}. Tente salvar novamente.`);
      } else {
        resetForm();
      }
    }
    setSaving(false);
  }

  function editEvaluation(item: BodyEvaluation) {
    clearDraftPhotos();
    setEditingId(item.id);
    setDate(item.evaluation_date);
    setNotes(item.clinical_notes ?? "");
    const nextValues: Record<string, string> = {};
    measurementFields.forEach((key) => {
      if (item[key] != null) nextValues[key] = String(item[key]);
    });
    setValues(nextValues);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(item: BodyEvaluation) {
    if (!user || !window.confirm("Excluir esta avaliação e todas as suas fotografias?")) return;

    setError("");
    const result = await deleteEvaluation(user.id, patientId, item.id);
    if (result.error) {
      setError(result.error.message);
      return;
    }
    if (editingId === item.id) resetForm();
    if (openPhotosId === item.id) setOpenPhotosId(null);
    await loadEvaluations();
  }

  return (
    <AdminLayout>
      <PageIntro
        eyebrow="Acompanhamento clínico"
        title="Evolução do Paciente"
        description="Registre medidas corporais, acompanhe tendências e mantenha fotografias comparativas privadas."
      />

      <SectionCard title="Paciente">
        <select
          className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
          value={patientId}
          onChange={(event) => {
            resetForm();
            setPatientId(event.target.value);
            setOpenPhotosId(null);
          }}
        >
          <option value="">Selecione um paciente</option>
          {patients.map((patient) => (
            <option key={patient.id} value={patient.id}>
              {patient.nome}
            </option>
          ))}
        </select>
      </SectionCard>

      {patientId && (
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
          <SectionCard title={editing ? "Editar avaliação" : "Nova avaliação"}>
            <form onSubmit={submit} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="evaluation-date">Data da avaliação *</Label>
                <Input
                  id="evaluation-date"
                  type="date"
                  required
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {measurementFields
                  .filter((key) => key !== "bmi")
                  .map((key) => (
                    <div className="grid gap-1" key={key}>
                      <Label htmlFor={key} className="text-xs">
                        {labels[key]}
                      </Label>
                      <Input
                        id={key}
                        type="number"
                        min="0"
                        step="0.01"
                        value={values[key] ?? ""}
                        onChange={(event) => changeMeasurement(key, event.target.value)}
                      />
                    </div>
                  ))}
              </div>

              <p className="rounded-md bg-slate-50 p-2 text-sm">
                IMC calculado: {calculateBmi(Number(values["weight_kg"]) || null, Number(values["height_cm"]) || null) ?? "—"}
              </p>
              <DraftPhotoRegistry draft={draft} onChange={setDraft} onError={setError} />
              {editing && user && <PhotoRegistry professionalId={user.id} patientId={patientId} evaluation={editing} />}
              <Textarea
                placeholder="Observações clínicas (opcional)"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex gap-2">
                <Button disabled={saving} className="bg-[#2f8f82] hover:bg-[#26796e]">
                  {saving ? "Salvando..." : editing ? "Atualizar" : "Salvar avaliação"}
                </Button>
                {editing && (
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancelar
                  </Button>
                )}
              </div>
            </form>
          </SectionCard>

          <SectionCard title="Histórico">
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.id} className="rounded-lg border border-slate-200 p-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <strong>{new Date(`${item.evaluation_date}T12:00:00`).toLocaleDateString("pt-BR")}</strong>
                    <span className="text-sm text-slate-500">
                      {item.weight_kg ?? "—"} kg · IMC {item.bmi ?? "—"}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button type="button" size="sm" variant="outline" onClick={() => editEvaluation(item)}>
                      <Pencil className="mr-1 h-3.5 w-3.5" />
                      Editar
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setOpenPhotosId(openPhotosId === item.id ? null : item.id)}
                    >
                      <Camera className="mr-1 h-3.5 w-3.5" />
                      {openPhotosId === item.id ? "Fechar fotos" : "Fotos antes e depois"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      onClick={() => void handleDelete(item)}
                    >
                      <Trash2 className="mr-1 h-3.5 w-3.5" />
                      Excluir
                    </Button>
                  </div>

                  {openPhotosId === item.id && user && (
                    <PhotoRegistry
                      professionalId={user.id}
                      patientId={patientId}
                      evaluation={item}
                    />
                  )}
                </div>
              ))}
              {!items.length && (
                <p className="text-sm text-slate-500">Nenhuma avaliação registrada.</p>
              )}
            </div>
          </SectionCard>
        </div>
      )}

      {patientId && <div className="mt-6"><ComparisonSection items={items} /></div>}
    </AdminLayout>
  );
}
