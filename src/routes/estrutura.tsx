import { createFileRoute } from "@tanstack/react-router";
import { LocationBlock, PageIntro } from "@/components/page-parts";
import { createSeoHead } from "@/lib/seo";
export const Route = createFileRoute("/estrutura")({ head: () => createSeoHead({ title: "Estrutura e Endereço no Centro de Juiz de Fora | Dr. Frederick", description: "Conheça o Espaço de Saúde Integrativa na Rua Fernando Lobo, 102, sala 704, no Centro de Juiz de Fora.", path: "/estrutura" }), component: Page });
function Page(){return <><PageIntro eyebrow="Estrutura" title="Conforto, privacidade e tranquilidade" text="Um espaço pensado para proporcionar uma experiência acolhedora em uma localização central."/><section className="section-space"><div className="container-site"><LocationBlock gallery/></div></section></>}