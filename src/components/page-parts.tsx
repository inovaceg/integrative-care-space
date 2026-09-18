import { Link } from "@tanstack/react-router";
import { ArrowRight, Check, Image, MapPin, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { trackAnalyticsEvent } from "@/lib/analytics";
import { biomedicineServices, faqItems, mapsUrl, type Service, whatsappUrl } from "@/lib/site-data";

export function Eyebrow({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "psychology" | "biomedicine" }) {
  return <p className={`eyebrow eyebrow-${tone}`}>{children}</p>;
}

export function PageIntro({ eyebrow, title, text, tone = "neutral", backgroundImage }: { eyebrow: string; title: string; text: string; tone?: "neutral" | "psychology" | "biomedicine"; backgroundImage?: string }) {
  return (
    <section className={`page-intro page-intro-${tone} relative overflow-hidden`}>
      {backgroundImage && <><img src={backgroundImage} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover opacity-20" /><div className="absolute inset-0 bg-gradient-to-br from-background/90 via-background/75 to-background/55" aria-hidden="true" /></>}
      <div className="relative z-10 mx-auto w-[calc(100%-2rem)] py-8 md:py-12">
        <div className="flex w-full flex-col justify-center rounded-2xl bg-background/90 p-6 shadow-lg backdrop-blur-sm md:p-8">
          <Eyebrow tone={tone}>{eyebrow}</Eyebrow>
          <h1 className="mt-4 text-balance break-words font-display text-3xl leading-tight sm:text-4xl md:text-5xl">{title}</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground md:text-lg md:leading-8">{text}</p>
        </div>
      </div>
    </section>
  );
}

export function ServiceGrid({ services, tone, showLearnMore = true }: { services: Service[]; tone: "psychology" | "biomedicine"; showLearnMore?: boolean }) {
  const toneClass = tone === "psychology" ? "service-card-psychology" : "service-card-biomedicine";
  return <div className="card-grid">{services.map((service) => { const Icon = service.icon; return <article key={service.title} className={`service-card ${toneClass}`}><div className="card-topline"><span className="service-icon"><Icon /></span><span className="card-index" aria-hidden="true">+</span></div><h2 className="card-title mt-7">{service.title}</h2><p className="mt-4 min-h-20 text-sm leading-6 text-muted-foreground">{service.description}</p>{showLearnMore && <a href={whatsappUrl} target="_blank" rel="noreferrer" onClick={() => trackAnalyticsEvent("whatsapp_click")} className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-primary">Saiba mais <ArrowRight className="size-4" /></a>}</article>; })}</div>;
}

export function AreaCards() {
  const psychList = ["Psicologia clínica", "Psicoterapia individual", "Neuropsicologia", "Avaliação psicológica", "TDAH, TOD e TEA", "Depressão e ansiedade", "Transtornos de personalidade", "Dependência química", "Sexologia e relacionamentos", "Orientação familiar", "Luto, estresse e burnout", "Autoestima e compulsões"];
  const bioList = ["Emagrecimento", "Estética corporal e facial", "Protocolo para dores crônicas", "Acupuntura", "Injetáveis personalizados", "Imunidade e bem-estar", "Laserterapia e ILIB", "Microagulhamento", "Botox", "Protocolo capilar", "Protocolo sexual", "Protocolo Picadinha do Amor"];
  return <div className="grid gap-5 lg:grid-cols-2"><AreaCard tone="psychology" title="Psicologia e Saúde Mental" items={psychList} to="/psicologia" button="Conheça Psicologia e Saúde Mental" image="/psicologia.png" imageAlt="Dr. Frederick Parreira em atendimento de Psicologia e Saúde Mental." /><AreaCard tone="biomedicine" title="Biomedicina Integrativa e Estética" items={bioList} to="/biomedicina" button="Conheça Biomedicina Integrativa" image="/biomedicina.png" imageAlt="Dr. Frederick Parreira em atendimento de Biomedicina Integrativa e Estética." /></div>;
}

function AreaCard({ tone, title, items, to, button, image, imageAlt }: { tone: "psychology" | "biomedicine"; title: string; items: string[]; to: "/psicologia" | "/biomedicina"; button: string; image?: string; imageAlt?: string }) {
  const cardClass = tone === "psychology" ? "area-card area-card-psychology" : "area-card area-card-biomedicine";
  return <article className={cardClass}>{image && <img src={image} alt={imageAlt} loading="lazy" width={1024} height={1024} className="area-card-image" />}<div className="card-topline"><span className="text-xs font-bold uppercase tracking-[0.2em]">Área de atuação</span><span className="card-index" aria-hidden="true">+</span></div><h3 className="card-title mt-6 max-w-xl">{title}</h3><ul className="mt-8 grid gap-x-6 gap-y-3 sm:grid-cols-2">{items.map((item) => <li key={item} className="flex gap-2 text-sm leading-5"><Check className="mt-0.5 size-4 shrink-0 rounded-full bg-primary p-0.5 text-primary-foreground" />{item}</li>)}</ul><Link to={to} className="area-card-cta"><span>{button}</span><ArrowRight className="size-5 shrink-0" /></Link></article>;
}

export function Steps() {
  const steps = [["01", "Agendamento", "Entre em contato pelo WhatsApp e escolha o atendimento desejado."], ["02", "Avaliação", "Realização de avaliação individual conforme a área e a necessidade apresentada."], ["03", "Plano individualizado", "Definição da estratégia de acompanhamento ou procedimento de acordo com a avaliação profissional."], ["04", "Acompanhamento", "Evolução acompanhada de forma individualizada ao longo do atendimento."]];
  return <div className="steps-grid">{steps.map(([n, title, text]) => <article key={n} className="content-card"><div className="card-topline"><span className="card-number">{n}</span><span className="size-2 rounded-full bg-primary" /></div><h3 className="card-title mt-8">{title}</h3><p className="mt-4 text-sm leading-6 text-muted-foreground">{text}</p></article>)}</div>;
}

export function FaqList() {
  return <Accordion type="single" collapsible className="mx-auto max-w-3xl">{faqItems.map((item, i) => <AccordionItem key={item.q} value={`faq-${i}`}><AccordionTrigger className="py-6 text-left text-base md:text-lg">{item.q}</AccordionTrigger><AccordionContent className="pr-8 text-base leading-7 text-muted-foreground">{item.a}</AccordionContent></AccordionItem>)}</Accordion>;
}

export function LocationBlock({ gallery = false }: { gallery?: boolean }) {
  return <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]"><div><Eyebrow>Localização</Eyebrow><h2 className="mt-4 font-display text-4xl">Um espaço no centro de Juiz de Fora</h2><address className="mt-6 not-italic leading-8 text-muted-foreground"><strong className="text-foreground">Espaço de Saúde Integrativa</strong><br />Dr. Frederick Parreira<br />Edifício Europa Central Tower<br />Rua Fernando Lobo, 102 — Sala 704<br />Centro — Juiz de Fora/MG</address><p className="mt-4 text-sm font-semibold">Agendamentos: <a href="tel:+5532991931779">(32) 99193-1779</a></p><div className="mt-7 flex flex-wrap gap-3"><Button asChild><a href={whatsappUrl} target="_blank" rel="noreferrer" onClick={() => trackAnalyticsEvent("whatsapp_click")}><MessageCircle /> Falar pelo WhatsApp</a></Button><Button asChild variant="outline"><a href={mapsUrl} target="_blank" rel="noreferrer"><MapPin /> Como chegar</a></Button></div></div><iframe title="Mapa da localização do Espaço de Saúde Integrativa" loading="lazy" className="content-card h-[420px] w-full p-0" src="https://www.google.com/maps?q=Rua%20Fernando%20Lobo%20102%20Juiz%20de%20Fora%20MG&output=embed" referrerPolicy="no-referrer-when-downgrade" />{gallery && <div className="lg:col-span-2"><h2 className="font-display text-3xl">Conheça a estrutura</h2><div className="card-grid mt-6">{["Recepção", "Consultório", "Sala de atendimento", "Estrutura"].map((label) => <div key={label} className="content-card grid aspect-[4/3] place-items-center border-dashed"><div className="text-center text-muted-foreground"><Image className="mx-auto size-7 text-primary" /><h3 className="card-title mt-4 text-xl">{label}</h3><span className="mt-2 block text-sm">Foto em breve</span></div></div>)}</div></div>}</div>;
}