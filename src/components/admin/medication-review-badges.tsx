import type { MedicationRecord } from "@/lib/admin/types";
import { medicationReviewFlags } from "@/lib/admin/medication-observation-report";

const toneClasses = {
  amber: "border-amber-200 bg-amber-50 text-amber-800",
  rose: "border-rose-200 bg-rose-50 text-rose-800",
  slate: "border-slate-200 bg-slate-50 text-slate-700",
  teal: "border-emerald-200 bg-emerald-50 text-emerald-800",
} as const;

export function MedicationReviewBadges({ medication }: { medication: MedicationRecord }) {
  return <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Indicadores internos de revisão">
    {medicationReviewFlags(medication).map((flag) => <span key={flag.label} className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium leading-4 ${toneClasses[flag.tone]}`}>{flag.label}</span>)}
  </div>;
}
