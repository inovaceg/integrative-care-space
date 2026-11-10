import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BadgeCheck, ChevronDown, HeartHandshake, Leaf, LockKeyhole, MapPin, UserRound, UserRoundCheck } from "lucide-react";
import { HomeHeroMotion } from "@/components/home-hero-motion";
import { HomeScrollReveal } from "@/components/home-scroll-reveal";
import { Button } from "@/components/ui/button";
import { trackAnalyticsEvents } from "@/lib/analytics";
import { AreaCards, CtaSection, FaqList, LocationBlock, ProfessionalSection, SocialProjectSection, Steps } from "@/components/page-parts";
import { whatsappUrl } from "@/lib/site-data";
import { createSeoHead } from "@/lib/seo";

export const Route = createFileRoute("/")({
  head: () => createSeoHead({
    title: "Psicologia e Biomedicina em Juiz de Fora | Dr. Frederick Parreira",
    description: "Atendimento em Psicologia, Neuropsicologia e Biomedicina no centro de Juiz de Fora, com avaliação individual.",
    path: "/",
  }),
  component: HomePage,
});

const trustItems = [
  { icon: BadgeCheck, title: "Psicólogo", text: "CRP 04/86194" },
  { icon: BadgeCheck, title: "Biomédico", text: "CRBM 30421" },
  { icon: MapPin, title: "Juiz de Fora", text: "Centro da cidade" },
  { icon: UserRound, title: "Avaliação individual", text: "Plano conforme cada caso" },
];

