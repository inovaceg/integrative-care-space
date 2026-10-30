import { supabase } from "@/integrations/supabase/client";

export type MedicationObservationResult = {
  draft: string;
  sources: Array<{ title: string; url: string }>;
  needsMoreInformation: boolean;
};

export async function generateMedicationObservation(input: { name: string; unit: string; additionalDetails: string }) {
  return supabase.functions.invoke<MedicationObservationResult>("medication-observation", { body: input });
}
