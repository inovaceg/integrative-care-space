import { createFileRoute } from "@tanstack/react-router";
import { ArrowDown, ArrowRight, Brain, BrainCircuit, Eye, Focus, HeartHandshake, MessageCircle, ShieldCheck, Sparkles, Waves } from "lucide-react";
import "./realidade-virtual.css";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { trackAnalyticsEvents } from "@/lib/analytics";
import { whatsappUrl } from "@/lib/site-data";
import { createSeoHead } from "@/lib/seo";

export const Route = createFileRoute("/realidade-virtual")({
  head: () => createSeoHead({
    title: "Realidade Virtual e Saúde Cerebral | Dr. Frederick Parreira",
    description: "Conheça possibilidades de uso da realidade virtual com Meta Quest 3S como recurso complementar, sempre com avaliação e acompanhamento profissional.",
    path: "/realidade-virtual",
  }),
  component: Page,
});

const whatsappClick = () => trackAnalyticsEvents(["appointment_click", "whatsapp_click"]);

const applications = [
  { icon: Brain, number: "01", title: "Reabilitação cognitiva", text: "Em contextos apropriados, experiências virtuais podem ser consideradas como recurso complementar para atividades relacionadas a memória, atenção, orientação e outras funções cognitivas. A indicação depende da avaliação profissional e dos objetivos de cuidado." },
  { icon: Focus, number: "02", title: "Atenção, foco e funções executivas", text: "Tarefas imersivas e interativas podem oferecer situações estruturadas para explorar atenção, planejamento, organização e controle de impulsos. As atividades são escolhidas e adaptadas à pessoa, sem promessa de resultado." },
  { icon: Waves, number: "03", title: "Experiências para pessoas com TEA", text: "Quando houver indicação e a pessoa se sentir confortável, ambientes virtuais podem permitir exploração gradual de situações e estímulos. Preferências sensoriais, comunicação, segurança e participação da pessoa orientam qualquer proposta." },
];

const faqs = [
  { question: "O que é realidade virtual aplicada à saúde?", answer: "É o uso de ambientes digitais imersivos e interativos como recurso possível em atividades de cuidado. A tecnologia não substitui avaliação, acompanhamento profissional ou outros tratamentos indicados." },
  { question: "Como funciona o Meta Quest 3S?", answer: "O Meta Quest 3S é um visor de realidade virtual independente. Quando a proposta é adequada, o profissional orienta o uso, seleciona a experiência e acompanha a pessoa durante a atividade." },
  { question: "A realidade virtual é indicada para todas as pessoas?", answer: "Não. A indicação é individual e depende dos objetivos, das condições e do conforto da pessoa. O profissional conversa sobre possíveis limitações e alternativas antes de utilizar o recurso." },
  { question: "A realidade virtual garante melhora ou cura?", answer: "Não. Não há promessa de cura nem de resultados garantidos. A realidade virtual pode ser considerada como recurso complementar e seus efeitos variam de pessoa para pessoa." },
  { question: "Como saber se esse recurso faz sentido para mim?", answer: "Converse com o profissional sobre sua demanda. A possibilidade de uso será discutida após avaliação e considerando sua preferência e segurança." },
];

