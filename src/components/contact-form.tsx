import { useState, type FormEvent } from "react";
import { CheckCircle2, LoaderCircle, MessageCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { trackAnalyticsEvent } from "@/lib/analytics";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { whatsappNumber } from "@/lib/site-data";
import { supabase } from "@/integrations/supabase/client";

const interests = ["Psicologia", "Neuropsicologia", "Sexologia", "Biomedicina Integrativa", "Emagrecimento", "Estética", "Dor crônica", "Acupuntura", "Laserterapia / ILIB", "Outro"];
const intakeFunctionName = "neuropsych-contact-intake";

export function ContactForm() {
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [whatsappLink, setWhatsappLink] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    if (!agreed) { setError("Você precisa concordar com a Política de Privacidade."); return; }

    const data = new FormData(form);
    const name = String(data.get("name")).trim();
    const phone = String(data.get("phone")).trim();
    const message = `Olá! Vim pelo site do Dr. Frederick Parreira.\n\nNome: ${name}\nTelefone: ${phone}\nE-mail: ${String(data.get("email")).trim()}\nÁrea de interesse: ${String(data.get("interest"))}\nMensagem: ${String(data.get("message")).trim()}`;
    setError("");
    setSubmitting(true);
    try {
      const { data: result, error: intakeError } = await supabase.functions.invoke(intakeFunctionName, {
        body: { name, whatsapp: phone, requestType: "Solicitar uma conversa inicial", consent: agreed },
      });
      if (intakeError || !result?.received) throw new Error("Não foi possível registrar seu contato. Tente novamente.");
      trackAnalyticsEvent("contact_form_submitted");
      setWhatsappLink(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível registrar seu contato. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  if (whatsappLink) {
    return <div className="rounded-2xl border border-[#cfe8e1] bg-[#f2faf7] p-6" role="status">
      <CheckCircle2 className="size-8 text-[#26786e]" />
      <h3 className="mt-3 font-display text-xl font-semibold text-slate-900">Contato registrado</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">Seu nome e WhatsApp foram registrados para que a equipe possa dar continuidade ao atendimento. A mensagem não é armazenada no site.</p>
      <a href={whatsappLink} target="_blank" rel="noreferrer" className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-[#2f8f82] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#26796e]"><MessageCircle className="size-4" />Continuar pelo WhatsApp</a>
    </div>;
  }

  return <form onSubmit={event => void submit(event)} className="content-card grid gap-5">
    <div className="grid gap-5 sm:grid-cols-2">
      <Field label="Nome" id="name"><Input id="name" name="name" required maxLength={100} autoComplete="name" /></Field>
      <Field label="WhatsApp com DDD" id="phone"><Input id="phone" name="phone" type="tel" inputMode="tel" required maxLength={20} autoComplete="tel" placeholder="(32) 99999-9999" /></Field>
    </div>
    <Field label="E-mail" id="email"><Input id="email" name="email" type="email" required maxLength={255} autoComplete="email" /></Field>
    <Field label="Área de interesse" id="interest"><select id="interest" name="interest" required defaultValue="" className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"><option value="" disabled>Selecione uma opção</option>{interests.map(item => <option key={item}>{item}</option>)}</select></Field>
    <Field label="Mensagem" id="message"><Textarea id="message" name="message" required maxLength={1000} rows={5} placeholder="Conte apenas o necessário para iniciarmos o contato. Não inclua informações clínicas sensíveis." /></Field>
    <div className="flex items-start gap-3"><Checkbox id="privacy" checked={agreed} onCheckedChange={value => { setAgreed(value === true); setError(""); }} aria-describedby={error ? "privacy-error" : undefined} /><Label htmlFor="privacy" className="text-sm leading-6">Autorizo o registro do meu nome e WhatsApp para retorno sobre este pedido. Li o <a href="/politica-de-privacidade" className="font-semibold underline underline-offset-4">Aviso de Privacidade</a>.</Label></div>
    {error && <p id="privacy-error" role="alert" className="text-sm text-destructive">{error}</p>}
    <Button type="submit" size="lg" className="w-full sm:w-fit" disabled={submitting || !agreed}>{submitting ? <><LoaderCircle className="animate-spin" />Registrando…</> : <>Enviar mensagem <Send /></>}</Button>
    <p className="text-xs leading-5 text-muted-foreground">Seu nome e WhatsApp são registrados para retorno. E-mail, área de interesse e mensagem serão usados apenas para preparar a conversa no WhatsApp.</p>
  </form>;
}

function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return <div className="grid gap-2"><Label htmlFor={id}>{label}</Label>{children}</div>;
}
