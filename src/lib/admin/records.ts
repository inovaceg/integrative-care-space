import { supabase } from "@/integrations/supabase/client";
import type { FinancialEntryStatus, FinancialTransactionType } from "@/lib/admin/types";

export type PatientRecord = {
  id: string;
  profissional_id: string;
  nome: string;
  data_nascimento: string | null;
  email: string | null;
  telefone: string | null;
  status: string | null;
  cpf: string | null;
  cidade_estado: string | null;
  cep: string | null;
  endereco: string | null;
  numero: string | null;
  complemento: string | null;
  cidade: string | null;
  estado: string | null;
  nome_social: string | null;
  genero: string | null;
  pronomes: string | null;
  como_conheceu: string | null;
};

export type PatientInput = Omit<PatientRecord, "id" | "profissional_id">;
export type PatientOption = Pick<PatientRecord, "id" | "nome">;

export type AppointmentRecord = {
  id: string;
  patient_id: string;
  doctor_id: string | null;
  start_time: string;
  end_time: string | null;
  status: string;
  notes: string | null;
  payment_status: string | null;
  amount_paid: number | null;
  payment_date: string | null;
  due_date: string | null;
};

const patientFields = "id, profissional_id, nome, data_nascimento, email, telefone, status, cpf, cidade_estado, cep, endereco, numero, complemento, cidade, estado, nome_social, genero, pronomes, como_conheceu";
const patientListFields = "id, profissional_id, nome, data_nascimento, email, telefone, status";
const appointmentFields = "id, patient_id, doctor_id, start_time, end_time, status, notes, payment_status, amount_paid, payment_date, due_date";

export async function fetchPatients(userId: string) {
  return supabase.from("pacientes").select(patientListFields).eq("profissional_id", userId).order("nome");
}

export async function fetchPatientOptions(userId: string) {
  return supabase.from("pacientes").select("id, nome").eq("profissional_id", userId).order("nome");
}

export async function fetchPatient(userId: string, patientId: string) {
  return supabase.from("pacientes").select(patientFields).eq("profissional_id", userId).eq("id", patientId).maybeSingle();
}

export async function createPatient(userId: string, input: PatientInput) {
  return supabase.from("pacientes").insert({ ...input, profissional_id: userId }).select(patientFields).single();
}

export async function updatePatient(userId: string, patientId: string, input: PatientInput) {
  return supabase.from("pacientes").update(input).eq("profissional_id", userId).eq("id", patientId).select(patientFields).single();
}

export async function deletePatient(userId: string, patientId: string) {
  return supabase.from("pacientes").delete().eq("profissional_id", userId).eq("id", patientId);
}

export async function fetchAppointments(userId: string) {
  return supabase.from("appointments").select(appointmentFields).eq("doctor_id", userId).order("start_time");
}

export async function createAppointment(userId: string, input: Omit<AppointmentRecord, "id" | "doctor_id">) {
  return supabase.from("appointments").insert({ ...input, doctor_id: userId }).select(appointmentFields).single();
}

export async function updateAppointmentStatus(userId: string, appointmentId: string, status: string) {
  return supabase.from("appointments").update({ status }).eq("doctor_id", userId).eq("id", appointmentId).select(appointmentFields).single();
}

export async function deleteAppointment(userId: string, appointmentId: string) {
  return supabase.from("appointments").delete().eq("doctor_id", userId).eq("id", appointmentId);
}

export type FinancialEntryInput = {
  description: string;
  category: string;
  transaction_type: FinancialTransactionType;
  amount: number;
  transaction_date: string;
  status: FinancialEntryStatus;
  notes: string | null;
};

const financialEntryFields = "id, user_id, description, category, transaction_type, amount, transaction_date, status, notes, created_at, updated_at";

export async function fetchFinancialEntries(userId: string) {
  return supabase.from("financial_entries").select(financialEntryFields).eq("user_id", userId).order("transaction_date", { ascending: false }).order("created_at", { ascending: false });
}

export async function createFinancialEntry(userId: string, input: FinancialEntryInput) {
  return supabase.from("financial_entries").insert({ ...input, user_id: userId }).select(financialEntryFields).single();
}

export async function updateFinancialEntry(userId: string, entryId: string, input: FinancialEntryInput) {
  return supabase.from("financial_entries").update(input).eq("user_id", userId).eq("id", entryId).select(financialEntryFields).single();
}

export async function deleteFinancialEntry(userId: string, entryId: string) {
  return supabase.from("financial_entries").delete().eq("user_id", userId).eq("id", entryId);
}