function Page() {
  return <>
    <section className="relative isolate overflow-hidden bg-[#123c3d] text-white">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_18%_0%,rgba(201,169,108,.2),transparent_34%),radial-gradient(ellipse_at_88%_70%,rgba(45,149,132,.24),transparent_36%)]" />
      <div className="container-site grid items-center gap-8 py-12 sm:py-16 lg:grid-cols-[.9fr_1.1fr] lg:gap-12 lg:py-20">
        <div className="rv-enter max-w-xl">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[.16em] text-[#e8d6aa]"><Sparkles className="size-4" /> Tecnologia com acompanhamento humano</p>
          <h1 className="mt-6 font-display text-[clamp(2.5rem,5vw,4.5rem)] font-semibold leading-[1.05] tracking-[-.035em]">Realidade virtual para explorar novas possibilidades de cuidado.</h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-white/80 sm:text-lg sm:leading-8">Conheça o uso do Meta Quest 3S como possível recurso complementar em atividades relacionadas à saúde cerebral, sempre com avaliação e orientação profissional.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="h-12 rounded-full bg-[#d8bd83] px-6 text-[#183c37] hover:bg-[#e6d1a4]"><a href={whatsappUrl} target="_blank" rel="noopener noreferrer" onClick={whatsappClick}><MessageCircle className="mr-2 size-4" />Conversar sobre o atendimento</a></Button>
            <a href="#como-funciona" className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/25 px-6 text-sm font-semibold text-white transition-colors hover:bg-white/10">Conhecer a proposta <ArrowDown className="size-4" /></a>
          </div>
          <p className="mt-5 text-xs leading-5 text-white/60">O recurso não substitui avaliação, acompanhamento profissional ou tratamentos indicados.</p>
        </div>
        <div className="rv-enter rv-enter-delay relative mx-auto w-full max-w-[38rem]">
          <div aria-hidden="true" className="absolute -inset-3 rounded-[2rem] bg-gradient-to-br from-[#d8bd83]/40 via-[#58a496]/20 to-transparent blur-xl" />
          <div className="relative overflow-hidden rounded-[1.5rem] border border-white/20 bg-[#1b4544] p-2 shadow-[0_30px_90px_-35px_rgba(0,0,0,.78)] sm:p-3">
            <img src="/assets/realidade-virtual-meta-quest.jpg" alt="Dr. Frederick Parreira apresenta o Meta Quest 3S e possibilidades de realidade virtual aplicada à saúde cerebral." className="aspect-square w-full rounded-[1rem] object-cover" fetchPriority="high" />
            <div className="absolute inset-x-5 bottom-5 flex items-center justify-between rounded-xl border border-white/15 bg-[#123c3d]/85 px-4 py-3 text-xs text-white shadow-lg backdrop-blur-md sm:inset-x-6 sm:bottom-6 sm:text-sm"><span className="font-semibold">Meta Quest 3S</span><span className="text-white/70">Tecnologia imersiva</span></div>
          </div>
        </div>
      </div>
    </section>

    <section id="como-funciona" className="scroll-mt-24 section-space bg-[#f8f6f1]">
      <div className="container-site grid items-start gap-8 lg:grid-cols-[.7fr_1.3fr] lg:gap-16">
        <div><p className="text-xs font-bold uppercase tracking-[.16em] text-[#26786e]">O que é e como funciona</p><h2 className="mt-3 font-display text-3xl font-semibold text-[#173f3a] sm:text-4xl">Um ambiente digital, com a pessoa sempre no centro.</h2></div>
        <div className="space-y-4 text-base leading-7 text-[#526760]"><p>A realidade virtual cria ambientes digitais que podem ser explorados por meio de um visor e controles. O Meta Quest 3S permite experiências imersivas e interativas, escolhidas de acordo com a proposta de cada encontro.</p><p>Na prática, o equipamento é apenas uma ferramenta. Antes de utilizá-lo, o profissional conversa sobre os objetivos, verifica se a experiência é apropriada e observa o conforto da pessoa. A atividade pode ser interrompida ou adaptada a qualquer momento.</p><div className="mt-6 flex gap-3 rounded-2xl border border-[#d9e6df] bg-white p-5"><ShieldCheck className="mt-0.5 size-5 shrink-0 text-[#26786e]" /><p className="text-sm leading-6"><strong className="text-[#173f3a]">Cuidado individualizado.</strong> O uso depende de avaliação e indicação profissional. Nem toda experiência é adequada para todas as pessoas.</p></div></div>
      </div>
    </section>

    <section className="section-space bg-white">
      <div className="container-site">
        <div className="max-w-2xl"><p className="text-xs font-bold uppercase tracking-[.16em] text-[#26786e]">Possíveis aplicações</p><h2 className="mt-3 font-display text-3xl font-semibold text-[#173f3a] sm:text-4xl">A tecnologia pode apoiar experiências diferentes.</h2><p className="mt-4 leading-7 text-[#526760]">As possibilidades abaixo são temas que podem ser explorados em contextos específicos. A escolha depende de avaliação, indicação e objetivos acordados com o profissional.</p></div>
        <div className="mt-9 grid gap-5 lg:grid-cols-3">{applications.map(({ icon: Icon, number, title, text }) => <article key={number} className="group rounded-3xl border border-[#d9e6df] bg-[#fbfcfa] p-6 transition duration-300 hover:-translate-y-1 hover:border-[#98c9bb] hover:shadow-[0_22px_50px_-30px_rgba(18,60,61,.5)] sm:p-7"><div className="flex items-center justify-between"><span className="grid size-12 place-items-center rounded-2xl bg-[#e5f4f0] text-[#26786e] transition-colors group-hover:bg-[#17675b] group-hover:text-white"><Icon className="size-6" /></span><span className="font-display text-sm font-semibold tracking-[.16em] text-[#bb9c60]">{number}</span></div><h3 className="mt-5 font-display text-xl font-semibold text-[#173f3a]">{title}</h3><p className="mt-3 text-sm leading-7 text-[#526760]">{text}</p></article>)}</div>
      </div>
    </section>

    <section className="section-space overflow-hidden bg-[#123c3d] text-white">
      <div className="container-site grid items-center gap-8 lg:grid-cols-[1fr_1fr] lg:gap-14">
        <div className="relative mx-auto w-full max-w-xl overflow-hidden rounded-3xl border border-white/15 shadow-2xl"><img src="/assets/realidade-virtual-meta-quest.jpg" alt="O Meta Quest 3S, apresentado pelo Dr. Frederick Parreira, pode ser considerado como ferramenta complementar após avaliação." className="aspect-[4/3] w-full object-cover object-left" loading="lazy" /><div className="absolute inset-0 bg-gradient-to-t from-[#123c3d]/65 via-transparent to-transparent" /><span className="absolute bottom-4 left-4 rounded-full border border-white/20 bg-[#123c3d]/70 px-4 py-2 text-xs font-semibold text-white backdrop-blur">Imersão com orientação profissional</span></div>
        <div><p className="text-xs font-bold uppercase tracking-[.16em] text-[#e8d6aa]">Acompanhamento profissional</p><h2 className="mt-3 font-display text-3xl font-semibold sm:text-4xl">A experiência é conduzida com cuidado, não no piloto automático.</h2><ul className="mt-7 space-y-5">{[[Eye, "Conversa e avaliação", "Entendimento da demanda, dos objetivos e de fatores importantes para a segurança e o conforto."], [BrainCircuit, "Escolha da atividade", "Seleção de experiências compatíveis com a pessoa e com a proposta de acompanhamento."], [HeartHandshake, "Orientação durante o uso", "Acompanhamento profissional, com possibilidade de pausar, adaptar ou encerrar a atividade." ]].map(([Icon, title, text]) => { const StepIcon = Icon as typeof Eye; return <li key={title as string} className="flex gap-4"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white/10 text-[#e8d6aa]"><StepIcon className="size-5" /></span><div><h3 className="font-semibold">{title as string}</h3><p className="mt-1 text-sm leading-6 text-white/70">{text as string}</p></div></li>; })}</ul></div>
      </div>
    </section>

    <section className="section-space bg-[#f8f6f1]">
      <div className="container-site"><div className="mx-auto max-w-2xl text-center"><p className="text-xs font-bold uppercase tracking-[.16em] text-[#26786e]">Dúvidas frequentes</p><h2 className="mt-3 font-display text-3xl font-semibold text-[#173f3a] sm:text-4xl">O que é importante saber</h2></div><Accordion type="single" collapsible className="mx-auto mt-7 max-w-3xl">{faqs.map((faq, index) => <AccordionItem key={faq.question} value={`rv-faq-${index}`}><AccordionTrigger className="py-5 text-left text-base sm:text-lg">{faq.question}</AccordionTrigger><AccordionContent className="pr-8 text-sm leading-7 text-[#526760]">{faq.answer}</AccordionContent></AccordionItem>)}</Accordion></div>
    </section>

    <section className="bg-white px-4 pb-16 sm:pb-20">
      <div className="container-site overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#174b49] to-[#123c3d] px-6 py-10 text-center text-white shadow-[0_24px_70px_-35px_rgba(18,60,61,.75)] sm:px-10 sm:py-14"><span className="mx-auto grid size-12 place-items-center rounded-2xl border border-white/20 bg-white/10 text-[#e8d6aa]"><Sparkles className="size-6" /></span><h2 className="mx-auto mt-5 max-w-2xl font-display text-2xl font-semibold sm:text-3xl">Quer saber se essa possibilidade faz sentido para você?</h2><p className="mx-auto mt-3 max-w-xl leading-7 text-white/75">Converse com a equipe para conhecer o atendimento e esclarecer suas dúvidas. A indicação é sempre individual.</p><Button asChild size="lg" className="mt-6 h-12 rounded-full bg-[#d8bd83] px-6 text-[#183c37] hover:bg-[#e6d1a4]"><a href={whatsappUrl} target="_blank" rel="noopener noreferrer" onClick={whatsappClick}><MessageCircle className="mr-2 size-4" />Agendar pelo WhatsApp <ArrowRight className="ml-2 size-4" /></a></Button></div>
    </section>
  </>;
}
