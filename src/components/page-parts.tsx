import { Link } from "@tanstack/react-router";
import { ArrowRight, Check, HeartHandshake, Image, MapPin, MessageCircle, Shield, Sparkles, Star, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { trackAnalyticsEvent, trackAnalyticsEvents } from "@/lib/analytics";
import { biomedicineServices, faqItems, mapsUrl, socialProjectWhatsappUrl, type Service, whatsappUrl } from "@/lib/site-data";

export function Eyebrow({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "psychology" | "biomedicine" }) {
  return <p className={`eyebrow eyebrow-${tone}`}>{children}</p>;
}

export function PageIntro({ eyebrow, title, text, tone = "neutral", backgroundImage }: { eyebrow: string; title: string; text: string; tone?: "neutral" | "psychology" | "biomedicine"; backgroundImage?: string }) {
  return (
    <section className={`page-intro page-intro-${tone} relative overflow-hidden`}>
      {backgroundImage && <><img src={backgroundImage} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover opacity-15" /><div className="absolute inset-0 bg-gradient-to-br from-background/95 via-background/85 to-background/60" aria-hidden="true" /></>}
      <div className="relative z-10 mx-auto w-[calc(100%-2rem)] py-10 md:py-14">
        <div className="flex w-full flex-col justify-center rounded-2xl bg-background/95 p-7 shadow-xl backdrop-blur-sm md:p-10">
          <Eyebrow tone={tone}>{eyebrow}</Eyebrow>
          <h1 className="mt-5 text-balance break-words font-display text-3xl leading-tight sm:text-4xl md:text-5xl lg:text-6xl">{title}</h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground md:text-lg md:leading-8">{text}</p>
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
  const bioList = ["Emagrecimento", "Estética facial", "Estética corporal", "Protocolos para dores crônicas", "Acupuntura", "Saúde integrativa", "Laserterapia", "ILIB", "Microagulhamento", "Toxina botulínica", "Protocolos capilares", "Saúde sexual"];
  return <div className="grid gap-6 lg:grid-cols-2"><AreaCard tone="psychology" title="Psicologia e Saúde Mental" items={psychList} to="/psicologia" button="Conheça a Psicologia" image="/psicologia.png" imageAlt="Dr. Frederick Parreira em atendimento de Psicologia e Saúde Mental." /><AreaCard tone="biomedicine" title="Biomedicina Integrativa e Estética" items={bioList} to="/biomedicina" button="Conheça a Biomedicina" image="/assets/biomedicina-atendimento.png" imageAlt="Atendimento de Biomedicina Estética em consultório." /></div>;
}

function AreaCard({ tone, title, items, to, button, image, imageAlt }: { tone: "psychology" | "biomedicine"; title: string; items: string[]; to: "/psicologia" | "/biomedicina"; button: string; image?: string; imageAlt?: string }) {
  const cardClass = tone === "psychology" ? "area-card area-card-psychology" : "area-card area-card-biomedicine";
  const accentColor = tone === "psychology" ? "border-psychology" : "border-biomedicine";
  return (
    <article className={cardClass}>
      {image && <img src={image} alt={imageAlt} loading="lazy" width={1024} height={1024} className="area-card-image" />}
      <div className="card-topline">
        <span className="text-xs font-bold uppercase tracking-[0.2em]">Área de atuação</span>
        <span className="card-index" aria-hidden="true">+</span>
      </div>
      <h3 className="card-title mt-6 max-w-xl">{title}</h3>
      <ul className="mt-8 grid gap-x-6 gap-y-3 sm:grid-cols-2">
        {items.map((item) => <li key={item} className="flex gap-2 text-sm leading-5"><Check className={`mt-0.5 size-4 shrink-0 rounded-full p-0.5 ${accentColor} text-primary-foreground`} />{item}</li>)}
      </ul>
      <Link to={to} className="area-card-cta"><span>{button}</span><ArrowRight className="size-5 shrink-0" /></Link>
    </article>
  );
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

export function IdentificationSection() {
  return (
    <section className="section-space bg-background">
      <div className="container-site">
        <div className="mx-auto max-w-3xl text-center">
          <Eyebrow>Identificação</Eyebrow>
          <h2 className="mt-4 font-display text-4xl md:text-5xl">Um cuidado que começa por compreender você.</h2>
          <p className="mt-6 text-lg leading-8 text-muted-foreground">
            Cada pessoa chega com uma história, uma necessidade e um objetivo diferente. Por isso, o atendimento começa pela escuta e por uma avaliação individualizada, permitindo construir uma proposta de cuidado compatível com cada momento.
          </p>
        </div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Users, title: "Atendimento individualizado", text: "Cada acompanhamento é planejado considerando as necessidades identificadas na avaliação." },
            { icon: HeartHandshake, title: "Escuta e acolhimento", text: "Espaço seguro para compartilhar sua história com respeito e sem julgamentos." },
            { icon: Shield, title: "Avaliação profissional", text: "Processo técnico conduzido com instrumentos e critérios adequados à demanda apresentada." },
            { icon: Sparkles, title: "Cuidado integrado", text: "Diferentes possibilidades de cuidado, respeitando as competências de cada área profissional." },
          ].map(({ icon: Icon, title, text }, index) => (
            <article key={title} className="content-card text-center">
              <div className="mx-auto size-12 rounded-xl bg-primary/10 grid place-items-center text-primary"><Icon className="size-6" /></div>
              <h3 className="card-title mt-6">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function SocialProjectSection() {
  return (
    <section className="section-space bg-primary text-primary-foreground">
      <div className="container-site">
        <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_.9fr]">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-soft">Projeto social</p>
            <h2 className="mt-4 max-w-3xl font-display text-4xl font-semibold leading-tight md:text-5xl">Atendimento Psicológico Social</h2>
            <p className="mt-6 max-w-2xl text-base leading-8 text-primary-foreground/90 md:text-lg">
              Acreditamos que o acesso à saúde mental é um direito de todos. Por isso, o Dr. Frederick Parreira mantém um projeto social realizado em parceria com igrejas, levando atendimento psicológico de qualidade a pessoas e famílias em situação de vulnerabilidade social e emocional.
            </p>
            <p className="mt-4 max-w-2xl text-base leading-8 text-primary-foreground/90 md:text-lg">
              O projeto une ética, sigilo e ciência a um espaço de acolhimento sem julgamentos, com o propósito de tornar o cuidado psicológico mais acessível.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button asChild size="lg" className="bg-gold text-gold-foreground hover:bg-gold/90">
                <a href={socialProjectWhatsappUrl} target="_blank" rel="noreferrer" onClick={() => trackAnalyticsEvent("whatsapp_click")}>
                  Quero saber mais sobre o projeto <ArrowRight className="size-4" />
                </a>
              </Button>
              <span className="text-sm text-primary-foreground/75">Consulte a igreja participante mais próxima.</span>
            </div>
          </div>
          <div className="rounded-3xl border border-primary-foreground/15 bg-primary-foreground/10 p-5 backdrop-blur-sm md:p-7">
            <img src="/assets/church-social-project.jpg" alt="Ilustração de uma igreja parceira do projeto social" className="h-56 w-full rounded-2xl object-cover object-center md:h-64" loading="lazy" />
            <h3 className="mt-6 font-display text-2xl font-semibold">Cuidado que chega até a comunidade</h3>
            <p className="mt-4 leading-7 text-primary-foreground/80">O atendimento é organizado junto às igrejas parceiras, aproximando a Psicologia de quem precisa de acolhimento e orientação.</p>
            <div className="mt-7 grid gap-4 border-t border-primary-foreground/15 pt-6 text-sm text-primary-foreground/85 sm:grid-cols-2 lg:grid-cols-1">
              <span className="flex gap-3"><HeartHandshake className="size-5 shrink-0 text-gold-soft" /> Escuta humanizada e sem julgamentos</span>
              <span className="flex gap-3"><Shield className="size-5 shrink-0 text-gold-soft" /> Sigilo e ética profissional</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function ProfessionalSection() {
  return (
    <section className="section-space bg-muted/30">
      <div className="container-site grid items-center gap-10 lg:grid-cols-[1.1fr_1fr]">
        <div className="aspect-[4/5] overflow-hidden bg-secondary rounded-2xl">
          <img src="/dr-frederick-parreira.png" alt="Dr. Frederick Parreira — Psicólogo e Biomédico" loading="lazy" className="h-full w-full object-cover" />
        </div>
        <div>
          <Eyebrow>Profissional</Eyebrow>
          <h2 className="mt-4 font-display text-4xl md:text-5xl">Conheça o Dr. Frederick Parreira</h2>
          <div className="mt-6 space-y-4 leading-7 text-muted-foreground">
            <p>Dr. Frederick Parreira atua nas áreas de Psicologia e Biomedicina, desenvolvendo um trabalho direcionado à saúde mental, saúde integrativa, estética e bem-estar.</p>
            <p>Sua proposta de atendimento parte de uma visão ampla do indivíduo, respeitando as particularidades e os limites de cada área profissional.</p>
            <p>No Espaço de Saúde Integrativa, cada atendimento é conduzido de forma individualizada, buscando unir conhecimento técnico, escuta, acolhimento e acompanhamento profissional.</p>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="border-l-2 border-psychology pl-5">
              <strong className="text-foreground">Psicólogo</strong>
              <span className="block text-sm text-muted-foreground">CRP 04/86194</span>
            </div>
            <div className="border-l-2 border-biomedicine pl-5">
              <strong className="text-foreground">Biomédico</strong>
              <span className="block text-sm text-muted-foreground">CRBM 30421</span>
            </div>
          </div>
          <Button asChild variant="outline" className="mt-8"><Link to="/sobre">Conheça minha trajetória <ArrowRight /></Link></Button>
        </div>
      </div>
    </section>
  );
}

export function ServicesSection() {
  return (
    <section className="section-space">
      <div className="container-site">
        <div className="text-center">
          <Eyebrow>Serviços</Eyebrow>
          <h2 className="mt-4 font-display text-4xl md:text-5xl">Áreas de atuação e serviços</h2>
          <p className="mt-4 max-w-2xl mx-auto text-base leading-7 text-muted-foreground">Conheça os serviços disponíveis em cada área. Cada atendimento é definido após avaliação profissional.</p>
        </div>
        <div className="mt-12">
          <AreaCards />
        </div>
      </div>
    </section>
  );
}

export function SpaceSection() {
  return (
    <section className="section-space bg-background">
      <div className="container-site">
        <div className="mx-auto max-w-3xl text-center">
          <Eyebrow>Estrutura</Eyebrow>
          <h2 className="mt-4 font-display text-4xl md:text-5xl">Um espaço pensado para acolher você.</h2>
          <p className="mt-6 text-lg leading-8 text-muted-foreground">
            Cada detalhe foi pensado para proporcionar privacidade, conforto e tranquilidade durante o atendimento.
          </p>
        </div>
        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          <div className="aspect-[4/3] overflow-hidden rounded-2xl bg-secondary">
            <img src="/estrutura.png" alt="Estrutura do Espaço de Saúde Integrativa" loading="lazy" className="h-full w-full object-cover" />
          </div>
          <div className="aspect-[4/3] overflow-hidden rounded-2xl bg-secondary">
            <img src="/consultorio.png" alt="Consultório do Dr. Frederick Parreira" loading="lazy" className="h-full w-full object-cover" />
          </div>
        </div>
        <p className="mt-6 text-center text-sm text-muted-foreground">Imagens ilustrativas do ambiente. A estrutura real pode variar.</p>
      </div>
    </section>
  );
}

export function TestimonialsSection() {
  return (
    <section className="section-space border-y border-border bg-muted/30">
      <div className="container-site">
        <div className="text-center">
          <Eyebrow>Filosofia</Eyebrow>
          <h2 className="mt-4 font-display text-4xl md:text-5xl">Cuidado construído com escuta, respeito e individualidade.</h2>
        </div>
        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {[
            { icon: HeartHandshake, title: "Escuta ativa", text: "Cada pessoa é ouvida com atenção genuína, sem pressa e sem julgamentos." },
            { icon: Shield, title: "Respeito aos limites", text: "Atendimento que respeita as competências de cada área e o tempo de cada pessoa." },
            { icon: Sparkles, title: "Individualidade", text: "Não existem protocolos padronizados. Cada plano nasce da avaliação única de cada caso." },
          ].map(({ icon: Icon, title, text }, index) => (
            <article key={title} className="content-card text-center">
              <div className="mx-auto size-12 rounded-xl bg-primary/10 grid place-items-center text-primary"><Icon className="size-6" /></div>
              <h3 className="card-title mt-6">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function CtaSection() {
  return (
    <section className="section-space bg-primary text-primary-foreground">
      <div className="container-site text-center">
        <Eyebrow tone="neutral">Agendamento</Eyebrow>
        <h2 className="mt-4 font-display text-4xl md:text-5xl">Seu cuidado pode começar com uma conversa.</h2>
        <p className="mt-6 max-w-2xl mx-auto text-lg leading-8 text-primary-foreground/90">
          Entre em contato para conhecer os atendimentos e encontrar a modalidade mais adequada às suas necessidades.
        </p>
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Button asChild size="lg" className="bg-gold text-gold-foreground hover:bg-gold/90 w-full sm:w-auto"><a href={whatsappUrl} target="_blank" rel="noreferrer" onClick={() => trackAnalyticsEvent("appointment_click")}>Agende sua consulta <ArrowRight className="size-4" /></a></Button>
          <Button asChild size="lg" variant="outline" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 w-full sm:w-auto"><Link to="/servicos">Conheça os atendimentos</Link></Button>
        </div>
      </div>
    </section>
  );
}