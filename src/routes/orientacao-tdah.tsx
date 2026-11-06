import { createFileRoute } from "@tanstack/react-router";
import { PageIntro } from "@/components/page-parts";
import { SiteLayout } from "@/components/site-shell";
import { TdahAssessment } from "@/components/tdah-assessment";
import { createSeoHead } from "@/lib/seo";

export const Route = createFileRoute("/orientacao-tdah")({
  head: () => createSeoHead({ title: "Orientação inicial sobre TDAH | Dr. Frederick", description: "Questionário informativo para organizar uma primeira conversa sobre orientação relacionada ao TDAH.", path: "/orientacao-tdah" }),
  component: Page,
});

function Page() {
  return <SiteLayout minimalHeader><PageIntro tone="psychology" eyebrow="Psicologia • CRP 04/86194" title="Orientação sobre TDAH" text="Um questionário informativo para ajudar a equipe a preparar o primeiro contato. Não gera diagnóstico."/><TdahAssessment/></SiteLayout>;
}
