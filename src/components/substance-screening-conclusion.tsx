import { AlertTriangle, CheckCircle2, MessageCircle, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { whatsappUrl } from '@/lib/site-data';

type ScreeningConclusionProps = {
  answers: Record<string, unknown>;
  urgent: boolean;
};

const safetyLabels: Record<string, string> = {
  overdose: 'Suspeita de overdose ou ingestão potencialmente perigosa',
  intoxication: 'Intoxicação grave neste momento',
  breathing: 'Dificuldade para respirar',
  unconscious: 'Perda de consciência ou dificuldade para despertar',
  seizure: 'Convulsões',
  withdrawal: 'Abstinência intensa ou potencialmente grave',
  suicide: 'Pensamentos de suicídio ou risco imediato de se machucar',
  violence: 'Violência ou ameaça acontecendo neste momento',
};

const labels: Record<string, string> = {
  history: 'Histórico de uso',
  experiment: 'Experiência com uso',
  experimented: 'Já experimentou',
  frequency: 'Frequência de uso',
  duration: 'Há quanto tempo',
  quantity: 'Quantidade ou padrão relatado',
  control: 'Controle, redução ou interrupção',
  withdrawal: 'Sintomas ao reduzir ou interromper',
  impacts: 'Impactos percebidos',
  consequences: 'Consequências percebidas',
  treatments: 'Cuidados ou tratamentos anteriores',
  motivation: 'O que gostaria que acontecesse',
  reason: 'Motivo para buscar esta avaliação',
  observations: 'Informações adicionais',
  development: 'Mudanças no desenvolvimento, sono, alimentação ou saúde',
  behavior: 'Mudanças de comportamento percebidas',
  family_school: 'Contexto familiar e escolar',
  guardian_observations: 'Observações do responsável',
  guardian_participation: 'Participação de responsável',
  help: 'Interesse em conversar com profissional',
};

function answerLabel(key: string, substances: string[]) {
  if (labels[key]) return labels[key];
  for (const prefix of ['frequency_', 'duration_']) {
    if (key.startsWith(prefix)) {
      const slug = key.slice(prefix.length);
      const substance = substances.find((name) => name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '_').toLowerCase() === slug);
      return `${prefix === 'frequency_' ? 'Frequência de uso' : 'Tempo de uso'}${substance ? ` · ${substance}` : ''}`;
    }
  }
  return key.replaceAll('_', ' ').replace(/^./, (letter) => letter.toUpperCase());
}

