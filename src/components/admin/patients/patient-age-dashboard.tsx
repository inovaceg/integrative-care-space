import { UsersRound } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ageGroupCounts } from "@/lib/admin/patient-demographics";
import type { PatientRecord } from "@/lib/admin/records";

export function PatientAgeDashboard({ patients }: { patients: PatientRecord[] }) {
  const { counts, unknown } = ageGroupCounts(patients);
  const highest = Math.max(1, ...counts.map((item) => item.count));
  return <Card className="mt-6 border-slate-200/80 shadow-sm">
    <CardContent className="p-5 sm:p-6">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div><p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#2f8f82]">Perfil da base</p><h2 className="mt-1 font-display text-lg font-semibold text-slate-900">Pacientes por faixa etária</h2><p className="mt-1 text-sm text-slate-500">Distribuição da seleção atual — {patients.length} paciente(s)</p></div>
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#e7f3ef] text-[#216d64]"><UsersRound className="size-5" /></span>
      </div>
      {patients.length === 0 ? <p className="rounded-lg bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">Nenhum paciente corresponde aos filtros.</p> : <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
        {counts.map((item) => <div key={item.label}>
          <div className="mb-1.5 flex items-center justify-between text-sm"><span className="font-medium text-slate-700">{item.label} anos</span><span className="tabular-nums text-slate-500">{item.count}</span></div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100" role="img" aria-label={`${item.count} pacientes com ${item.label} anos`}><div className="h-full rounded-full bg-[#176b62] transition-[width] duration-500" style={{ width: `${(item.count / highest) * 100}%` }} /></div>
        </div>)}
        {unknown > 0 && <p className="text-xs text-slate-500">Sem data de nascimento: {unknown}</p>}
      </div>}
    </CardContent>
  </Card>;
}
