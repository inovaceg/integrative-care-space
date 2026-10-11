import { supabase } from "@/integrations/supabase/client";

export type PatientApplication = {
  id: string;
  patient_id: string;
  profissional_id: string;
  procedure_name: string;
  current_weight_kg: number;
  application_date: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type PatientApplicationInput = {
  patient_id: string;
  profissional_id: string;
  procedure_name: string;
  current_weight_kg: number;
  application_date: string;
  notes: string | null;
};

const fields = "id, patient_id, profissional_id, procedure_name, current_weight_kg, application_date, notes, created_at, updated_at";

export async function fetchPatientApplications(professionalId: string) {
  return supabase
    .from("patient_applications")
    .select(fields)
    .eq("profissional_id", professionalId)
    .order("application_date", { ascending: false })
    .order("created_at", { ascending: false });
}

export async function createPatientApplication(input: PatientApplicationInput) {
  return supabase.from("patient_applications").insert(input).select(fields).single();
}

export async function updatePatientApplication(professionalId: string, applicationId: string, input: Omit<PatientApplicationInput, "profissional_id">) {
  return supabase
    .from("patient_applications")
    .update(input)
    .eq("profissional_id", professionalId)
    .eq("id", applicationId)
    .select(fields)
    .single();
}

export async function deletePatientApplication(professionalId: string, applicationId: string) {
  return supabase
    .from("patient_applications")
    .delete()
    .eq("profissional_id", professionalId)
    .eq("id", applicationId);
}

export async function fetchApplicationPatients(professionalId: string) {
  return supabase
    .from("pacientes")
    .select("id, nome")
    .eq("profissional_id", professionalId)
    .order("nome");
}
