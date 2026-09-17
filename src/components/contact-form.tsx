import { useState, type FormEvent } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { trackAnalyticsEvent } from "@/lib/analytics";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { whatsappNumber } from "@/lib/site-data";

const interests = ["Psicologia", "Neuropsicologia", "Sexologia", "Biomedicina Integrativa", "Emagrecimento", "Estética", "Dor crônica", "Acupuntura", "Laserterapia / ILIB", "Outro"];

export function ContactForm() {
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState("");
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.checkValidity()) { form.reportValidity(); return; }
    if (!agreed) { setError("Você precisa concordar com a Política de Privacidade."); return; }
    const data = new FormData(form);
    const message = `Olá! Vim pelo site do Dr. Frederick Parreira.\n\nNome: ${String(data.get("name")).trim()}\nTelefone: ${String(data.get("phone")).trim()}\nE-mail: ${String(data.get("email")).trim()}\nÁrea de interesse: ${String(data.get("interest"))}\nMensagem: ${String(data.get("message")).trim()}`;
    trackAnalyticsEvent("contact_form_submitted");
    window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  }
  return <form onSubmit={submit} className="content-card grid gap-5" noValidate>
    <div className="grid gap-5 sm:grid-cols-2"><Field label="Nome" id="name"><Input id="name" name="name" required maxLength={100} autoComplete="name" /></Field><Field label="Telefone" id="phone"><Input id="phone" name="phone" type="tel" required maxLength={20} autoComplete="tel" /></Field></div>
    <Field label="E-mail" id="email"><Input id="email" name="email" type="email" required maxLength={255} autoComplete="email" /></Field>
    <Field label="Área de interesse" id="interest"><select id="interest" name="interest" required defaultValue="" className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"><option value="" disabled>Selecione uma opção</option>{interests.map((item) => <option key={item}>{item}</option>)}</select></Field>
    <Field label="Mensagem" id="message"><Textarea id="message" name="message" required maxLength={1000} rows={5} placeholder="Conte apenas o necessário para iniciarmos o contato. Não inclua informações clínicas sensíveis." /></Field>
    <div className="flex items-start gap-3"><Checkbox id="privacy" checked={agreed} onCheckedChange={(v) => { setAgreed(v === true); setError(""); }} aria-describedby={error ? "privacy-error" : undefined} /><Label htmlFor="privacy" className="text-sm leading-6">Li e concordo com a <a href="/politica-de-privacidade" className="font-semibold underline underline-offset-4">Política de Privacidade</a>.</Label></div>
    {error && <p id="privacy-error" role="alert" className="text-sm text-destructive">{error}</p>}
    <Button type="submit" size="lg" className="w-full sm:w-fit">Enviar mensagem <Send /></Button>
    <p className="text-xs leading-5 text-muted-foreground">Ao enviar, sua mensagem será aberta no WhatsApp. Este formulário não armazena dados no site.</p>
  </form>;
}
function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) { return <div className="grid gap-2"><Label htmlFor={id}>{label}</Label>{children}</div>; }