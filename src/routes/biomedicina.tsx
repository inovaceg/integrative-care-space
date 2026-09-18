import { createFileRoute } from "@tanstack/react-router";
import { PageIntro, ServiceGrid } from "@/components/page-parts";
import { biomedicineServices } from "@/lib/site-data";
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
