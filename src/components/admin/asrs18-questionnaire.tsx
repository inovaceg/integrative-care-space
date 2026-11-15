import { useMemo } from 'react';

export const asrs18ContentKey = 'ASRS-18 · respostas';
export const asrs18IdentificationKey = 'ASRS-18 · identificação';

export const asrs18Questions = [
  { part: 'A', text: 'Com que frequência você comete erros por falta de atenção quando tem de trabalhar num projeto chato ou difícil?' },
  { part: 'A', text: 'Com que frequência você tem dificuldade para manter a atenção quando está fazendo um trabalho chato ou repetitivo?' },
  { part: 'A', text: 'Com que frequência você tem dificuldade para se concentrar no que as pessoas dizem, mesmo quando elas estão falando diretamente com você?' },
  { part: 'A', text: 'Com que frequência você deixa um projeto pela metade depois de já ter feito as partes mais difíceis?' },
  { part: 'A', text: 'Com que frequência você tem dificuldade para fazer um trabalho que exija organização?' },
  { part: 'A', text: 'Quando você precisa fazer algo que exija muita concentração, com que frequência você evita ou adia o início?' },
  { part: 'A', text: 'Com que frequência você coloca as coisas fora do lugar ou tem dificuldade de encontrar as coisas em casa ou no trabalho?' },
  { part: 'A', text: 'Com que frequência você se distrai com atividades ou barulho à sua volta?' },
  { part: 'A', text: 'Com que frequência você tem dificuldade para lembrar-se de compromissos ou obrigações?' },
  { part: 'B', text: 'Com que frequência você fica se mexendo na cadeira ou balançando as mãos ou os pés quando precisa ficar sentado(a) por muito tempo?' },
  { part: 'B', text: 'Com que frequência você se levanta da cadeira em reuniões ou em outras situações onde deveria ficar sentado(a)?' },
  { part: 'B', text: 'Com que frequência você se sente inquieto(a) ou agitado(a)?' },
  { part: 'B', text: 'Com que frequência você tem dificuldade para sossegar e relaxar quando tem tempo livre para você?' },
  { part: 'B', text: 'Com que frequência você se pega falando demais em situações sociais?' },
  { part: 'B', text: 'Com que frequência você se sente ativo(a) demais e necessitando fazer coisas, como se estivesse “com o motor ligado”?' },
  { part: 'B', text: 'Quando você está conversando, com que frequência você se pega terminando as frases das pessoas antes delas?' },
  { part: 'B', text: 'Com que frequência você tem dificuldade para esperar nas situações onde cada um tem a sua vez?' },
  { part: 'B', text: 'Com que frequência você interrompe os outros quando eles estão ocupados?' },
] as const;

export const asrs18Options = ['Nunca', 'Raramente', 'Às vezes', 'Frequentemente', 'Muito frequentemente'] as const;
type Responses = Record<number, number>;
export type Asrs18Identification = { author: string; requester: string; purpose: string; patientName: string; birthDate: string; age: string };

