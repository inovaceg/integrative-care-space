import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const currentDay = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

export function DailyMotivation({ userId }: { userId: string }) {
  const [day, setDay] = useState(currentDay);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => setDay(currentDay()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setMessage("");
    setError("");
    async function load() {
      try {
        const endpoint = new URL("https://fusqpjescampwoyazceu.supabase.co/functions/v1/daily-motivation");
        // O SDK já adiciona a URL base; invoke recebe apenas o nome da função.
        const functionName = endpoint.pathname.split("/").pop()!;
        const { data, error: requestError } = await supabase.functions.invoke(functionName, { body: {} });
        if (requestError) {
          let detail = "Não foi possível carregar a mensagem diária.";
          if (requestError.context instanceof Response) {
            const body = await requestError.context.json().catch(() => null);
            if (typeof body?.error === "string") detail = body.error;
          }
          throw new Error(detail);
        }
        if (typeof data?.message !== "string") throw new Error("Não foi possível carregar a mensagem diária.");
        if (active) setMessage(data.message);
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "Mensagem diária indisponível.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [userId, day, retry]);

  return <div className="mt-3 max-w-2xl border-t border-slate-100 pt-3" aria-live="polite">
    <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-[#2f8f82]"><Sparkles className="size-3.5" /> Inspiração do dia</p>
    {loading ? <p className="text-sm text-slate-500">Preparando sua mensagem do dia...</p> : error ? <div className="flex flex-wrap items-center gap-x-2"><p className="text-xs text-slate-500">{error}</p><Button variant="link" size="sm" className="h-auto px-0 py-1 text-xs text-[#2f8f82]" onClick={() => setRetry((value) => value + 1)}>Tentar novamente</Button></div> : <p className="text-sm leading-relaxed text-slate-600">{message}</p>}
  </div>;
}
