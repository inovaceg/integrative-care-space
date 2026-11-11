import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { adminNavigation } from "@/components/admin/admin-ui";
import { Card, CardContent } from "@/components/ui/card";

export function DashboardNavigationCards() {
  return (
    <section aria-labelledby="dashboard-guides-title" className="mb-6">
      <div className="mb-4">
        <h2 id="dashboard-guides-title" className="font-display text-xl font-semibold text-[#163f3b]">Guias do painel</h2>
        <p className="mt-1 text-sm text-slate-600">Selecione uma área para acessar.</p>
      </div>
      <nav aria-label="Guias do dashboard" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {adminNavigation.filter(item => item.to !== "/admin/dashboard").map(({ label, to, icon: Icon }) => (
          <Link key={to} to={to} className="group rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2c5f4f] focus-visible:ring-offset-2">
            <Card className="h-full rounded-xl border-slate-200 bg-white shadow-sm transition-colors group-hover:border-[#b08d57]/60 group-hover:bg-[#f8fbf9]">
              <CardContent className="flex min-h-24 items-center gap-3 p-4">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#edf4ef] text-[#2c5f4f] transition-colors group-hover:bg-[#2c5f4f] group-hover:text-white">
                  <Icon aria-hidden="true" className="size-5" />
                </span>
                <span className="flex-1 text-sm font-semibold leading-5 text-[#163f3b]">{label}</span>
                <ArrowUpRight aria-hidden="true" className="size-4 shrink-0 text-slate-400 group-hover:text-[#8b6b3b]" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </nav>
    </section>
  );
}
