import type { Appointment, FinancialEntry, Patient, Protocol } from "./types";

export const appointments: Appointment[] = [
  { id: "apt-1", patientName: "Marina S.", initials: "MS", service: "Psicoterapia individual", date: "Hoje", time: "09:00", duration: "50 min", status: "Confirmado", color: "teal" },
  { id: "apt-2", patientName: "Rafael M.", initials: "RM", service: "Avaliação neuropsicológica", date: "Hoje", time: "10:30", duration: "90 min", status: "Confirmado", color: "blue" },
  { id: "apt-3", patientName: "Beatriz C.", initials: "BC", service: "Retorno integrativo", date: "Hoje", time: "14:00", duration: "50 min", status: "Pendente", color: "amber" },
  { id: "apt-4", patientName: "Lucas A.", initials: "LA", service: "Psicoterapia individual", date: "Hoje", time: "16:00", duration: "50 min", status: "Confirmado", color: "teal" },
  { id: "apt-5", patientName: "Sofia T.", initials: "ST", service: "Consulta de biomedicina", date: "Amanhã", time: "08:30", duration: "60 min", status: "Confirmado", color: "blue" },
];

export const patients: Patient[] = [
  { id: "pac-1", name: "Marina Souza", initials: "MS", age: 34, contact: "(32) 9 0000-0001", lastAppointment: "12 jun 2025", nextAppointment: "Hoje, 09:00", status: "Em acompanhamento", specialty: "Psicologia" },
  { id: "pac-2", name: "Rafael Mendes", initials: "RM", age: 28, contact: "(32) 9 0000-0002", lastAppointment: "10 jun 2025", nextAppointment: "Hoje, 10:30", status: "Em acompanhamento", specialty: "Neuropsicologia" },
  { id: "pac-3", name: "Beatriz Costa", initials: "BC", age: 41, contact: "(32) 9 0000-0003", lastAppointment: "06 jun 2025", nextAppointment: "Hoje, 14:00", status: "Em acompanhamento", specialty: "Biomedicina" },
  { id: "pac-4", name: "Lucas Almeida", initials: "LA", age: 23, contact: "(32) 9 0000-0004", lastAppointment: "29 mai 2025", status: "Em acompanhamento", specialty: "Psicologia" },
  { id: "pac-5", name: "Sofia Teixeira", initials: "ST", age: 37, contact: "(32) 9 0000-0005", lastAppointment: "20 mai 2025", nextAppointment: "Amanhã, 08:30", status: "Primeira consulta", specialty: "Biomedicina" },
  { id: "pac-6", name: "João Ribeiro", initials: "JR", age: 46, contact: "(32) 9 0000-0006", lastAppointment: "14 abr 2025", status: "Inativo", specialty: "Psicologia" },
];

export const protocols: Protocol[] = [
  { id: "pro-1", name: "Acolhimento e avaliação inicial", area: "Psicologia", description: "Roteiro de acolhimento para a primeira conversa e levantamento de demanda.", status: "Ativo", updatedAt: "Atualizado há 3 dias", steps: 5 },
  { id: "pro-2", name: "Acompanhamento integrativo", area: "Saúde integrativa", description: "Organização do acompanhamento e registro de evolução entre encontros.", status: "Ativo", updatedAt: "Atualizado há 1 semana", steps: 7 },
  { id: "pro-3", name: "Avaliação neuropsicológica", area: "Neuropsicologia", description: "Etapas administrativas e de acompanhamento da avaliação.", status: "Rascunho", updatedAt: "Editado há 2 semanas", steps: 4 },
  { id: "pro-4", name: "Consulta estética", area: "Biomedicina", description: "Checklist pré e pós-consulta para atendimento estético.", status: "Ativo", updatedAt: "Atualizado há 1 mês", steps: 6 },
];

export const financialEntries: FinancialEntry[] = [
  { id: "fin-1", description: "Atendimento — Marina S.", category: "Psicoterapia", date: "12 jun 2025", amount: 280, type: "Receita", status: "Recebido" },
  { id: "fin-2", description: "Atendimento — Rafael M.", category: "Neuropsicologia", date: "11 jun 2025", amount: 420, type: "Receita", status: "Pendente" },
  { id: "fin-3", description: "Aluguel da sala", category: "Operacional", date: "10 jun 2025", amount: 1200, type: "Despesa", status: "Pago" },
  { id: "fin-4", description: "Atendimento — Beatriz C.", category: "Biomedicina", date: "09 jun 2025", amount: 350, type: "Receita", status: "Recebido" },
  { id: "fin-5", description: "Materiais de atendimento", category: "Insumos", date: "06 jun 2025", amount: 185, type: "Despesa", status: "Pago" },
];

export const dashboardStats = [
  { label: "Consultas no mês", value: "86", trend: "+12,5%", tone: "teal" as const, note: "vs. mês anterior" },
  { label: "Pacientes ativos", value: "42", trend: "+4", tone: "blue" as const, note: "novos acompanhamentos" },
  { label: "Receita no mês", value: "R$ 12.480", trend: "+8,2%", tone: "amber" as const, note: "vs. mês anterior" },
  { label: "Taxa de retorno", value: "78%", trend: "+3,1%", tone: "violet" as const, note: "últimos 30 dias" },
];

export const chartData = [
  { month: "Jan", value: 6200 }, { month: "Fev", value: 7800 }, { month: "Mar", value: 7200 },
  { month: "Abr", value: 9100 }, { month: "Mai", value: 10400 }, { month: "Jun", value: 12480 },
];
