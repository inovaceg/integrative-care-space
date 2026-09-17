import { createFileRoute } from "@tanstack/react-router";
import { FaqList, PageIntro } from "@/components/page-parts";
import { createSeoHead } from "@/lib/seo";
export const Route = createFileRoute("/faq")({ head: () => createSeoHead({ title: "FAQ sobre Atendimento em Juiz de Fora | Dr. Frederick", description: "Confira respostas sobre agendamento, áreas de atendimento, primeira consulta e localização em Juiz de Fora.", path: "/faq" }), component: Page });
function Page(){return <><PageIntro eyebrow="FAQ" title="Perguntas frequentes" text="Informações objetivas para facilitar seu primeiro contato com o espaço."/><section className="section-space"><div className="container-site"><FaqList/></div></section></>}