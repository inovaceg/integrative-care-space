import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Brain, HeartHandshake, MessageCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FaqList } from "@/components/page-parts";
import { trackAnalyticsEvents } from "@/lib/analytics";
import { whatsappUrl } from "@/lib/site-data";
import { createSeoHead } from "@/lib/seo";

export const Route = createFileRoute("/")({
  head: () => createSeoHead({
    title: "Dr. Frederick Parreira | Psicologia e Saúde Mental",
    description: "Psicoterapia e avaliação neuropsicológica com escuta individualizada em Juiz de Fora. Conheça os atendimentos e fale pelo WhatsApp.",
    path: "/",
  }),
  component: HomePage,
});

function HomePage() {
  return <>
    <section className="border-b border-[#d9e6df] bg-[#f8f6f1]">
      <div className="container-site grid items-center gap-8 py-10 sm:py-14 md:grid-cols-[1.05fr_.95fr] lg:gap-14 lg:py-20">
        <div className="max-w-xl">
          <p className="inline-flex items-center gap-2 rounded-full border border-[#d7e7df] bg-white px-4 py-2 text-xs font-bold uppercase tracking-[.16em] text-[#28665a]"><span className="size-2 rounded-full bg-[#4b9d7d]" /> Psicologia e saúde mental</p>
          <h1 className="mt-6 font-display text-[clamp(2.25rem,4.4vw,4rem)] font-medium leading-[1.1] tracking-[-.035em] text-[#173f3a]">Um espaço para entender o que você sente e encontrar caminhos para cuidar da sua saúde mental.</h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-[#526760] sm:text-lg sm:leading-8">Um atendimento profissional começa com escuta, respeito à sua história e atenção ao que você precisa neste momento.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="h-12 rounded-full bg-[#17675b] px-6 text-white hover:bg-[#12574d]"><a href={whatsappUrl} target="_blank" rel="noopener noreferrer" onClick={() => trackAnalyticsEvents(["appointment_click", "whatsapp_click"])}><MessageCircle className="mr-2 size-4" />Agendar pelo WhatsApp</a></Button>
            <Button asChild size="lg" variant="outline" className="h-12 rounded-full border-[#b9cec4] bg-white px-6 text-[#23594f] hover:bg-[#f4faf8]"><a href="#atendimentos">Conhecer os atendimentos</a></Button>
          </div>
          <p className="mt-6 text-sm text-[#526760]">Dr. Frederick Parreira <span className="mx-1 text-[#c9a96c]">·</span> Psicólogo — CRP 04/86194</p>
        </div>
        <div className="overflow-hidden rounded-[1.75rem] bg-[#dce7df] shadow-[0_24px_50px_-28px_rgba(23,63,58,.55)]">
          <img src="/dr-frederick-parreira.png" alt="Dr. Frederick Parreira, psicólogo e biomédico." className="aspect-[4/5] w-full object-cover object-[center_18%] sm:aspect-[5/4] md:aspect-[4/5]" fetchPriority="high" />
        </div>
      </div>
    </section>

    <section id="atendimentos" className="scroll-mt-24 section-space bg-white">
      <div className="container-site">
        <p className="text-xs font-bold uppercase tracking-[.16em] text-[#26786e]">Como posso te ajudar</p>
        <h2 className="mt-3 max-w-2xl font-display text-3xl font-semibold text-[#173f3a] sm:text-4xl">Atendimentos para compreender melhor o que você está vivendo.</h2>
        <div className="mt-9 grid gap-5 md:grid-cols-2">
          <article className="rounded-3xl border border-[#cce7df] bg-[#f8fbfa] p-6 sm:p-8">
            <span className="grid size-12 place-items-center rounded-2xl bg-[#e5f4f0] text-[#26786e]"><HeartHandshake className="size-6" /></span>
            <h3 className="mt-5 font-display text-2xl font-semibold text-[#173f3a]">Psicoterapia</h3>
            <p className="mt-3 leading-7 text-[#526760]">Para quem busca um espaço de escuta e acompanhamento diante de questões emocionais, comportamentais ou relacionais. O processo é construído a partir da sua história e daquilo que você traz para cada encontro.</p>
            <Link to="/psicologia" className="mt-5 inline-flex items-center gap-2 font-semibold text-[#17675b] hover:underline">Saiba mais <ArrowRight className="size-4" /></Link>
          </article>
          <article className="rounded-3xl border border-[#cce7df] bg-[#f8fbfa] p-6 sm:p-8">
            <span className="grid size-12 place-items-center rounded-2xl bg-[#e5f4f0] text-[#26786e]"><Brain className="size-6" /></span>
            <h3 className="mt-5 font-display text-2xl font-semibold text-[#173f3a]">Avaliação neuropsicológica</h3>
            <p className="mt-3 leading-7 text-[#526760]">Para investigar dúvidas sobre atenção, memória e outras funções cognitivas no contexto de cada pessoa. O processo ajuda a compreender a demanda e organizar os próximos passos; não é um diagnóstico feito por questionário online.</p>
            <Link to="/avaliacao-neuropsicologica" className="mt-5 inline-flex items-center gap-2 font-semibold text-[#17675b] hover:underline">Saiba mais <ArrowRight className="size-4" /></Link>
          </article>
        </div>
        <p className="mt-6 text-sm leading-6 text-[#526760]">O espaço também oferece serviços de Biomedicina em uma página própria.</p>
        <Link to="/biomedicina" className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-[#17675b] hover:underline">Conhecer Biomedicina <ArrowRight className="size-4" /></Link>
      </div>
    </section>

    <section className="section-space bg-[#f4f8f7]">
      <div className="container-site">
        <p className="text-xs font-bold uppercase tracking-[.16em] text-[#26786e]">Primeiro encontro</p>
        <h2 className="mt-3 font-display text-3xl font-semibold text-[#173f3a] sm:text-4xl">Como funciona a primeira consulta</h2>
        <p className="mt-4 max-w-2xl leading-7 text-[#526760]">É um momento para começar a entender sua procura e conversar sobre como seguir, sem precisar ter tudo organizado antes.</p>
        <ol className="mt-8 grid gap-4 md:grid-cols-3">
          {[["01", "Escuta inicial", "Você pode contar, no seu ritmo, o que motivou a busca por atendimento."], ["02", "Compreensão da demanda", "Conversamos sobre o que está acontecendo e o que você gostaria de cuidar."], ["03", "Próximos passos", "Combinamos orientações iniciais e possibilidades de acompanhamento adequadas à demanda."]].map(([number, title, text]) => <li key={number} className="rounded-2xl border border-[#d9e6df] bg-white p-6"><span className="text-sm font-bold tracking-widest text-[#26786e]">{number}</span><h3 className="mt-3 font-display text-xl font-semibold text-[#173f3a]">{title}</h3><p className="mt-2 text-sm leading-6 text-[#526760]">{text}</p></li>)}
        </ol>
        <p className="mt-5 text-sm leading-6 text-[#526760]">Duração e modalidade são informadas pela equipe no contato para agendamento.</p>
      </div>
    </section>

    <section id="sobre" className="scroll-mt-24 section-space bg-white">
      <div className="container-site grid items-center gap-8 md:grid-cols-[.8fr_1.2fr] lg:gap-14">
        <div className="overflow-hidden rounded-3xl bg-[#e5f4f0]"><img src="/dr-frederick-parreira.png" alt="Retrato profissional do Dr. Frederick Parreira." className="aspect-[4/5] w-full object-cover object-[center_18%]" loading="lazy" /></div>
        <div>
          <p className="text-xs font-bold uppercase tracking-[.16em] text-[#26786e]">Sobre mim</p>
          <h2 className="mt-3 font-display text-3xl font-semibold text-[#173f3a] sm:text-4xl">Cuidado com escuta e responsabilidade</h2>
          <div className="mt-5 space-y-4 leading-7 text-[#526760]">
            <p>Sou Frederick Parreira, psicólogo e biomédico. Minha atuação reúne o cuidado em saúde mental e a Biomedicina, com atenção às necessidades de cada pessoa e aos limites de cada área profissional.</p>
            <p>Na Psicologia, ofereço um espaço de escuta e acompanhamento individualizado. Acredito que compreender o que se sente pode ajudar a construir caminhos possíveis de cuidado.</p>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2"><p className="border-l-2 border-[#2f8f82] pl-4 text-sm text-[#526760]"><strong className="block text-[#173f3a]">Psicólogo</strong>CRP 04/86194</p><p className="border-l-2 border-[#c9a96c] pl-4 text-sm text-[#526760]"><strong className="block text-[#173f3a]">Biomédico</strong>CRBM 30421</p></div>
          <Link to="/sobre" className="mt-6 inline-flex items-center gap-2 font-semibold text-[#17675b] hover:underline">Conheça mais sobre minha trajetória <ArrowRight className="size-4" /></Link>
        </div>
      </div>
    </section>

    <section id="pensamentos-diarios" className="scroll-mt-24 section-space bg-[#f8f6f1]">
      <div className="container-site">
        <div className="mb-8 max-w-2xl"><p className="text-xs font-bold uppercase tracking-[.16em] text-[#26786e]">Pensamentos Diários</p><h2 className="mt-3 font-display text-3xl font-semibold text-[#173f3a] sm:text-4xl">Palavras para levar com você.</h2></div>
        <article className="grid overflow-hidden rounded-3xl border border-[#d9e6df] bg-white shadow-sm md:grid-cols-[.9fr_1.1fr]">
          <img src="/assets/pensamentos-diarios-coragem.png" alt="Arte de Pensamentos Diários com retrato em preto e branco e a frase: Coragem é dar o próximo passo mesmo com medo." className="max-h-[34rem] min-h-72 w-full object-cover object-center" loading="lazy" />
          <div className="flex flex-col justify-center p-6 sm:p-9 lg:p-12"><Sparkles className="size-6 text-[#c09b5a]" /><blockquote className="mt-4 font-display text-2xl font-semibold leading-snug text-[#173f3a] sm:text-3xl">“Coragem é dar o próximo passo mesmo com medo.”</blockquote><p className="mt-5 leading-7 text-[#526760]">Nem sempre precisamos ter todas as respostas para seguir. Às vezes, cuidar de si começa com um gesto pequeno: reconhecer o que sente e permitir-se pedir apoio.</p><Button asChild variant="outline" className="mt-7 w-fit border-[#b9cec4] text-[#23594f]"><Link to="/blog">Ver mais reflexões <ArrowRight className="ml-2 size-4" /></Link></Button></div>
        </article>
      </div>
    </section>

    <section id="contato" className="scroll-mt-24 section-space bg-white">
      <div className="container-site">
        <div className="mx-auto max-w-2xl text-center"><p className="text-xs font-bold uppercase tracking-[.16em] text-[#26786e]">Dúvidas frequentes</p><h2 className="mt-3 font-display text-3xl font-semibold text-[#173f3a] sm:text-4xl">Antes de agendar</h2></div>
        <div className="mt-6"><FaqList /></div>
        <div className="mt-10 rounded-3xl bg-[#123c3d] px-6 py-9 text-center text-white sm:px-10"><h2 className="font-display text-2xl font-semibold sm:text-3xl">Vamos conversar sobre o atendimento?</h2><p className="mx-auto mt-3 max-w-xl leading-7 text-white/85">Entre em contato para tirar dúvidas e consultar os horários disponíveis.</p><Button asChild size="lg" className="mt-6 h-12 rounded-full bg-[#d8bd83] px-6 text-[#183c37] hover:bg-[#e6d1a4]"><a href={whatsappUrl} target="_blank" rel="noopener noreferrer" onClick={() => trackAnalyticsEvents(["appointment_click", "whatsapp_click"])}><MessageCircle className="mr-2 size-4" />Agendar pelo WhatsApp</a></Button></div>
      </div>
    </section>
  </>;
}
