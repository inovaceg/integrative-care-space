import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { PageIntro, ServiceGrid } from "@/components/page-parts";
import { Button } from "@/components/ui/button";
import { biomedicineServices, whatsappUrl } from "@/lib/site-data";
import { trackAnalyticsEvent } from "@/lib/analytics";
import { createSeoHead } from "@/lib/seo";

export const Route = createFileRoute("/biomedicina")({
  head: () => createSeoHead({
    title: "Biomedicina Integrativa e Estética em Juiz de Fora | Dr. Frederick",
    description: "Biomedicina integrativa, estética facial e corporal, acupuntura e laserterapia em Juiz de Fora.",
    path: "/biomedicina",
  }),
  component: Page,
});

function Page() {
  return (
    <>
      <PageIntro
        tone="biomedicine"
        eyebrow="Biomedicina • CRBM 30421"
        title="Biomedicina Integrativa e Estética"
        text="Protocolos individualizados voltados à saúde, estética e bem-estar."
      />
      <section className="section-space">
        <div className="mx-auto w-[calc(100%-2rem)] max-w-[86rem]">
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-primary">TRATAMENTO EM DESTAQUE</p>
          <article className="mb-12 overflow-hidden rounded-2xl border border-primary/15 bg-card shadow-sm md:mb-16" aria-labelledby="lipo-hd-title">
            <div className="px-5 py-3 sm:px-6 sm:py-4 md:flex md:items-center md:justify-between md:gap-8 md:px-8">
              <div className="max-w-3xl">
                <h2 id="lipo-hd-title" className="font-display text-3xl leading-tight md:text-4xl">Lipo HD – Definição Corporal</h2>
                <p className="mt-2 text-base leading-7 text-muted-foreground">
                  Tecnologia voltada ao contorno corporal, com foco em gordura localizada, flacidez e definição. Conheça o procedimento, suas indicações e benefícios.
                </p>
              </div>
              <Button asChild className="mt-3 shrink-0 md:mt-0">
                <a href={whatsappUrl} target="_blank" rel="noreferrer" onClick={() => trackAnalyticsEvent("whatsapp_click")} aria-label="Saiba mais sobre Lipo HD pelo WhatsApp">
                  Saiba mais <ArrowRight className="size-4" />
                </a>
              </Button>
            </div>
            <div className="border-t border-primary/10 bg-primary/[0.03] px-3 py-2 sm:px-5 sm:py-3">
              <img
                src="/images/lipo-hd-definicao-corporal.png"
                alt="Material informativo de Lipo HD – Definição Corporal, com imagens comparativas e apresentação do Dr. Frederick Parreira."
                width={1536}
                height={1024}
                className="mx-auto block h-auto w-full max-w-4xl rounded-lg object-contain"
              />
            </div>
          </article>
          <section aria-labelledby="tratamentos-title">
            <div className="mb-7">
              <h2 id="tratamentos-title" className="font-display text-3xl leading-tight md:text-4xl">Tratamentos e Protocolos</h2>
              <p className="mt-3 text-base leading-7 text-muted-foreground">Conheça as principais áreas de atuação em Biomedicina Integrativa e Estética.</p>
            </div>
            <div className="[&>div]:grid-cols-1 md:[&>div]:grid-cols-2 lg:[&>div]:grid-cols-4">
              <ServiceGrid services={biomedicineServices} tone="biomedicine" showLearnMore={false} />
            </div>
          </section>
          <div className="mt-16 w-full rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6">
            <h2 className="font-display text-3xl leading-tight md:text-4xl">Veja um pouco do nosso trabalho</h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
              Conheça um dos momentos de aplicação dos nossos protocolos de Biomedicina Integrativa e Estética.
            </p>
            <div className="mt-6 overflow-hidden rounded-xl bg-secondary">
              <video
                className="block h-auto w-full"
                controls
                preload="metadata"
                aria-label="Vídeo de aplicação de um protocolo de Biomedicina Integrativa e Estética"
              >
                <source src="/videos/aplicacao-biomedicina.mp4" type="video/mp4" />
                Seu navegador não suporta a reprodução deste vídeo.
              </video>
            </div>
          </div>
          <div className="mx-px mt-8 px-4 text-sm leading-7 text-muted-foreground sm:px-6">
            <h2 className="font-display text-2xl font-semibold text-foreground">Aplicação de Toxina Botulínica</h2>
            <p className="mt-3">Procedimento realizado pelo Dr. Frederick Parreira, com avaliação individualizada e planejamento dos pontos de aplicação, buscando resultados naturais, harmônicos e adequados às características de cada paciente.</p>
            <p className="mt-3">Cada tratamento é personalizado, e os resultados podem variar de pessoa para pessoa.</p>
          </div>
        </div>
      </section>
    </>
  );
}
