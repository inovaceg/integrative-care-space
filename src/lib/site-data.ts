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

export const whatsappNumber = "5532991931779";
export const whatsappMessage =
  "Olá! Vim pelo site do Dr. Frederick Parreira e gostaria de informações sobre atendimento.";
export const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`;
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
  { q: "Como faço para agendar?", a: "Entre em contato pelo WhatsApp. A equipe orientará sobre disponibilidade e sobre a área de atendimento adequada à sua procura." },
  { q: "Quais são as áreas de atendimento?", a: "O espaço reúne duas áreas distintas: Psicologia e Saúde Mental, e Biomedicina Integrativa e Estética. Cada atendimento respeita as competências da respectiva profissão." },
  { q: "Onde fica o consultório?", a: "No Edifício Europa Central Tower, Rua Fernando Lobo, 102, sala 704, Centro, Juiz de Fora — MG." },
  { q: "Como funciona a primeira consulta?", a: "A primeira consulta é dedicada à escuta e avaliação da demanda, respeitando as particularidades da área escolhida e de cada pessoa." },
  { q: "Como saber qual atendimento procurar?", a: "Ao entrar em contato, informe apenas a área geral de interesse. Você receberá orientação inicial sem precisar compartilhar informações clínicas sensíveis." },
  { q: "Como entrar em contato?", a: "Pelo WhatsApp (32) 99193-1779 ou pelo formulário da página de contato." },
];

export const navItems = [
  ["Início", "/"], ["Sobre", "/sobre"], ["Psicologia", "/psicologia"],
  ["Biomedicina", "/biomedicina"], ["Serviços", "/servicos"], ["Estrutura", "/estrutura"],
  ["Blog", "/blog"], ["FAQ", "/faq"], ["Contato", "/contato"],
] as const;