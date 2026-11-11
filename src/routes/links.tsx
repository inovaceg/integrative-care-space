import { createFileRoute } from "@tanstack/react-router";
import { ArrowUpRight, Brain, ClipboardCheck, MessageCircle } from "lucide-react";
import { whatsappUrl } from "@/lib/site-data";
import { createSeoHead } from "@/lib/seo";

export const Route = createFileRoute("/links")({
  head: () => createSeoHead({
    title: "Links | Dr. Frederick Parreira",
    description: "Entre em contato com o Dr. Frederick Parreira ou acesse informações sobre avaliação neuropsicológica e orientação sobre TDAH.",
    path: "/links",
  }),
  component: LinksPage,
});

const links = [
  {
    title: "Fale com o Dr. Frederick",
    description: "Contato e agendamento pelo WhatsApp",
    href: whatsappUrl,
    icon: MessageCircle,
    primary: true,
  },
  {
    title: "Anamnese Psicológica Digital",
    description: "Preencha sua ficha de anamnese online",
    href: "/anamnese-psicologica",
    icon: ClipboardCheck,
  },
  {
    title: "Avaliação Neuropsicológica",
    description: "Conheça o processo de avaliação",
    href: "https://drfredmartins.com.br/avaliacao-neuropsicologica",
    icon: ClipboardCheck,
  },
  {
    title: "Orientação sobre TDAH",
    description: "Informações e orientação inicial",
    href: "https://drfredmartins.com.br/orientacao-tdah",
    icon: Brain,
  },
];

function LinksPage() {
  return (
    <main className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-[#f5f6f0] px-5 py-12 text-[#173f3a]">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(193,224,207,0.58),_transparent_54%)]" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-36 -right-28 size-[28rem] rounded-full bg-[#dfebdc]/70 blur-3xl" />
      <section className="relative w-full max-w-[27rem] animate-in fade-in slide-in-from-bottom-3 duration-700">
        <header className="mb-8 text-center">
          <div className="mx-auto mb-5 size-28 overflow-hidden rounded-full border-4 border-white shadow-[0_12px_36px_-12px_rgba(22,65,54,.35)] ring-1 ring-[#c9dbce]">
            <img src="/dr-frederick-parreira.png" alt="Dr. Frederick Parreira" className="h-full w-full object-cover object-top" />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#9b7a43]">Espaço de Saúde Integrativa</p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">Dr. Frederick Parreira</h1>
          <p className="mt-2 text-sm text-[#5d7069]">Psicólogo · CRP 04/86194<br />Biomédico · CRBM 30421</p>
        </header>

        <nav aria-label="Links principais" className="grid gap-3">
          {links.map(({ title, description, href, icon: Icon, primary }) => (
            <a
              key={title}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className={`group flex min-h-[76px] items-center gap-4 rounded-2xl border px-5 py-4 shadow-[0_8px_24px_-18px_rgba(22,65,54,.42)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_30px_-18px_rgba(22,65,54,.46)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f8f82] focus-visible:ring-offset-2 ${primary ? "border-[#17675b] bg-[#17675b] text-white hover:bg-[#12574d]" : "border-white/90 bg-white/85 text-[#173f3a] hover:border-[#b8d5c7] hover:bg-white"}`}
            >
              <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${primary ? "bg-white/15 text-white" : "bg-[#e7f1eb] text-[#26786e]"}`}>
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <strong className="block text-sm font-semibold sm:text-base">{title}</strong>
                <span className={`mt-1 block text-xs ${primary ? "text-white/75" : "text-[#71817b]"}`}>{description}</span>
              </span>
              <ArrowUpRight className={`size-4 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 ${primary ? "text-white/80" : "text-[#82948c]"}`} aria-hidden="true" />
            </a>
          ))}
        </nav>

        <footer className="mt-8 text-center text-[11px] text-[#7b8983]">
          <span>Juiz de Fora · Minas Gerais</span>
          <span className="mx-2 text-[#c3a870]">•</span>
          <a className="underline decoration-[#c9a96c]/60 underline-offset-4 hover:text-[#17675b]" href="https://drfredmartins.com.br/" target="_blank" rel="noopener noreferrer">Acessar o site</a>
        </footer>
      </section>
    </main>
  );
}
