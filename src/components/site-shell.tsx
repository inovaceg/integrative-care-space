import { Link } from "@tanstack/react-router";
import { Instagram, Menu, MessageCircle, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { trackAnalyticsEvent, trackAnalyticsEvents } from "@/lib/analytics";
import { navItemsAfterQuestionnaires, navItemsBeforeQuestionnaires, whatsappUrl } from "@/lib/site-data";

export function Brand() {
  return <Link to="/" className="group flex min-w-0 items-center gap-3" aria-label="Ir para o início"><span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary font-display text-2xl text-primary-foreground transition-transform group-hover:-rotate-3">Ψ</span><span className="min-w-0 leading-tight"><strong className="block truncate font-display text-base font-semibold text-foreground">Dr. Frederick Parreira</strong><span className="block truncate text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Espaço de Saúde Integrativa</span></span></Link>;
}

export function Header({ minimal = false }: { minimal?: boolean }) {
  const [open, setOpen] = useState(false);
  if (minimal) return null;
  const links = [...navItemsBeforeQuestionnaires, ...navItemsAfterQuestionnaires];
  return <header className="sticky top-0 z-50 border-b border-border/70 bg-background/95 backdrop-blur-xl">
    <div className="mx-auto flex min-h-20 w-[calc(100%-2rem)] max-w-[96rem] items-center justify-between gap-4"><Brand />
      <nav className="hidden items-center gap-3 xl:flex" aria-label="Navegação principal">{links.map(([label, to]) => <Link key={to} to={to} activeProps={{ className: "text-primary" }} className="whitespace-nowrap px-1 py-2.5 text-sm font-semibold text-foreground/85 transition-colors hover:text-primary">{label}</Link>)}<Button asChild className="ml-2"><a href={whatsappUrl} target="_blank" rel="noopener noreferrer" onClick={() => trackAnalyticsEvents(["appointment_click", "whatsapp_click"])}>Agendar</a></Button></nav>
      <div className="flex items-center gap-2 xl:hidden"><Button asChild size="sm" className="hidden sm:inline-flex"><a href={whatsappUrl} target="_blank" rel="noopener noreferrer" onClick={() => trackAnalyticsEvents(["appointment_click", "whatsapp_click"])}>Agendar</a></Button><Button variant="ghost" size="icon" onClick={() => setOpen(value => !value)} aria-label={open ? "Fechar menu" : "Abrir menu"} aria-expanded={open}>{open ? <X /> : <Menu />}</Button></div>
    </div>
    {open && <nav className="border-t border-border bg-background px-5 py-4 xl:hidden" aria-label="Navegação móvel"><div className="mx-auto grid max-w-xl grid-cols-2 gap-1">{links.map(([label, to]) => <Link key={to} to={to} onClick={() => setOpen(false)} className="rounded-sm px-3 py-3 text-sm font-semibold text-foreground hover:bg-muted">{label}</Link>)}<Link to="/biomedicina" onClick={() => setOpen(false)} className="rounded-sm px-3 py-3 text-sm font-semibold text-foreground hover:bg-muted">Biomedicina</Link><Button asChild className="col-span-2 mt-2"><a href={whatsappUrl} target="_blank" rel="noopener noreferrer" onClick={() => trackAnalyticsEvents(["appointment_click", "whatsapp_click"])}><MessageCircle className="mr-2 size-4" />Agendar pelo WhatsApp</a></Button></div></nav>}
  </header>;
}

export function Footer() {
  return <footer className="bg-footer text-footer-foreground"><div className="container-site grid gap-10 py-14 lg:grid-cols-[1.2fr_1fr_1fr]">
    <div><div className="font-display text-2xl">Espaço de Saúde Integrativa</div><p className="mt-3 text-sm leading-7 text-footer-muted">Dr. Frederick Parreira<br />Psicólogo • CRP 04/86194<br />Biomédico • CRBM 30421</p><a href="https://www.instagram.com/fredmartinsjf/" target="_blank" rel="noopener noreferrer" aria-label="Instagram do Dr. Frederick Parreira: @fredmartinsjf (abre em nova aba)" className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-sm text-sm text-footer-foreground transition-colors hover:text-gold-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-soft focus-visible:ring-offset-2 focus-visible:ring-offset-footer"><Instagram className="size-5" aria-hidden="true" /><span>@fredmartinsjf</span></a></div>
    <div><h2 className="text-xs font-bold uppercase tracking-[0.18em] text-gold-soft">Endereço</h2><address className="mt-3 text-sm not-italic leading-7 text-footer-muted">Edifício Comendador Pedro Procópio R. Valle<br />Avenida Barão do Rio Branco, 2555<br />Sala 205 — Espaço Humanizze<br />Centro — Juiz de Fora/MG<br /><a className="hover:text-footer-foreground" href="tel:+5532935027080">(32) 93502-7080</a></address></div>
    <div><h2 className="text-xs font-bold uppercase tracking-[0.18em] text-gold-soft">Navegue</h2><nav className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-footer-muted"><Link to="/psicologia" className="hover:text-footer-foreground">Psicologia</Link><Link to="/orientacao-tdah" className="hover:text-footer-foreground">Orientação sobre TDAH</Link><Link to="/avaliacao-neuropsicologica" className="hover:text-footer-foreground">Avaliação Neuropsicológica</Link><Link to="/biomedicina" className="hover:text-footer-foreground">Biomedicina</Link><Link to="/servicos" className="hover:text-footer-foreground">Serviços</Link><Link to="/sobre" className="hover:text-footer-foreground">Sobre</Link><Link to="/faq" className="hover:text-footer-foreground">FAQ</Link><Link to="/contato" className="hover:text-footer-foreground">Contato</Link><Link to="/politica-de-privacidade" className="hover:text-footer-foreground">Privacidade</Link><Link to="/termos-de-uso" className="hover:text-footer-foreground">Termos de Uso</Link></nav></div>
  </div><div className="border-t border-footer-line"><div className="container-site py-5 text-center text-xs text-footer-muted">© 2026 Espaço de Saúde Integrativa Dr. Frederick Parreira. Todos os direitos reservados. | Criação e desenvolvimento: Felipe Cal.</div></div></footer>;
}

export function WhatsAppFloat() {
  return <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" aria-label="Agendar pelo WhatsApp" onClick={() => trackAnalyticsEvent("whatsapp_click")} className="fixed bottom-4 right-4 z-40 grid size-14 place-items-center rounded-full bg-whatsapp text-whatsapp-foreground shadow-float transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:bottom-5 sm:right-5"><MessageCircle className="size-6" /></a>;
}

export function SiteLayout({ children, minimalHeader = false }: { children: React.ReactNode; minimalHeader?: boolean }) {
  return <><Header minimal={minimalHeader} /><main>{children}</main><Footer /><WhatsAppFloat /></>;
}
