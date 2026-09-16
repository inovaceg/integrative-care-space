export type AppointmentStatus = "Confirmado" | "Pendente" | "Concluído" | "Cancelado";
export type PatientStatus = "Em acompanhamento" | "Primeira consulta" | "Inativo";
export type FinancialTransactionType = "income" | "expense";
export type FinancialEntryStatus = "pending" | "paid" | "received";
export type MedicationUnit = "unit" | "box" | "bottle";
export type MedicationMovementType = "entry" | "exit";

export interface FinancialEntry {
  id: string;
  user_id: string;
  description: string;
  category: string;
  transaction_type: FinancialTransactionType;
  amount: number;
  transaction_date: string;
  status: FinancialEntryStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Appointment {
  id: string;
  patientName: string;
  initials: string;
  service: string;
  date: string;
  time: string;
  duration: string;
  status: AppointmentStatus;
  color: "teal" | "blue" | "amber";
}

export interface Patient {
  id: string;
  name: string;
  initials: string;
  age: number;
  contact: string;
  lastAppointment: string;
  nextAppointment?: string;
  status: PatientStatus;
  specialty: string;
}

export interface MedicationRecord {
  id: string;
  user_id: string;
  name: string;
  unit: MedicationUnit;
  supplier: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface MedicationMovementRecord {
  id: string;
  medication_id: string;
  user_id: string;
  movement_type: MedicationMovementType;
  quantity: number;
  batch: string | null;
  expiration_date: string | null;
  movement_date: string;
  notes: string | null;
  created_at: string;
}
