import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { anamnesisFieldLabels } from '@/lib/admin/psychological-anamnesis-content';
import type { PsychologicalAnswers } from '@/lib/admin/psychological-anamnesis';

type AnswerValue = string | number | boolean | string[];

type Props = {
  answers: PsychologicalAnswers;
  onChange: (key: string, value: AnswerValue) => void;
};

export function AnamnesisAnswerEditor({ answers, onChange }: Props) {
  const editableEntries = [...new Set([...Object.keys(anamnesisFieldLabels), ...Object.keys(answers)])]
    .filter(key => !['date_of_birth', 'signed_name', 'consent_accepted'].includes(key))
    .map(key => [key, answers[key] ?? ''] as const);

  return <div className="grid gap-4 lg:grid-cols-2">
    {editableEntries.map(([key, value]) => <div key={key} className="space-y-2 rounded-xl border border-slate-200 bg-white p-4">
      <label className="block text-sm font-semibold text-slate-700" htmlFor={`answer-${key}`}>{anamnesisFieldLabels[key] ?? key.replaceAll('_', ' ')}</label>
      {typeof value === 'boolean' ? <label className="flex items-center gap-2 text-sm text-slate-700"><input id={`answer-${key}`} type="checkbox" checked={value} onChange={event => onChange(key, event.target.checked)} className="size-4 accent-[#17675b]" />{value ? 'Sim' : 'Não'}</label>
        : Array.isArray(value) ? <Textarea id={`answer-${key}`} rows={3} value={value.join('\n')} onChange={event => onChange(key, event.target.value.split('\n').map(item => item.trim()).filter(Boolean))} />
          : typeof value === 'number' ? <Input id={`answer-${key}`} type="number" min={0} max={10} value={value} onChange={event => onChange(key, event.target.value === '' ? '' : Number(event.target.value))} />
            : <Textarea id={`answer-${key}`} rows={typeof value === 'string' && value.length > 120 ? 4 : 2} value={String(value)} onChange={event => onChange(key, event.target.value)} />}
    </div>)}
  </div>;
}
