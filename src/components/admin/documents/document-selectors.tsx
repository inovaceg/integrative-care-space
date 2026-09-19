import { Brain, Stethoscope, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { areaSpecialties, professionalAreas, professionalName, type ProfessionalArea, type DocumentType } from '@/lib/admin/documents';

export function ProfessionalAreaSelector({ value, onChange, onContinue }: { value: ProfessionalArea | null; onChange: (value: ProfessionalArea) => void; onContinue: () => void }) {
  return (
    <section className="space-y-6 rounded-xl border border-slate-200 bg-white p-6">
      <h3 className="font-display text-xl">Em qual área profissional o documento será emitido?</h3>
      <div className="grid gap-4 md:grid-cols-2">
        {(Object.keys(professionalAreas) as ProfessionalArea[]).map(key => {
          const area = professionalAreas[key];
          const Icon = key === 'psicologia' ? Brain : Stethoscope;
          return (
            <button key={key} type="button" aria-pressed={value === key} onClick={() => onChange(key)} className={`flex flex-col items-start rounded-xl border-2 p-6 text-left transition-colors ${value === key ? 'border-[#2f8f82] bg-[#eff9f6]' : 'border-slate-200 hover:border-[#2f8f82]'}`}>
              <Icon className="mb-4 size-7 text-[#2f8f82]" />
              <strong className="block text-lg uppercase">{area.label}</strong>
              <p className="mt-4 text-sm font-semibold">{professionalName.toLocaleUpperCase('pt-BR')}</p>
              <p className="mt-2 text-sm text-slate-600">{key === 'psicologia' ? 'Dr. em Psicanálise • ' : ''}{area.title} • <span className="font-semibold text-[#21655f]">{area.registration}</span></p>
              <div className="mt-4 space-y-1 text-sm leading-6 text-slate-600">
                {areaSpecialties[key].map(specialty => <p key={specialty}>{specialty}</p>)}
              </div>
            </button>
          );
        })}
      </div>
      <Button disabled={!value} onClick={onContinue}>Continuar</Button>
    </section>
  );
}
export function DocumentTypeSelector({ area, value, onChange, onContinue, onBack }: { area: ProfessionalArea; value: DocumentType | null; onChange: (value: DocumentType) => void; onContinue: () => void; onBack: () => void }) {
  return <section className="space-y-6 rounded-xl border border-slate-200 bg-white p-6"><h3 className="font-display text-xl">Tipo de documento — {professionalAreas[area].label}</h3><div className="grid gap-3 sm:grid-cols-2">{professionalAreas[area].types.map(type => <button type="button" key={type} aria-pressed={value === type} onClick={() => onChange(type)} className={`flex items-center gap-3 rounded-xl border-2 p-5 text-left ${value === type ? 'border-[#2f8f82] bg-[#eff9f6]' : 'border-slate-200'}`}><FileText className="size-5 shrink-0 text-[#2f8f82]" />{type}</button>)}</div><div className="flex gap-3"><Button variant="outline" onClick={onBack}>Voltar</Button><Button disabled={!value} onClick={onContinue}>Continuar</Button></div></section>;
}
