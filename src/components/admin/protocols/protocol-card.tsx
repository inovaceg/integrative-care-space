import { Card } from "@/components/ui/card";
import type { ClinicalProtocol } from "@/lib/admin/protocols";

export function ProtocolCard({ protocol, id }: { protocol: ClinicalProtocol; id: string }) {
  return <Card id={id} className="scroll-mt-6 gap-0 overflow-hidden rounded-lg border border-[#d9e1e9] bg-white py-0 shadow-sm">
    <header className="flex items-center gap-5 border-b-2 border-[#c19a51] bg-[#102e4e] px-5 py-4 sm:gap-7 sm:px-6">
      <span className="shrink-0 text-2xl font-bold tabular-nums text-[#c9a052] sm:text-3xl">{protocol.number}</span>
      <div className="min-w-0">
        {protocol.category && <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#d0aa63]">{protocol.category}</p>}
        <h3 className="text-lg font-bold leading-snug text-white sm:text-xl">{protocol.title}</h3>
      </div>
    </header>
    <dl className="divide-y divide-[#d9e1e9]">
      {protocol.fields.map((field, index) => <div key={`${index}-${field.label}`} className="grid sm:grid-cols-[190px_minmax(0,1fr)]">
        <dt className="bg-[#f3f6f9] px-4 py-3 text-xs font-bold uppercase leading-5 text-[#102e4e] sm:px-6">{field.label}</dt>
        <dd className="min-w-0 whitespace-pre-wrap break-words px-4 py-3 text-base leading-7 text-slate-700 sm:px-5">{field.value.split(/(\d+(?:[.,]\d+)?\s*(?:mcg|mg|ml|g|%))/gi).map((part, partIndex) => partIndex % 2 === 1 ? <strong key={partIndex} className="font-semibold text-[#245882]">{part}</strong> : part)}</dd>
      </div>)}
    </dl>
  </Card>;
}