function parseResponses(value: string): Responses {
  try {
    const parsed = JSON.parse(value) as Responses;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function formatAsrs18Identification(value: Asrs18Identification) {
  return [
    `Autoria: ${value.author || 'Não informada'}`,
    `Solicitante: ${value.requester || 'Não informado'}`,
    `Finalidade: ${value.purpose || 'Não informada'}`,
    `Paciente: ${value.patientName || 'Não informada'}`,
    `Data de nascimento: ${value.birthDate || 'Não informada'}`,
    `Idade: ${value.age || 'Não informada'}`,
  ].join('\n');
}

export function formatAsrs18Responses(value: string) {
  if (!value) return '';
  const responses = parseResponses(value);
  if (!Object.keys(responses).length) return '';
  const lines = ['Parte A — Desatenção', ...asrs18Questions.slice(0, 9).map((question, index) => `${index + 1}. ${question.text} — ${asrs18Options[responses[index] ?? -1] ?? 'Sem resposta'}`), 'Parte B — Hiperatividade/Impulsividade', ...asrs18Questions.slice(9).map((question, index) => `${index + 10}. ${question.text} — ${asrs18Options[responses[index + 9] ?? -1] ?? 'Sem resposta'}`), 'Registro descritivo das respostas; sem cálculo ou interpretação automática.'];
  return lines.join('\n');
}

export function Asrs18Questionnaire({ value, onChange, identification, onIdentificationChange, disabled = false }: { value: string; onChange: (value: string) => void; identification: Asrs18Identification; onIdentificationChange: (value: Asrs18Identification) => void; disabled?: boolean }) {
  const responses = useMemo(() => parseResponses(value), [value]);

  function choose(questionIndex: number, optionIndex: number) {
    onChange(JSON.stringify({ ...responses, [questionIndex]: optionIndex }));
  }

  function updateIdentification(field: 'author' | 'requester' | 'purpose', fieldValue: string) {
    onIdentificationChange({ ...identification, [field]: fieldValue });
  }

  return <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
    <div className="border-b border-slate-200 px-4 py-3"><h3 className="font-semibold text-slate-800">ASRS-18 · autorrelato</h3><p className="mt-1 text-sm leading-6 text-slate-600">Assinale uma frequência para cada item. Registre as respostas para revisão profissional; esta tela não calcula escores nem produz interpretação diagnóstica.</p></div>
    <section className="grid gap-4 border-b border-slate-200 p-4" aria-labelledby="asrs18-identification-title">
      <h4 id="asrs18-identification-title" className="font-semibold text-slate-800">Identificação do Laudo</h4>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-1.5 text-sm font-medium text-slate-700">Autoria<Input value={identification.author} onChange={(event) => updateIdentification('author', event.target.value)} disabled={disabled} /></label>
        <label className="grid gap-1.5 text-sm font-medium text-slate-700">Solicitante<Input value={identification.requester} onChange={(event) => updateIdentification('requester', event.target.value)} placeholder="Quem solicitou o laudo" disabled={disabled} /></label>
        <label className="grid gap-1.5 text-sm font-medium text-slate-700 md:col-span-2">Finalidade<textarea value={identification.purpose} onChange={(event) => updateIdentification('purpose', event.target.value)} placeholder="Relatar o motivo pelo qual o laudo foi solicitado e o contexto em que será utilizado." disabled={disabled} rows={3} className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-800 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f8f82] disabled:cursor-not-allowed disabled:bg-slate-50" /></label>
      </div>
      <div><h5 className="mb-3 text-sm font-semibold text-slate-800">Identificação do Paciente</h5><div className="grid gap-4 md:grid-cols-2"><label className="grid gap-1.5 text-sm font-medium text-slate-700 md:col-span-2">Nome<Input value={identification.patientName} readOnly /></label><label className="grid gap-1.5 text-sm font-medium text-slate-700">Data de nascimento<Input value={identification.birthDate} readOnly /></label><label className="grid gap-1.5 text-sm font-medium text-slate-700">Idade<Input value={identification.age} readOnly /></label></div></div>
    </section>
    {(['A', 'B'] as const).map((part) => <fieldset key={part} className="border-b border-slate-200 last:border-b-0">
      <legend className="px-4 py-3 font-semibold text-slate-800">{part === 'A' ? 'Parte A (Desatenção)' : 'Parte B (Hiperatividade/Impulsividade)'}</legend>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-sm">
          <thead><tr className="bg-slate-50 text-slate-700"><th scope="col" className="w-10 border border-slate-200 px-2 py-3 text-left">#</th><th scope="col" className="min-w-[390px] border border-slate-200 px-3 py-3 text-left">Questões</th>{asrs18Options.map((option) => <th scope="col" key={option} className="w-[86px] border border-slate-200 px-2 py-3 text-center text-xs leading-4">{option}</th>)}</tr></thead>
          <tbody>{asrs18Questions.map((question, index) => ({ question, index })).filter(({ question }) => question.part === part).map(({ question, index }) => <tr key={index} className="align-middle hover:bg-slate-50/70"><th scope="row" className="border border-slate-200 px-2 py-3 text-left font-normal text-slate-600">{index + 1}</th><td className="border border-slate-200 px-3 py-3 leading-6 text-slate-700">{question.text}</td>{asrs18Options.map((option, optionIndex) => <td key={option} className="border border-slate-200 px-2 py-3 text-center"><input type="radio" name={`asrs18-${part}-${index}`} value={optionIndex} checked={responses[index] === optionIndex} onChange={() => choose(index, optionIndex)} disabled={disabled} aria-label={`Questão ${index + 1}: ${option}`} className="size-5 accent-[#2f8f82]" /></td>)}</tr>)}</tbody>
        </table>
      </div>
    </fieldset>)}
  </div>;
}
