import type { Protocol } from "./types";

export const protocols: Protocol[] = [
  { id: "pro-1", name: "Acolhimento e avaliação inicial", area: "Psicologia", description: "Roteiro de acolhimento para a primeira conversa e levantamento de demanda.", status: "Ativo", updatedAt: "Atualizado há 3 dias", steps: 5 },
  { id: "pro-2", name: "Acompanhamento integrativo", area: "Saúde integrativa", description: "Organização do acompanhamento e registro de evolução entre encontros.", status: "Ativo", updatedAt: "Atualizado há 1 semana", steps: 7 },
  { id: "pro-3", name: "Avaliação neuropsicológica", area: "Neuropsicologia", description: "Etapas administrativas e de acompanhamento da avaliação.", status: "Rascunho", updatedAt: "Editado há 2 semanas", steps: 4 },
  { id: "pro-4", name: "Consulta estética", area: "Biomedicina", description: "Checklist pré e pós-consulta para atendimento estético.", status: "Ativo", updatedAt: "Atualizado há 1 mês", steps: 6 },
];

export const chartData = [
  { month: "Jan", value: 6200 }, { month: "Fev", value: 7800 }, { month: "Mar", value: 7200 },
  { month: "Abr", value: 9100 }, { month: "Mai", value: 10400 }, { month: "Jun", value: 12480 },
];