function HomePage() {
  return <>
    <section className="home-hero relative isolate overflow-hidden border-b border-[#d9e6df] bg-[#f8f6f1]">
      <div className="home-hero-glow pointer-events-none absolute -left-24 -top-28 size-[28rem] rounded-full bg-emerald-100/60 blur-3xl" aria-hidden="true" />
      <div className="container-site relative z-10 grid items-center gap-8 py-12 sm:py-14 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.86fr)] lg:gap-14 lg:py-20">
        <HomeHeroMotion className="max-w-xl" delay={80}>
          <div className="hero-text-step inline-flex items-center gap-3 rounded-full border border-[#d7e7df] bg-white px-4 py-2.5 shadow-sm">
            <span className="size-2 rounded-full bg-[#4b9d7d]" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#28665a] sm:text-xs">Psicologia · Neurociência · Biomedicina</span>
          </div>
          <h1 className="hero-text-step mt-6 font-display text-[clamp(2.35rem,4.4vw,4.15rem)] font-medium leading-[1.08] tracking-[-0.04em] text-[#173f3a]">
            Psicologia e Biomedicina <span className="text-[#286f5d]">em Juiz de Fora.</span>
          </h1>
          <p className="hero-text-step mt-6 max-w-lg text-base leading-7 text-[#5c6e68] sm:text-lg sm:leading-8">
            Avaliação individual e acompanhamento em saúde mental, neuropsicologia e saúde integrativa, no centro da cidade.
          </p>
          <div className="hero-text-step mt-7 border-l-2 border-[#c9a96c] py-1 pl-4">
            <p className="font-display text-lg font-semibold tracking-tight text-[#173f3a]">Dr. Frederick Parreira</p>
            <p className="mt-1 text-xs leading-5 text-[#687873] sm:text-sm">Psicólogo — CRP 04/86194 <span className="mx-1.5 text-[#c9a96c]">/</span> Biomédico — CRBM 30421</p>
          </div>
          <div className="hero-text-step mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="group h-12 rounded-full bg-[#17675b] px-6 text-white shadow-[0_12px_30px_-14px_rgba(23,103,91,0.7)] hover:bg-[#12574d]">
              <a href={whatsappUrl} target="_blank" rel="noreferrer" onClick={() => trackAnalyticsEvents(["appointment_click", "whatsapp_click"])}>Agende sua consulta <ArrowRight className="transition-transform group-hover:translate-x-1" /></a>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 rounded-full border-[#b9cec4] bg-white px-6 text-[#23594f] shadow-sm hover:bg-[#f4faf8]">
              <Link to="/servicos">Conheça as áreas</Link>
            </Button>
          </div>
        </HomeHeroMotion>
        <div className="overflow-hidden rounded-[1.75rem] bg-[#dce7df] shadow-[0_24px_50px_-28px_rgba(23,63,58,0.55)]">
          <img src="/dr-frederick-parreira.png" alt="Dr. Frederick Parreira, psicólogo e biomédico, no Espaço de Saúde Integrativa." className="aspect-[4/5] w-full object-cover object-[center_18%] sm:aspect-[5/4] lg:aspect-[4/5] lg:max-h-[640px]" loading="eager" />
        </div>
      </div>
      <a href="#atuacao" aria-label="Rolar para as áreas de atuação" className="hero-scroll-indicator absolute bottom-4 left-1/2 z-30 hidden size-10 -translate-x-1/2 place-items-center rounded-full border border-[#c9d9d0] bg-white/90 text-[#28665a] shadow-sm transition-colors hover:bg-[#17675b] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary lg:grid"><ChevronDown className="size-5" /></a>
    </section>

    <section aria-label="Credenciais" className="border-b border-[#d9e6df] bg-white">
      <ul className="container-site grid sm:grid-cols-2 lg:grid-cols-4">
        {trustItems.map(({ icon: Icon, title, text }) => (
          <li key={title} className="flex items-center gap-3 border-[#e4eee9] px-1 py-5 sm:px-4 lg:border-l lg:first:border-l-0">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#e5f4f0] text-[#2f8f82]"><Icon className="size-5" /></span>
            <span><strong className="block text-sm text-[#173f3a]">{title}</strong><span className="text-sm text-[#5c6e68]">{text}</span></span>
          </li>
        ))}
      </ul>
    </section>

    <HomeScrollReveal>
      <section id="atuacao" className="section-space bg-card">
        <div className="container-site">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div className="max-w-2xl">
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Atuação profissional</span>
              <h2 className="mt-4 font-display text-4xl font-semibold md:text-5xl">Cuidado que considera diferentes dimensões da saúde.</h2>
            </div>
            <p className="max-w-sm leading-7 text-muted-foreground">Psicologia e Biomedicina no mesmo espaço, cada uma dentro da sua competência profissional.</p>
          </div>
          <div className="mt-12"><AreaCards /></div>
        </div>
      </section>
    </HomeScrollReveal>
    <HomeScrollReveal><ProfessionalSection /></HomeScrollReveal>
    <HomeScrollReveal>
      <section className="section-space">
        <div className="container-site">
          <span className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Como funciona</span>
          <h2 className="mt-4 mb-10 font-display text-4xl">Atendimento em quatro etapas</h2>
          <Steps />
        </div>
      </section>
    </HomeScrollReveal>
    <HomeScrollReveal stagger>
      <section className="section-space bg-muted/30">
        <div className="container-site">
          <div className="max-w-2xl">
            <span className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Diferenciais</span>
            <h2 className="mt-4 font-display text-4xl md:text-5xl">Um espaço pensado para cuidar de você</h2>
          </div>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[[HeartHandshake, "Atendimento humanizado", "Escuta e respeito às particularidades de cada pessoa."], [UserRoundCheck, "Plano individual", "O acompanhamento parte da avaliação, sem protocolo único."], [Leaf, "Saúde integrativa", "Psicologia e Biomedicina, cada uma na sua competência."], [LockKeyhole, "Privacidade", "Consultório reservado, no centro de Juiz de Fora."]].map(([Icon, title, text]) => {
              const C = Icon as typeof HeartHandshake;
              return (
                <article key={String(title)} className="home-stagger-item rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="grid size-12 place-items-center rounded-xl bg-[#e5f4f0] text-[#2f8f82]"><C className="size-5" /></div>
                  <h3 className="mt-6 font-display text-lg font-semibold text-slate-900">{String(title)}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{String(text)}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>
    </HomeScrollReveal>
    <HomeScrollReveal><SocialProjectSection /></HomeScrollReveal>
    <HomeScrollReveal>
      <section className="section-space">
        <div className="container-site"><LocationBlock /></div>
      </section>
    </HomeScrollReveal>
    <HomeScrollReveal>
      <section className="section-space bg-muted/30">
        <div className="container-site">
          <div className="text-center">
            <span className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Perguntas frequentes</span>
            <h2 className="mt-4 mb-8 font-display text-4xl">Informações para seu primeiro contato</h2>
          </div>
          <FaqList />
          <div className="mt-8 text-center"><Button asChild variant="outline"><Link to="/faq">Ver todas as informações</Link></Button></div>
        </div>
      </section>
    </HomeScrollReveal>
    <HomeScrollReveal><CtaSection /></HomeScrollReveal>
  </>;
}
