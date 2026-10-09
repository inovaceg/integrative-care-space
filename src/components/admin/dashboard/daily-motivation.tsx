import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { getDailyMotivation } from "@/lib/daily-motivation";

export function DailyMotivation() {
  const [message, setMessage] = useState("");

  useEffect(() => {
    const update = () => setMessage(getDailyMotivation());
    update();
    const timer = window.setInterval(update, 60000);
    window.addEventListener("focus", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);

  return <div className="mt-3 max-w-2xl border-t border-slate-100 pt-3" aria-live="polite">
    <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-[#2f8f82]"><Sparkles className="size-3.5" /> Inspiração do dia</p>
    <p className="min-h-5 text-sm leading-relaxed text-slate-600">{message}</p>
  </div>;
}
