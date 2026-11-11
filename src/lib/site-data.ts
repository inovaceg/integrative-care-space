import {
  Activity,
  Brain,
  HeartHandshake,
  Leaf,
  MessageCircleHeart,
  Microscope,
  PersonStanding,
  ScanFace,
  Sparkles,
  Stethoscope,
  Syringe,
  Users,
  type LucideIcon,
} from "lucide-react";

export const whatsappNumber = "5532935027080";
export const whatsappMessage =
  "Olá, gostaria de informações sobre os atendimentos e horários disponíveis.";
export const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`;
export const socialProjectWhatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent("Olá! Gostaria de saber mais sobre o Projeto Social de Atendimento Psicológico realizado nas igrejas.")}`;
export const mapsUrl =
  "https://www.google.com/maps/search/?api=1&query=Rua%20Fernando%20Lobo%2C%20102%2C%20Juiz%20de%20Fora%20MG";

export type Service = { title: string; description: string; icon: LucideIcon };

export const psychologyServices: Service[] = [
  { title: "Psicologia Clínica", description: "Escuta profissional e acompanhamento diante de questões emocionais e comportamentais.", icon: HeartHandshake },
  { title: "Psicoterapia Individual", description: "Processo individual de acolhimento, reflexão e desenvolvimento de recursos pessoais.", icon: MessageCircleHeart },
  { title: "Neuropsicologia", description: "Compreensão das relações entre funções cognitivas, emoções e comportamento.", icon: Brain },
  { title: "Avaliação Psicológica", description: "Processo técnico conduzido com instrumentos e critérios adequados à demanda apresentada.", icon: Microscope },
  { title: "TDAH, TOD e TEA", description: "Avaliação e acompanhamento psicológico conforme as necessidades de cada pessoa.", icon: Brain },
  { title: "Depressão e Ansiedade", description: "Acolhimento e acompanhamento profissional para sofrimento emocional e seus impactos cotidianos.", icon: HeartHandshake },
  { title: "Transtornos de Personalidade", description: "Cuidado psicológico individualizado para padrões emocionais e relacionais persistentes.", icon: PersonStanding },
  { title: "Dependência Química", description: "Acompanhamento psicológico responsável, considerando contexto, vínculos e rede de cuidado.", icon: Users },
  { title: "Sexologia e Relacionamentos", description: "Espaço seguro para questões de sexualidade, intimidade e vínculos afetivos.", icon: MessageCircleHeart },
  { title: "Orientação Familiar", description: "Apoio para famílias compreenderem dinâmicas, limites e possibilidades de diálogo.", icon: Users },
  { title: "Luto, Estresse e Burnout", description: "Acolhimento em períodos de perda, sobrecarga e esgotamento emocional.", icon: Leaf },
  { title: "Autoestima e Compulsões", description: "Acompanhamento voltado à relação consigo, aos hábitos e aos padrões de comportamento.", icon: Sparkles },
];

export const biomedicineServices: Service[] = [
  { title: "Emagrecimento", description: "Protocolos individualizados definidos após avaliação, com foco em saúde e bem-estar.", icon: Activity },
  { title: "Estética Facial", description: "Cuidados estéticos faciais planejados conforme características e objetivos individuais.", icon: ScanFace },
  { title: "Estética Corporal", description: "Procedimentos corporais selecionados com avaliação profissional e expectativas realistas.", icon: PersonStanding },
  { title: "Protocolos para Dores Crônicas", description: "Recursos integrativos complementares avaliados de acordo com cada necessidade.", icon: Stethoscope },
  { title: "Acupuntura", description: "Prática integrativa aplicada após avaliação, considerando bem-estar e contexto individual.", icon: Sparkles },
  { title: "Saúde Integrativa", description: "Estratégias de cuidado que observam hábitos, qualidade de vida e necessidades identificadas.", icon: Leaf },
  { title: "Laserterapia", description: "Uso profissional de recurso fotobiomodulador conforme indicação e avaliação individual.", icon: Activity },
  { title: "ILIB", description: "Técnica de laserterapia apresentada de forma responsável e indicada após avaliação.", icon: Activity },
  { title: "Microagulhamento", description: "Procedimento estético planejado segundo avaliação da pele e objetivos possíveis.", icon: Microscope },
  { title: "Toxina Botulínica", description: "Procedimento estético realizado com planejamento individual e orientação profissional.", icon: Syringe },
  { title: "Protocolos Capilares", description: "Cuidados personalizados para couro cabeludo e fios, definidos após avaliação.", icon: Sparkles },
  { title: "Saúde Sexual", description: "Protocolos de bem-estar sexual dentro das competências da atuação biomédica.", icon: HeartHandshake },
];

export const faqItems = [
  { q: "Preciso de encaminhamento?", a: "Se você tem dúvida sobre a necessidade de encaminhamento para o seu caso, fale com a equipe pelo WhatsApp antes de agendar." },
  { q: "Como funciona a avaliação neuropsicológica?", a: "É um processo profissional para compreender funções cognitivas e a demanda apresentada. A equipe pode explicar as etapas e orientar sobre o agendamento pelo WhatsApp." },
  { q: "Como faço para agendar?", a: "Fale pelo WhatsApp (32) 93502-7080. A equipe informa os horários disponíveis e orienta sobre o atendimento mais adequado à sua procura." },
  { q: "Como funciona a primeira consulta?", a: "O primeiro encontro começa com escuta, passa pela compreensão da demanda e termina com a conversa sobre os próximos passos." },
  { q: "Quais são as áreas de atendimento?", a: "O espaço oferece Psicologia e Saúde Mental, incluindo psicoterapia e avaliação neuropsicológica, além de serviços de Biomedicina em página própria." },
];

export const navItemsBeforeQuestionnaires = [
  ["Início", "/"], ["Sobre", "/sobre"], ["Psicologia", "/psicologia"],
] as const;

export const questionnaireItems = [
  ["Anamnese Psicológica Digital", "/anamnese-psicologica"],
  ["Avaliação Neuropsicológica", "/avaliacao-neuropsicologica"],
  ["Orientação sobre TDAH", "/orientacao-tdah"],
] as const;

export const navItemsAfterQuestionnaires = [
  ["Biomedicina", "/biomedicina"], ["Serviços", "/servicos"], ["Realidade Virtual", "/realidade-virtual"],
  ["Estrutura", "/estrutura"], ["Blog", "/blog"], ["FAQ", "/faq"], ["Contato", "/contato"],
] as const;