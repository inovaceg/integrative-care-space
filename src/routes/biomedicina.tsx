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
        <div className="container-site">
          <article className="content-card mb-12 p-4 sm:p-6 md:p-8" aria-labelledby="lipo-hd-title">
            <h2 id="lipo-hd-title" className="font-display text-3xl leading-tight md:text-4xl">Lipo HD – Definição Corporal</h2>
            <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground">
              Tecnologia voltada ao contorno corporal, com foco em gordura localizada, flacidez e definição. Conheça o procedimento, suas indicações e benefícios.
            </p>
            <Button asChild className="mt-6">
              <a href={whatsappUrl} target="_blank" rel="noreferrer" onClick={() => trackAnalyticsEvent("whatsapp_click")} aria-label="Saiba mais sobre Lipo HD pelo WhatsApp">
                Saiba mais <ArrowRight className="size-4" />
              </a>
            </Button>
            <img
              src="/images/lipo-hd-definicao-corporal.png"
              alt="Material informativo de Lipo HD – Definição Corporal, com imagens comparativas e apresentação do Dr. Frederick Parreira."
              width={1536}
              height={1024}
              className="mt-8 h-auto w-full rounded-xl"
            />
          </article>
          <ServiceGrid services={biomedicineServices} tone="biomedicine" showLearnMore={false} />
          <div className="content-card mx-auto mt-16 max-w-4xl p-4 sm:p-6">
            <h2 className="font-display text-3xl leading-tight md:text-4xl">Veja um pouco do nosso trabalho</h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
              Conheça um dos momentos de aplicação dos nossos protocolos de Biomedicina Integrativa e Estética.
            </p>
            <div className="mt-6 overflow-hidden rounded-xl bg-secondary">
              <video
                className="aspect-video h-auto w-full"
                controls
                preload="metadata"
                aria-label="Vídeo de aplicação de um protocolo de Biomedicina Integrativa e Estética"
              >
                <source src="/videos/aplicacao-biomedicina.mp4" type="video/mp4" />
                Seu navegador não suporta a reprodução deste vídeo.
              </video>
            </div>
          </div>
          <div className="mt-8 text-sm leading-7 text-muted-foreground">
            <h2 className="font-display text-2xl font-semibold text-foreground">Aplicação de Toxina Botulínica</h2>
            <p className="mt-3">Procedimento realizado pelo Dr. Frederick Parreira, com avaliação individualizada e planejamento dos pontos de aplicação, buscando resultados naturais, harmônicos e adequados às características de cada paciente.</p>
            <p className="mt-3">Cada tratamento é personalizado, e os resultados podem variar de pessoa para pessoa.</p>
          </div>
        </div>
      </section>
    </>
  );
}
