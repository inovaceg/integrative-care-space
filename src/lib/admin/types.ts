export type AppointmentStatus = "Confirmado" | "Pendente" | "Concluído" | "Cancelado";
export type PatientStatus = "Em acompanhamento" | "Primeira consulta" | "Inativo";
export type ProtocolStatus = "Ativo" | "Rascunho" | "Arquivado";

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

export interface Protocol {
  id: string;
  name: string;
  area: string;
  description: string;
  status: ProtocolStatus;
  updatedAt: string;
  steps: number;
}

export interface FinancialEntry {
  id: string;
  description: string;
  category: string;
  date: string;
  amount: number;
  type: "Receita" | "Despesa";
  status: "Recebido" | "Pendente" | "Pago";
}
