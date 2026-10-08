import { createFileRoute } from "@tanstack/react-router";
import { PageIntro, ServiceGrid } from "@/components/page-parts";
import { psychologyServices } from "@/lib/site-data";
import { createSeoHead } from "@/lib/seo";
export const Route = createFileRoute("/psicologia")({
  head: () => createSeoHead({
    title: "Psicologia e Saúde Mental em Juiz de Fora | Dr. Frederick",
    description: "Psicologia clínica, psicoterapia, neuropsicologia e avaliação psicológica com o Dr. Frederick em Juiz de Fora.",
    path: "/psicologia",
  }),
  component: Page,
});
function Page(){return <><PageIntro tone="psychology" eyebrow="Psicologia • CRP 04/86194" title="Psicologia e Saúde Mental" text="Um espaço seguro para compreender emoções, comportamentos, relações e os desafios que fazem parte da sua história."/><section className="section-space"><div className="container-site"><ServiceGrid services={psychologyServices} tone="psychology"/></div></section></>};