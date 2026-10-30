import { supabase } from "@/integrations/supabase/client";

export type MedicationObservationResult = {
  draft: string;
  sources: Array<{ title: string; url: string }>;
  needsMoreInformation: boolean;
};

export async function generateMedicationObservation(input: { name: string; unit: string; additionalDetails: string }) {
  const result = await supabase.functions.invoke<MedicationObservationResult>("medication-observation", { body: input });
  if (!result.error) return result;

  const response = result.error.context;
  if (response instanceof Response) {
    const payload = await response.clone().json().catch(() => null) as { error?: unknown } | null;
    if (typeof payload?.error === "string") return { data: null, error: new Error(payload.error) };
    if (!response.ok) return { data: null, error: new Error(`A função de IA retornou HTTP ${response.status}.`) };
  }
  return result;
}
