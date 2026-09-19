import { supabase } from "@/integrations/supabase/client";

export const measurementFields = [
  "weight_kg",
  "height_cm",
  "bmi",
  "waist_cm",
  "abdomen_cm",
  "hip_cm",
  "chest_cm",
  "right_arm_cm",
  "left_arm_cm",
  "right_thigh_cm",
  "left_thigh_cm",
  "right_calf_cm",
  "left_calf_cm",
  "body_fat_percentage",
  "muscle_mass_kg",
] as const;

export type BodyEvaluation = {
  id: string;
  patient_id: string;
  profissional_id: string;
  evaluation_date: string;
  clinical_notes: string | null;
  weight_kg?: number | null;
  height_cm?: number | null;
  bmi?: number | null;
} & Omit<
  Partial<Record<(typeof measurementFields)[number], number | null>>,
  "weight_kg" | "height_cm" | "bmi"
>;

export type PhotoStage = "before" | "after";
export type PhotoView = "front" | "side" | "back";

export type ProgressPhoto = {
  id: string;
  evaluation_id: string;
  patient_id: string;
  profissional_id: string;
  stage: PhotoStage;
  view: PhotoView;
  record_date: string;
  storage_path: string;
  caption: string | null;
  url?: string;
};

const photoBucket = "body-progress-photos";
const validPhotoTypes = ["image/jpeg", "image/png", "image/webp"];

function evaluationQuery(professionalId: string) {
  return supabase
    .from("body_evaluations")
    .select("*")
    .eq("profissional_id", professionalId);
}

function photoPathPrefix(professionalId: string, patientId: string, evaluationId: string) {
  return `${professionalId}/${patientId}/${evaluationId}/`;
}

function assertScopedPhotoPath(
  professionalId: string,
  patientId: string,
  evaluationId: string,
  path: string,
) {
  if (!path.startsWith(photoPathPrefix(professionalId, patientId, evaluationId))) {
    throw new Error("Caminho de foto inválido.");
  }
}

export async function fetchBodyPatients(professionalId: string) {
  return supabase
    .from("pacientes")
    .select("id,nome")
    .eq("profissional_id", professionalId)
    .order("nome");
}

export async function fetchEvaluations(professionalId: string, patientId: string) {
  return evaluationQuery(professionalId)
    .eq("patient_id", patientId)
    .order("evaluation_date", { ascending: false });
}

export async function saveEvaluation(
  professionalId: string,
  patientId: string,
  values: Record<string, unknown>,
  id?: string,
) {
  const payload = {
    ...values,
    patient_id: patientId,
    profissional_id: professionalId,
  };

  if (id) {
    return supabase
      .from("body_evaluations")
      .update(payload)
      .eq("id", id)
      .eq("patient_id", patientId)
      .eq("profissional_id", professionalId)
      .select()
      .single();
  }

  return supabase.from("body_evaluations").insert(payload).select().single();
}

export async function deleteEvaluation(
  professionalId: string,
  patientId: string,
  evaluationId: string,
) {
  const photos = await listPhotos(professionalId, patientId, evaluationId);
  if (photos.error) return { error: photos.error };

  const paths = ((photos.data ?? []) as ProgressPhoto[]).map((photo) => photo.storage_path);
  paths.forEach((path) =>
    assertScopedPhotoPath(professionalId, patientId, evaluationId, path),
  );

  if (paths.length) {
    const removed = await supabase.storage.from(photoBucket).remove(paths);
    if (removed.error) return { error: removed.error };
  }

  return supabase
    .from("body_evaluations")
    .delete()
    .eq("id", evaluationId)
    .eq("patient_id", patientId)
    .eq("profissional_id", professionalId);
}

export async function listPhotos(
  professionalId: string,
  patientId: string,
  evaluationId: string,
) {
  return supabase
    .from("body_progress_photos")
    .select("*")
    .eq("profissional_id", professionalId)
    .eq("patient_id", patientId)
    .eq("evaluation_id", evaluationId);
}

export async function signedPhoto(
  professionalId: string,
  patientId: string,
  evaluationId: string,
  path: string,
) {
  assertScopedPhotoPath(professionalId, patientId, evaluationId, path);
  return supabase.storage.from(photoBucket).createSignedUrl(path, 3600);
}

export async function savePhoto(
  professionalId: string,
  patientId: string,
  evaluationId: string,
  stage: PhotoStage,
  view: PhotoView,
  recordDate: string,
  file: File,
  caption: string,
) {
  if (!recordDate) throw new Error("Informe a data do registro fotográfico.");
  if (!validPhotoTypes.includes(file.type) || file.size > 15 * 1024 * 1024) {
    throw new Error("A foto deve ser JPEG, PNG ou WebP e ter no máximo 15 MB.");
  }

  const extension = (file.type.split("/")[1] ?? "jpg").replace("jpeg", "jpg");
  const path = `${photoPathPrefix(professionalId, patientId, evaluationId)}${stage}-${view}-${crypto.randomUUID()}.${extension}`;
  const existing = await supabase
    .from("body_progress_photos")
    .select("id,storage_path")
    .eq("profissional_id", professionalId)
    .eq("patient_id", patientId)
    .eq("evaluation_id", evaluationId)
    .eq("stage", stage)
    .eq("view", view)
    .maybeSingle();

  if (existing.error) throw existing.error;

  const upload = await supabase.storage.from(photoBucket).upload(path, file, {
    contentType: file.type,
  });
  if (upload.error) throw upload.error;

  const saved = await supabase
    .from("body_progress_photos")
    .upsert(
      {
        ...(existing.data?.id ? { id: existing.data.id } : {}),
        profissional_id: professionalId,
        patient_id: patientId,
        evaluation_id: evaluationId,
        stage,
        view,
        record_date: recordDate,
        storage_path: path,
        caption: caption || null,
      },
      { onConflict: "evaluation_id,stage,view" },
    )
    .select()
    .single();

  if (saved.error) {
    await supabase.storage.from(photoBucket).remove([path]);
    throw saved.error;
  }

  if (existing.data?.storage_path) {
    assertScopedPhotoPath(
      professionalId,
      patientId,
      evaluationId,
      existing.data.storage_path,
    );
    await supabase.storage.from(photoBucket).remove([existing.data.storage_path]);
  }

  return saved;
}

export async function removePhoto(
  professionalId: string,
  patientId: string,
  evaluationId: string,
  id: string,
  path: string,
) {
  assertScopedPhotoPath(professionalId, patientId, evaluationId, path);

  const removedObject = await supabase.storage.from(photoBucket).remove([path]);
  if (removedObject.error) return removedObject;

  return supabase
    .from("body_progress_photos")
    .delete()
    .eq("id", id)
    .eq("profissional_id", professionalId)
    .eq("patient_id", patientId)
    .eq("evaluation_id", evaluationId);
}

export function calculateBmi(weight: number | null, heightCm: number | null) {
  return weight && heightCm
    ? Number((weight / (heightCm / 100) ** 2).toFixed(2))
    : null;
}
