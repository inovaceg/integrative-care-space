import { Link } from "@tanstack/react-router";
import { Menu, MessageCircle, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { navItems, whatsappUrl } from "@/lib/site-data";

export function Brand() {
  return (
    <Link to="/" className="group flex min-w-0 items-center gap-3" aria-label="Ir para o início">
      <span className="grid size-11 shrink-0 place-items-center border border-gold/45 font-display text-3xl text-gold transition-colors group-hover:border-gold">Ψ</span>
      <span className="min-w-0 leading-tight">
        <strong className="block truncate font-display text-lg font-medium text-foreground">Dr. Frederick Parreira</strong>
        <span className="block truncate text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Espaço de Saúde Integrativa</span>
      </span>
    </Link>
  );
}

export function Header() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/95 backdrop-blur-xl">
      <div className="container-site grid min-h-20 grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <Brand />
        <nav className="hidden items-center gap-1 xl:flex" aria-label="Navegação principal">
          {navItems.map(([label, to]) => <Link key={to} to={to} activeProps={{ className: "text-primary" }} className="px-2.5 py-3 text-sm text-muted-foreground transition-colors hover:text-foreground">{label}</Link>)}
          <Button asChild size="lg" className="ml-2"><a href={whatsappUrl} target="_blank" rel="noreferrer"><MessageCircle /> Agende sua consulta</a></Button>
        </nav>
        <div className="flex items-center gap-2 xl:hidden">
          <Button asChild size="sm" className="hidden sm:inline-flex"><a href={whatsappUrl} target="_blank" rel="noreferrer">Agendar</a></Button>
          <Button variant="ghost" size="icon" onClick={() => setOpen((v) => !v)} aria-label={open ? "Fechar menu" : "Abrir menu"} aria-expanded={open}>{open ? <X /> : <Menu />}</Button>
        </div>
      </div>
      {open && <nav className="border-t border-border bg-background px-5 py-4 xl:hidden" aria-label="Navegação móvel">
        <div className="mx-auto grid max-w-xl grid-cols-2 gap-1">
          {navItems.map(([label, to]) => <Link key={to} to={to} onClick={() => setOpen(false)} className="rounded-sm px-3 py-3 text-sm font-medium hover:bg-muted">{label}</Link>)}
          <Button asChild className="col-span-2 mt-2"><a href={whatsappUrl} target="_blank" rel="noreferrer"><MessageCircle /> Agende sua consulta</a></Button>
        </div>
      </nav>}
    </header>
  );
}

export function Footer() {
  return (
    <footer className="bg-footer text-footer-foreground">
      <div className="container-site grid gap-10 py-14 lg:grid-cols-[1.2fr_1fr_1fr]">
        <div><div className="font-display text-2xl">Espaço de Saúde Integrativa</div><p className="mt-3 text-sm leading-7 text-footer-muted">Dr. Frederick Parreira<br />Psicólogo • CRP 04/86194<br />Biomédico • CRBM 30421</p></div>
        <div><h2 className="text-xs font-bold uppercase tracking-[0.18em] text-gold-soft">Endereço</h2><address className="mt-3 text-sm not-italic leading-7 text-footer-muted">Rua Fernando Lobo, 102 — Sala 704<br />Centro — Juiz de Fora/MG<br /><a className="hover:text-footer-foreground" href="tel:+5532991931779">(32) 99193-1779</a></address></div>
        <div><h2 className="text-xs font-bold uppercase tracking-[0.18em] text-gold-soft">Navegue</h2><nav className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-footer-muted">{navItems.filter((_, i) => i !== 5 && i !== 7).map(([label, to]) => <Link key={to} to={to} className="hover:text-footer-foreground">{label}</Link>)}<Link to="/politica-de-privacidade" className="hover:text-footer-foreground">Privacidade</Link><Link to="/termos-de-uso" className="hover:text-footer-foreground">Termos de Uso</Link></nav></div>
      </div>
      <div className="border-t border-footer-line"><div className="container-site py-5 text-xs text-footer-muted">© 2026 Espaço de Saúde Integrativa Dr. Frederick Parreira. Todos os direitos reservados.</div></div>
    </footer>
  );
}

export function WhatsAppFloat() {
  return <a href={whatsappUrl} target="_blank" rel="noreferrer" aria-label="Falar pelo WhatsApp" className="fixed bottom-5 right-5 z-40 grid size-14 place-items-center rounded-full bg-whatsapp text-whatsapp-foreground shadow-float transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><MessageCircle className="size-6" /></a>;
}

export function SiteLayout({ children }: { children: React.ReactNode }) {
  return <><Header /><main>{children}</main><Footer /><WhatsAppFloat /></>;
}