import { createFileRoute } from "@tanstack/react-router";
import { PageIntro, ServiceGrid } from "@/components/page-parts";
import { biomedicineServices } from "@/lib/site-data";

export const Route = createFileRoute("/biomedicina")({
  head: () => ({
    meta: [
      { title: "Biomedicina Integrativa em Juiz de Fora" },
      { name: "description", content: "Biomedicina integrativa, estética, acupuntura, laserterapia e ILIB em Juiz de Fora." },
      { property: "og:title", content: "Biomedicina Integrativa e Estética" },
      { property: "og:description", content: "Protocolos individualizados voltados à saúde, estética e bem-estar." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "/biomedicina" }],
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
          <ServiceGrid services={biomedicineServices} tone="biomedicine" />
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
          <p className="mt-8 text-sm leading-6 text-muted-foreground">
            Para registros em vídeo, recomendamos autorização prévia para uso de imagem. A indicação e a possibilidade de cada procedimento dependem de avaliação profissional. Não há promessa de cura ou garantia de resultados.
          </p>
        </div>
      </section>
    </>
  );
}
