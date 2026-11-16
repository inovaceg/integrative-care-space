import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, Brain, ClipboardCheck, MessageCircle, ShieldCheck } from "lucide-react";
import { whatsappUrl } from "@/lib/site-data";
import { createSeoHead } from "@/lib/seo";

export const Route = createFileRoute("/links")({
  head: () => createSeoHead({
    title: "Links | Dr. Frederick Parreira",
    description: "Acesse os principais serviços, questionários e formas de contato do Dr. Frederick Parreira.",
    path: "/links",
  }),
  component: LinksPage,
});

const links = [
  { title: "Fale com o Dr. Frederick", description: "Contato e agendamento pelo WhatsApp", href: whatsappUrl, icon: MessageCircle, primary: true, external: true, tone: "from-[#1d4640] to-[#3f8a7e]", image: "/assets/psicologo-escritorio-acolhedor.png", alt: "Dr. Frederick Parreira em escritório acolhedor" },
  { title: "Anamnese Psicológica Digital", description: "Preencha sua ficha de anamnese online", href: "/anamnese-psicologica", icon: ClipboardCheck, tone: "from-[#2f6b62] to-[#7fb5a6]", image: "/assets/anamnese-psicologica-consultorio.png", alt: "Formulário de anamnese psicológica no consultório" },
  { title: "Avaliação Neuropsicológica", description: "Conheça o processo de avaliação", href: "/avaliacao-neuropsicologica", icon: Brain, tone: "from-[#1d3f3a] to-[#4a8c80]", image: "/assets/consulta-neuropsicologia-acolhedora.png", alt: "Consulta de avaliação neuropsicológica em ambiente acolhedor" },
  { title: "Orientação sobre TDAH", description: "Informações e orientação inicial", href: "/orientacao-tdah", icon: Brain, tone: "from-[#8a6d2f] to-[#d9b872]", image: "/assets/orientacao-tdah-dr-frederick.png", alt: "Orientação sobre TDAH com Dr. Frederick Parreira" },
  { title: "Triagem sobre uso de substâncias", description: "Responda à triagem inicial com privacidade", href: "/triagem-substancias", icon: ShieldCheck, tone: "from-[#2a5a66] to-[#6aa3ad]", image: "/assets/triagem-uso-substancias.png", alt: "Triagem acolhedora sobre uso de substâncias" },
];

function LinksPage() {
  return (
    <main className="relative isolate flex min-h-screen justify-center overflow-hidden bg-[#f4f1ea] px-[18px] py-10 text-[#16302c]">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(60rem_30rem_at_50%_-10%,#e3ece8,transparent_70%)]" />
      <section className="relative flex w-full max-w-[460px] flex-col items-center text-center">
        <div className="grid size-28 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-[#244f49] to-[#173833] text-white shadow-[0_0_0_4px_#f4f1ea,0_0_0_6px_#c9a45c,0_10px_30px_rgba(36,79,73,.1)]">
          <img src="/dr-frederick-parreira.png" alt="Dr. Frederick Parreira" className="h-full w-full object-cover object-top" />
        </div>
        <p className="mt-[22px] text-xs font-semibold uppercase tracking-[.16em] text-[#c9a45c]">Espaço de Saúde Integrativa</p>
        <h1 className="mt-2 font-display text-[32px] font-semibold leading-tight tracking-tight">Dr. Frederick Parreira</h1>
        <p className="mt-2 text-[15px] text-[#5d716d]">Psicologia e Biomedicina com cuidado integrado</p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <span className="rounded-full border border-[#dbe3df] bg-white px-3 py-1.5 text-xs text-[#5d716d]">Psicólogo · CRP 04/86194</span>
          <span className="rounded-full border border-[#dbe3df] bg-white px-3 py-1.5 text-xs text-[#5d716d]">Biomédico · CRBM 30421</span>
        </div>

        <nav aria-label="Links principais" className="mt-7 grid w-full gap-3">
          {links.map(({ title, description, href, icon: Icon, primary, external, tone, image, alt }) => {
            const className = `group grid w-full grid-cols-[1fr_auto] overflow-hidden rounded-[18px] border text-left no-underline shadow-[0_10px_30px_rgba(36,79,73,.1)] transition duration-200 hover:-translate-y-0.5 hover:border-[#244f49] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#244f49] motion-reduce:transform-none motion-reduce:transition-none ${primary ? "border-[#244f49] bg-[#244f49] text-white" : "border-[#dbe3df] bg-white text-[#16302c]"}`;
            const card = <><span className={`relative col-span-2 block h-[190px] overflow-hidden bg-gradient-to-br ${tone}`}><img src={image} alt={alt} loading="lazy" className="h-full w-full object-cover object-center"/><span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent"/><span className="absolute bottom-3 right-3 grid size-10 place-items-center rounded-xl border border-white/40 bg-white/20 text-white backdrop-blur-sm"><Icon className="size-5" aria-hidden="true"/></span></span><span className="min-w-0 py-3.5 pl-4"><strong className="block text-[15px] font-semibold">{title}</strong><span className={`mt-0.5 block text-[13px] ${primary ? "text-white/80" : "text-[#5d716d]"}`}>{description}</span></span><ArrowUpRight className={`mr-4 size-[18px] self-center ${primary ? "text-white" : "text-[#5d716d]"}`} aria-hidden="true" /></>;
            return external ? <a key={title} href={href} target="_blank" rel="noopener noreferrer" className={className}>{card}</a> : <Link key={title} to={href} className={className}>{card}</Link>;
          })}
        </nav>

        <p className="mt-5 max-w-[340px] text-[12.5px] leading-relaxed text-[#5d716d]">Informações e recursos para apoiar seu cuidado. Cada percurso é individual e respeita seu tempo.</p>
        <footer className="mt-[26px] flex w-full flex-wrap justify-center gap-2.5 border-t border-[#dbe3df] pt-[18px] text-[13px] text-[#5d716d]">
          <span>Juiz de Fora · Minas Gerais</span><span aria-hidden="true" className="text-[#c9a45c]">•</span>
          <a className="font-semibold text-[#244f49] no-underline hover:underline" href="https://drfredmartins.com.br/" target="_blank" rel="noopener noreferrer">Acessar o site</a>
        </footer>
      </section>
    </main>
  );
}
