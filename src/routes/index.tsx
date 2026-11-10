import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ChevronDown, HeartHandshake, Leaf, LockKeyhole, Star, UserRoundCheck } from "lucide-react";
import { HomeHeroMotion } from "@/components/home-hero-motion";
import { HomeNeuralVisual } from "@/components/home-neural-visual";
import { HomeScrollReveal } from "@/components/home-scroll-reveal";
import { Button } from "@/components/ui/button";
import { trackAnalyticsEvents } from "@/lib/analytics";
import { AreaCards, CtaSection, FaqList, IdentificationSection, LocationBlock, ProfessionalSection, SocialProjectSection, Steps } from "@/components/page-parts";
import { whatsappUrl } from "@/lib/site-data";
import { createSeoHead } from "@/lib/seo";

export const Route = createFileRoute("/")({
  head: () => createSeoHead({
    title: "Psicologia e Biomedicina em Juiz de Fora | Dr. Frederick Parreira",
    description: "Cuidado integrado em Psicologia e Biomedicina, com atendimento personalizado e humanizado em Juiz de Fora.",
    path: "/",
  }),
  component: HomePage,
});

function HomePage() {
  return <>
    <section className="home-hero relative isolate overflow-hidden border-b border-[#d9e6df] bg-[#f8f6f1] lg:min-h-[min(760px,calc(100svh-5rem))]">
      <div className="home-hero-glow pointer-events-none absolute -right-24 -top-28 size-[30rem] rounded-full bg-emerald-100/50 blur-3xl" aria-hidden="true" />
      <div className="home-hero-grain pointer-events-none absolute inset-0 opacity-30" aria-hidden="true" />
      <div className="home-hero-desktop-photo absolute inset-y-0 right-0 hidden w-[62%] lg:block">
        <img src="/dr-frederick-parreira.png" alt="Dr. Frederick Parreira — Psicólogo e Biomédico" className="hero-image h-full w-full object-cover object-[center_30%]" loading="eager" />
        <div className="home-hero-photo-shade absolute inset-0" aria-hidden="true" />
        <HomeNeuralVisual />
      </div>
      <div className="container-site relative z-10 flex min-h-[min(760px,calc(100svh-5rem))] flex-col justify-center py-12 sm:py-14 lg:min-h-[min(760px,calc(100svh-5rem))] lg:py-16">
        <HomeHeroMotion className="relative z-10 max-w-[44rem] lg:w-[49%]" delay={80}>
          <div className="hero-text-step inline-flex items-center gap-3 rounded-full border border-[#d7e7df] bg-white/75 px-4 py-2.5 shadow-sm backdrop-blur"><span className="size-2 rounded-full bg-[#4b9d7d] shadow-[0_0_0_4px_rgba(75,157,125,0.12)]" /><span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#28665a] sm:text-xs">Psicologia · Neurociência · Biomedicina</span></div>
          <h1 className="hero-text-step hero-headline-shadow mt-6 max-w-[13ch] text-balance font-display text-[clamp(2.55rem,5vw,4.5rem)] font-medium leading-[1.06] tracking-[-0.045em] text-[#173f3a]">Ciência, acolhimento e cuidado <span className="hero-title-accent">para transformar histórias.</span></h1>
          <p className="hero-text-step hero-copy-shadow mt-6 max-w-[35rem] text-base leading-7 text-[#5c6e68] sm:text-lg sm:leading-8">Uma abordagem integrada entre Psicologia, Neuropsicologia e Biomedicina, respeitando a individualidade de cada pessoa.</p>
          <div className="hero-text-step mt-7 flex items-center gap-4 border-l border-[#c9a96c] py-1 pl-4"><span className="h-10 w-px bg-gradient-to-b from-[#dfc38e] to-transparent" /><div><p className="font-display text-lg font-semibold tracking-tight text-[#173f3a]">Dr. Frederick Parreira</p><p className="mt-1 text-xs leading-5 text-[#687873] sm:text-sm">Psicólogo — CRP 04/86194 <span className="mx-1.5 text-[#c9a96c]">/</span> Biomédico — CRBM 30421</p></div></div>
          <div className="hero-text-step mt-8 flex flex-col gap-3 sm:flex-row"><Button asChild size="lg" className="group h-12 rounded-full bg-[#17675b] px-6 text-white shadow-[0_12px_30px_-14px_rgba(23,103,91,0.7)] hover:bg-[#12574d]"><a href={whatsappUrl} target="_blank" rel="noreferrer" onClick={() => trackAnalyticsEvents(["appointment_click", "whatsapp_click"])}>Agende sua consulta <ArrowRight className="transition-transform group-hover:translate-x-1" /></a></Button><Button asChild size="lg" variant="outline" className="h-12 rounded-full border-[#b9cec4] bg-white/75 px-6 text-[#23594f] shadow-sm hover:bg-white"><Link to="/sobre">Conheça o Dr. Frederick</Link></Button></div>
        </HomeHeroMotion>
        <div className="home-hero-mobile-photo pointer-events-none absolute right-0 top-32 z-0 h-[min(105vw,460px)] w-[58%] overflow-hidden bg-[#dce7df] lg:hidden" aria-hidden="true">
          <img src="/dr-frederick-parreira.png" alt="" className="h-full w-full object-cover object-[center_24%]" loading="eager" />
          <div className="home-hero-mobile-shade absolute inset-0" />
          <HomeNeuralVisual />
        </div>
      </div>
      <a href="#identificacao" aria-label="Rolar para conhecer o espaço" className="hero-scroll-indicator absolute bottom-3 left-1/2 z-30 hidden size-10 -translate-x-1/2 place-items-center rounded-full border border-[#c9d9d0] bg-white/80 text-[#28665a] shadow-sm backdrop-blur transition-colors hover:bg-[#17675b] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary lg:grid"><ChevronDown className="size-5" /></a>
    </section>

    <HomeScrollReveal><div id="identificacao"><IdentificationSection /></div></HomeScrollReveal>
    <HomeScrollReveal delay={70}><SocialProjectSection /></HomeScrollReveal>
    <HomeScrollReveal><section className="section-space bg-card"><div className="container-site"><div className="flex flex-col justify-between gap-6 md:flex-row md:items-end"><div className="max-w-2xl"><span className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Atuação profissional</span><h2 className="mt-4 font-display text-4xl font-semibold md:text-5xl">Cuidado que considera diferentes dimensões da saúde.</h2></div><p className="max-w-sm leading-7 text-muted-foreground">Conheça as duas áreas de atendimento do Espaço de Saúde Integrativa Dr. Frederick Parreira.</p></div><div className="mt-12"><AreaCards /></div></div></section></HomeScrollReveal>
    <HomeScrollReveal><ProfessionalSection /></HomeScrollReveal>
    <HomeScrollReveal><section className="section-space"><div className="container-site"><span className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Como funciona</span><h2 className="mt-4 mb-10 font-display text-4xl">Atendimento em quatro etapas</h2><Steps /></div></section></HomeScrollReveal>
    <HomeScrollReveal stagger><section className="section-space bg-muted/30"><div className="container-site"><div className="text-center"><span className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Diferenciais</span><h2 className="mt-4 font-display text-4xl md:text-5xl">Um espaço pensado para cuidar de você</h2></div><div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{[[HeartHandshake, "Atendimento Humanizado", "Escuta, acolhimento e respeito às particularidades de cada pessoa."], [UserRoundCheck, "Atendimento Individualizado", "Cada acompanhamento é planejado considerando as necessidades identificadas na avaliação."], [Leaf, "Saúde Integrativa", "Diferentes possibilidades de cuidado, respeitando as competências de cada área profissional."], [LockKeyhole, "Ambiente Acolhedor", "Estrutura preparada para proporcionar conforto, privacidade e tranquilidade."]].map(([Icon, title, text], index) => { const C = Icon as typeof HeartHandshake; return <article key={String(title)} className="home-stagger-item group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-[#9bcfc4] hover:shadow-lg"><span className="absolute right-5 top-4 font-display text-3xl font-semibold text-[#edf6f4]">0{index + 1}</span><div className="relative grid size-12 place-items-center rounded-xl bg-[#e5f4f0] text-[#2f8f82] transition-colors group-hover:bg-[#2f8f82] group-hover:text-white"><C className="size-5" /></div><h3 className="relative mt-6 font-display text-lg font-semibold text-slate-900">{String(title)}</h3><p className="relative mt-3 text-sm leading-6 text-slate-600">{String(text)}</p><div className="mt-5 h-1 w-8 rounded-full bg-[#72c7b5] transition-all duration-300 group-hover:w-14" /></article>; })}</div></div></section></HomeScrollReveal>
    <HomeScrollReveal><section className="section-space"><div className="container-site"><LocationBlock /></div></section></HomeScrollReveal>
    <HomeScrollReveal stagger><section className="section-space border-y border-border bg-muted/30"><div className="container-site"><div className="text-center"><span className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Filosofia</span><h2 className="mt-4 font-display text-4xl md:text-5xl">Cuidado construído com escuta, respeito e individualidade.</h2></div><div className="mt-10 grid gap-6 lg:grid-cols-3">{[[HeartHandshake, "Escuta ativa", "Cada pessoa é ouvida com atenção genuína, sem pressa e sem julgamentos."], [LockKeyhole, "Respeito aos limites", "Atendimento que respeita as competências de cada área e o tempo de cada pessoa."], [Star, "Individualidade", "Não existem protocolos padronizados. Cada plano nasce da avaliação única de cada caso."]].map(([Icon, title, text], index) => { const C = Icon as typeof HeartHandshake; return <article key={String(title)} className="home-stagger-item group relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-7 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-[#9bcfc4] hover:shadow-xl sm:p-8"><span className="absolute right-6 top-5 font-display text-4xl font-semibold text-[#e6f3f0]">0{index + 1}</span><div className="relative grid size-14 place-items-center rounded-2xl bg-[#e5f4f0] text-[#2f8f82] transition-colors group-hover:bg-[#2f8f82] group-hover:text-white"><C className="size-6" /></div><h3 className="relative mt-7 font-display text-xl font-semibold text-slate-900">{String(title)}</h3><p className="relative mt-3 text-sm leading-7 text-slate-600">{String(text)}</p><div className="mt-6 h-1 w-10 rounded-full bg-[#72c7b5] transition-all duration-300 group-hover:w-16" /></article>; })}</div></div></section></HomeScrollReveal>
    <HomeScrollReveal><section className="section-space"><div className="container-site"><div className="text-center"><span className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Perguntas frequentes</span><h2 className="mt-4 mb-8 font-display text-4xl">Informações para seu primeiro contato</h2></div><FaqList /><div className="mt-8 text-center"><Button asChild variant="outline"><Link to="/faq">Ver todas as informações</Link></Button></div></div></section></HomeScrollReveal>
    <HomeScrollReveal><CtaSection /></HomeScrollReveal>
  </>;
}
