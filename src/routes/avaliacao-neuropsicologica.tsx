import { createFileRoute } from "@tanstack/react-router";
import { NeuropsychAssessment } from "@/components/neuropsych-assessment";
import { SiteLayout } from "@/components/site-shell";
import { PageIntro } from "@/components/page-parts";
import { createSeoHead } from "@/lib/seo";

export const Route = createFileRoute("/avaliacao-neuropsicologica")({
  head: () => createSeoHead({ title: "Avaliação Neuropsicológica | Dr. Frederick", description: "Questionário informativo para ajudar a organizar uma primeira conversa sobre avaliação neuropsicológica.", path: "/avaliacao-neuropsicologica" }),
  component: Page,
});

function Page() {
  return <SiteLayout minimalHeader><PageIntro tone="psychology" eyebrow="Psicologia • CRP 04/86194" title="Avaliação Neuropsicológica" text="Uma orientação inicial para ajudar a organizar dúvidas e exemplos antes de conversar com o profissional." /><NeuropsychAssessment /></SiteLayout>;
}
