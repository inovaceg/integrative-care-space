import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, HeartHandshake, Leaf, LockKeyhole, Star, UserRoundCheck } from "lucide-react";
import { HomeHeroMotion } from "@/components/home-hero-motion";
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
    <section className="relative overflow-hidden border-b border-border bg-background">
      <div className="home-hero-glow absolute -right-20 top-0 size-80 rounded-full bg-accent/45 blur-3xl" aria-hidden="true" />
      <div className="container-site grid min-h-[calc(100svh-5rem)] items-center gap-14 py-12 lg:grid-cols-[1.08fr_.92fr] lg:py-16">
        <HomeHeroMotion className="relative z-10" delay={80}>
          <div className="inline-flex items-center gap-3 rounded-full bg-muted px-4 py-2"><span className="size-2 rounded-full bg-primary" /><span className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Psicologia • Biomedicina • Saúde Integrativa</span></div>
          <h1 className="mt-7 max-w-3xl text-balance font-display text-5xl font-semibold leading-[1.08] md:text-7xl"><span className="text-primary">Sua saúde</span> merece um olhar completo.<span className="block">Sua história merece um cuidado único.</span></h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-muted-foreground md:text-lg">Psicologia, Neuropsicologia, Biomedicina Integrativa e Estética reunidas em um atendimento individualizado, humano e profissional.</p>
          <div className="mt-7 border-l-4 border-gold pl-5"><p className="font-display text-xl font-semibold">Dr. Frederick Parreira</p><p className="mt-1 text-sm text-muted-foreground">Psicólogo • CRP 04/86194 &nbsp; | &nbsp; Biomédico • CRBM 30421</p></div>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row"><Button asChild size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90"><a href={whatsappUrl} target="_blank" rel="noreferrer" onClick={() => trackAnalyticsEvents(["appointment_click", "whatsapp_click"])}>Agende sua consulta <ArrowRight /></a></Button><Button asChild size="lg" variant="outline" className="border-primary text-primary hover:bg-primary/5"><Link to="/servicos">Conheça os atendimentos</Link></Button></div>
        </HomeHeroMotion>
        <HomeHeroMotion className="relative mx-auto w-full max-w-lg pb-6 pl-4" delay={260}>
          <div className="hero-accent absolute -bottom-1 -left-1 h-32 w-32 rounded-3xl" aria-hidden="true" />
          <img src="/dr-frederick-parreira.png" alt="Dr. Frederick Parreira — Psicólogo e Biomédico" className="hero-image relative aspect-[4/5] w-full object-cover" loading="eager" />
          <div className="absolute bottom-0 left-0 rounded-2xl bg-card p-4 shadow-xl"><p className="font-display text-lg font-semibold text-primary">Psicologia + Biomedicina</p><p className="mt-1 max-w-40 text-xs leading-5 text-muted-foreground">Duas áreas. Um cuidado individualizado.</p></div>
        </HomeHeroMotion>
      </div>
    </section>

    <HomeScrollReveal><IdentificationSection /></HomeScrollReveal>
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