export function SubstanceScreeningConclusion({ answers, urgent }: ScreeningConclusionProps) {
  const substances = Array.isArray(answers.substances) ? answers.substances.filter((item): item is string => typeof item === 'string') : [];
  const responses = Object.entries(answers).filter(([key, value]) => key !== 'substances' && key !== 'safety' && (typeof value === 'string' || typeof value === 'number') && String(value).trim());
  const safety = answers.safety && typeof answers.safety === 'object' ? Object.entries(answers.safety as Record<string, unknown>).filter(([, selected]) => selected === true).map(([key]) => safetyLabels[key]).filter(Boolean) : [];

  return <main className="min-h-screen bg-[#f8f6f1] px-4 py-12 text-[#173f3a]"><div className="mx-auto max-w-3xl space-y-5">
    <section className={`rounded-3xl border bg-white p-7 shadow-sm sm:p-10 ${urgent ? 'border-red-200' : 'border-[#d9e6df]'}`}>
      <span className={`grid size-12 place-items-center rounded-2xl ${urgent ? 'bg-red-50 text-red-700' : 'bg-[#e5f4f0] text-[#26786e]'}`}>{urgent ? <AlertTriangle className="size-6"/> : <CheckCircle2 className="size-6"/>}</span>
      <h1 className="mt-5 font-display text-3xl font-semibold">{urgent ? 'Sua segurança vem primeiro' : 'Obrigado por compartilhar'}</h1>
      <p className="mt-4 leading-7 text-[#526760]">{urgent ? 'Você sinalizou uma situação que pode precisar de atenção imediata. Procure ajuda presencial agora; não espere retorno por este formulário.' : 'Suas respostas foram enviadas para revisão profissional. Elas ajudam a organizar uma conversa sobre seu contexto e possíveis próximos passos.'}</p>
      {urgent && <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm leading-6 text-red-950"><strong className="block">Se o risco ou os sintomas estão acontecendo agora</strong>Ligue para o SAMU pelo <strong>192</strong> ou vá a uma UPA/pronto-socorro. Se possível, peça a alguém de confiança para ficar com você e não dirija. Em situação de risco de suicídio, não fique sozinho(a) e procure atendimento presencial imediatamente.</div>}
      <p className="mt-5 flex items-start gap-2 text-sm leading-6 text-[#526760]"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-[#26786e]"/>Este retorno resume o que foi informado. Não é diagnóstico, não mede gravidade e não substitui avaliação individual com profissional de saúde.</p>
    </section>

    <section className="rounded-3xl border border-[#d9e6df] bg-white p-7 shadow-sm sm:p-9">
      <h2 className="font-display text-xl font-semibold">Resumo do que você informou</h2>
      {substances.length > 0 ? <><p className="mt-3 text-sm leading-6 text-[#526760]">Substâncias que você escolheu abordar:</p><ul className="mt-2 flex flex-wrap gap-2">{substances.map((name) => <li key={name} className="rounded-full bg-[#e5f4f0] px-3 py-1.5 text-sm text-[#23594f]">{name}</li>)}</ul></> : <p className="mt-3 text-sm leading-6 text-[#526760]">Você não selecionou substâncias para abordar. Se desejar, ainda pode conversar com um profissional sobre suas dúvidas ou preocupações.</p>}
      {responses.length > 0 && <dl className="mt-5 grid gap-3 sm:grid-cols-2">{responses.map(([key, value]) => <div key={key} className="rounded-xl bg-[#f4f8f7] p-4"><dt className="text-xs font-semibold uppercase tracking-wide text-[#26786e]">{answerLabel(key, substances)}</dt><dd className="mt-1 whitespace-pre-wrap text-sm leading-6 text-[#526760]">{String(value)}</dd></div>)}</dl>}
      {urgent && <div className="mt-5 rounded-xl bg-red-50 p-4 text-sm leading-6 text-red-900"><p className="font-semibold">Itens de segurança sinalizados</p><ul className="mt-2 list-disc space-y-1 pl-5">{safety.map((item) => <li key={item}>{item}</li>)}</ul><p className="mt-3">A equipe profissional recebeu esse alerta, mas o formulário não é um canal de emergência e não garante resposta imediata.</p></div>}
    </section>

    <section className="rounded-3xl border border-[#d9e6df] bg-white p-7 shadow-sm sm:p-9">
      <h2 className="font-display text-xl font-semibold">Como buscar apoio</h2>
      <div className="mt-3 space-y-3 text-sm leading-6 text-[#526760]">
        <p>Mesmo sem ter certeza do que está acontecendo, você pode conversar com um profissional de saúde e contar, no seu ritmo, sobre frequência, quantidade, situações em que ocorre e impactos percebidos. A avaliação considera sua história completa; não é preciso chegar com respostas prontas.</p>
        <p>Você pode procurar uma Unidade Básica de Saúde (UBS) ou um serviço de saúde mental da sua região. O CAPS AD pode ser uma opção de cuidado relacionado ao uso de álcool e outras drogas; a equipe local pode orientar sobre disponibilidade e acesso.</p>
        <p>Se for seguro, considere conversar com alguém de confiança e pedir companhia para buscar atendimento. Para crianças e adolescentes, procure um profissional de saúde e um adulto responsável seguro; em risco imediato, priorize a proteção e o atendimento presencial.</p>
        <p>Para conversar sobre uma avaliação profissional, entre em contato pelo WhatsApp. A equipe não substitui serviços de urgência.</p>
      </div>
      <Button asChild className="mt-5 rounded-full bg-[#17675b] text-white hover:bg-[#12574d]"><a href={whatsappUrl} target="_blank" rel="noopener noreferrer"><MessageCircle className="mr-2 size-4"/>Conversar com a equipe</a></Button>
      <p className="mt-5 text-xs leading-5 text-[#71817b]">Em emergência, ligue 192 ou vá ao serviço de pronto atendimento mais próximo. Não aguarde resposta pelo WhatsApp ou por este formulário.</p>
    </section>
  </div></main>;
}
