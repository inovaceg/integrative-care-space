import { AlertTriangle, CheckCircle2, MessageCircle, Printer, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { whatsappUrl } from '@/lib/site-data';

type ScreeningConclusionProps = {
  answers: Record<string, unknown>;
  urgent: boolean;
  ageGroup: 'child' | 'adolescent' | 'adult' | null;
  patientName: string;
  birthDate: string;
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
  exposure: 'Exposição a substâncias ou medicamentos',
  development: 'Mudanças no desenvolvimento, sono, alimentação ou saúde',
  behavior: 'Mudanças de comportamento percebidas',
  family_school: 'Contexto familiar e escolar',
  guardian_observations: 'Observações do responsável',
  experimented: 'Experiência com uso',
  frequency: 'Frequência nos últimos 12 meses',
  context: 'Situações ou contextos de uso',
  consequences: 'Consequências percebidas',
  control: 'Dificuldade para controlar, reduzir ou interromper',
  help: 'Interesse em conversar com profissional',
  history: 'Histórico de uso',
  quantity: 'Quantidade ou padrão relatado',
  duration: 'Há quanto tempo',
  withdrawal: 'Sintomas ao reduzir ou interromper',
  impacts: 'Impactos percebidos',
  treatments: 'Cuidados ou tratamentos anteriores',
  motivation: 'O que gostaria que acontecesse',
  reason: 'Motivo para buscar esta avaliação',
  observations: 'Informações adicionais',
  guardian_name: 'Nome do responsável',
  guardian_relation: 'Vínculo com a criança',
  guardian_participation: 'Participação de responsável',
};

const supportGroups = [
  { name: 'Alcoólicos Anônimos (AA)', purpose: 'para pessoas que desejam apoio mútuo relacionado ao álcool', url: 'https://www.aa.org.br/' },
  { name: 'Narcóticos Anônimos (NA)', purpose: 'para pessoas que procuram apoio mútuo relacionado a outras drogas', url: 'https://www.na.org.br/' },
  { name: 'Al-Anon', purpose: 'para familiares e amigos de pessoas com questões relacionadas ao álcool', url: 'https://al-anon.org.br/' },
  { name: 'Nar-Anon', purpose: 'para familiares e amigos afetados pelo uso de drogas de outra pessoa', url: 'https://naranon.org.br/' },
];

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

function buildRecommendations(answers: Record<string, unknown>, ageGroup: ScreeningConclusionProps['ageGroup'], substances: string[], urgent: boolean) {
  const recommendations: string[] = [];
  if (urgent) recommendations.push('Você sinalizou uma situação de segurança que requer prioridade. Se ela está acontecendo agora, procure atendimento presencial imediato, ligue para o SAMU 192 ou vá a uma UPA/pronto-socorro. Não espere contato por este formulário.');
  if (ageGroup === 'child') recommendations.push('Como o formulário é sobre uma criança, converse com o responsável e procure avaliação em serviço de saúde, como a UBS, pediatria ou serviço especializado. Priorize a proteção da criança e não a deixe sozinha diante de uma situação de risco.');
  else if (ageGroup === 'adolescent') recommendations.push('Para adolescentes, procure uma UBS ou serviço de saúde mental e, quando for seguro, envolva um adulto de confiança. As respostas precisam ser compreendidas com cuidado, considerando o contexto e a segurança da pessoa adolescente.');
  else recommendations.push('Uma conversa com profissional de saúde pode ajudar a compreender o padrão relatado, os efeitos na saúde e os próximos passos. Você pode começar pela UBS ou buscar orientação sobre atendimento no CAPS AD da sua região.');

  const frequency = [answers.frequency, ...Object.entries(answers).filter(([key]) => key.startsWith('frequency_')).map(([, value]) => value)].map((value) => String(value ?? '').toLocaleLowerCase('pt-BR'));
  if (frequency.some((value) => value.includes('diariamente') || value.includes('semanalmente'))) recommendations.push('Você informou uso semanal ou mais frequente em pelo menos uma resposta. Isso, por si só, não define diagnóstico ou gravidade; vale levar essa informação a uma avaliação profissional, especialmente se houver preocupação, dificuldade para reduzir ou impactos no cotidiano.');
  if (String(answers.withdrawal ?? '').trim() || Object.entries(answers).some(([key, value]) => key.startsWith('withdrawal_') && String(value ?? '').trim())) recommendations.push('Você relatou sintomas ao reduzir ou interromper. Converse com um profissional antes de fazer mudanças abruptas, principalmente se o uso for frequente ou envolver álcool ou medicamentos sedativos. Se os sintomas forem intensos, procure atendimento presencial.');
  if (String(answers.impacts ?? answers.consequences ?? '').trim()) recommendations.push('Leve à conversa profissional os impactos que relatou. Saúde física e emocional, relações, estudos e trabalho podem ser considerados em conjunto para decidir um cuidado adequado.');
  if (answers.help === 'Sim' || String(answers.motivation ?? '').trim()) recommendations.push('Você demonstrou interesse em conversar ou indicou algo que gostaria que mudasse. Esse pode ser um bom ponto de partida para combinar uma primeira conversa de cuidado, sem precisar resolver tudo de uma vez.');
  if (substances.includes('Álcool')) recommendations.push('Se fizer sentido para você, grupos de apoio como AA podem complementar o cuidado profissional relacionado ao álcool.');
  if (substances.some((name) => name !== 'Álcool' && name !== 'Não sabe identificar')) recommendations.push('Se fizer sentido para você, NA pode ser uma opção de apoio mútuo relacionada a outras drogas. Grupos de apoio são complementares e não substituem atendimento médico ou psicológico.');
  return recommendations;
}

export function SubstanceScreeningConclusion({ answers, urgent, ageGroup, patientName, birthDate }: ScreeningConclusionProps) {
  const substances = Array.isArray(answers.substances) ? answers.substances.filter((item): item is string => typeof item === 'string') : [];
  const responses = Object.entries(answers).filter(([key, value]) => key !== 'substances' && key !== 'safety' && (typeof value === 'string' || typeof value === 'number') && String(value).trim()).map(([key, value]) => [answerLabel(key, substances), Array.isArray(value) ? value.join(', ') : String(value)] as [string, string]);
  const safety = answers.safety && typeof answers.safety === 'object' ? Object.entries(answers.safety as Record<string, unknown>).filter(([, selected]) => selected === true).map(([key]) => safetyLabels[key]).filter(Boolean) : [];
  const recommendations = buildRecommendations(answers, ageGroup, substances, urgent);
  const ageLabel = ageGroup === 'child' ? 'Criança' : ageGroup === 'adolescent' ? 'Adolescente' : ageGroup === 'adult' ? 'Adulto' : 'Não informada';

  function savePdf() {
    window.print();
  }

  return <main className="screening-result min-h-screen bg-[#f8f6f1] px-4 py-12 text-[#173f3a]"><div className="mx-auto max-w-3xl space-y-5">
    <section className={`rounded-3xl border bg-white p-7 shadow-sm sm:p-10 ${urgent ? 'border-red-200' : 'border-[#d9e6df]'}`}>
      <span className={`grid size-12 place-items-center rounded-2xl ${urgent ? 'bg-red-50 text-red-700' : 'bg-[#e5f4f0] text-[#26786e]'}`}>{urgent ? <AlertTriangle className="size-6"/> : <CheckCircle2 className="size-6"/>}</span>
      <h1 className="mt-5 font-display text-3xl font-semibold">{urgent ? 'Sua segurança vem primeiro' : `Obrigado por compartilhar${patientName ? `, ${patientName}` : ''}`}</h1>
      <p className="mt-4 leading-7 text-[#526760]">{urgent ? 'Você sinalizou uma situação que pode precisar de atenção imediata. Procure ajuda presencial agora; não espere retorno por este formulário.' : 'Suas respostas foram enviadas para revisão profissional. O resumo abaixo destaca somente o que você informou e sugere caminhos de apoio.'}</p>
      {urgent && <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm leading-6 text-red-950"><strong className="block">Se o risco ou os sintomas estão acontecendo agora</strong>Ligue para o SAMU pelo <strong>192</strong> ou vá a uma UPA/pronto-socorro. Se possível, peça a alguém de confiança para ficar com você e não dirija. Em risco de suicídio, não fique sozinho(a) e procure atendimento presencial imediatamente.</div>}
      <p className="mt-5 flex items-start gap-2 text-sm leading-6 text-[#526760]"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-[#26786e]"/>Este retorno é uma síntese de triagem. Não emite diagnóstico, não determina grau de dependência e não substitui avaliação clínica ou laudo psicológico.</p>
      <div className="screening-result__actions mt-6"><Button onClick={savePdf} className="rounded-full bg-[#17675b] text-white hover:bg-[#12574d]"><Printer className="mr-2 size-4"/>Salvar resultado em PDF</Button><p className="mt-2 text-xs text-[#71817b]">Na janela de impressão, escolha “Salvar como PDF” para manter o visual desta tela.</p></div>
    </section>

    <section className="rounded-3xl border border-[#d9e6df] bg-white p-7 shadow-sm sm:p-9">
      <h2 className="font-display text-xl font-semibold">Resumo personalizado das suas respostas</h2>
      <p className="mt-2 text-sm leading-6 text-[#526760]">Faixa etária considerada: <strong>{ageLabel.toLocaleLowerCase('pt-BR')}</strong>. {ageGroup === 'child' ? 'As informações deste fluxo foram fornecidas por um responsável.' : ageGroup === 'adolescent' ? 'As orientações devem considerar a segurança, a privacidade e a participação de um adulto de confiança quando apropriado.' : 'As respostas são relatos pessoais e devem ser compreendidas em contexto.'}</p>
      {substances.length > 0 ? <><p className="mt-4 text-sm leading-6 text-[#526760]">Substâncias que você escolheu abordar:</p><ul className="mt-2 flex flex-wrap gap-2">{substances.map((name) => <li key={name} className="rounded-full bg-[#e5f4f0] px-3 py-1.5 text-sm text-[#23594f]">{name}</li>)}</ul></> : <p className="mt-4 text-sm leading-6 text-[#526760]">Você não selecionou substâncias para abordar. Se houver uma preocupação, ainda é válido conversar com um profissional.</p>}
      {responses.length > 0 && <dl className="mt-5 grid gap-3 sm:grid-cols-2">{responses.map(([label, value]) => <div key={label} className="rounded-xl bg-[#f4f8f7] p-4"><dt className="text-xs font-semibold uppercase tracking-wide text-[#26786e]">{label}</dt><dd className="mt-1 whitespace-pre-wrap text-sm leading-6 text-[#526760]">{value}</dd></div>)}</dl>}
    </section>

    {urgent && <section className="screening-result__safety rounded-3xl border border-red-200 bg-white p-7 shadow-sm sm:p-9"><h2 className="font-display text-xl font-semibold text-red-900">Sinais de segurança</h2><ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-6 text-red-900">{safety.map((item) => <li key={item}>{item}</li>)}</ul><p className="mt-4 text-sm leading-6 text-red-900">A equipe recebeu o alerta, mas este formulário não é um canal de emergência e não garante resposta imediata.</p></section>}

    <section className="rounded-3xl border border-[#d9e6df] bg-white p-7 shadow-sm sm:p-9">
      <h2 className="font-display text-xl font-semibold">Próximos passos que podem ajudar</h2>
      <ul className="mt-4 list-disc space-y-3 pl-5 text-sm leading-6 text-[#526760]">{recommendations.map((item) => <li key={item}>{item}</li>)}</ul>
      <p className="mt-4 text-xs leading-5 text-[#71817b]">Estas orientações são possibilidades gerais, não uma prescrição nem uma conclusão clínica. A decisão sobre o cuidado deve ser feita com profissional habilitado.</p>
    </section>

    <section className="rounded-3xl border border-[#d9e6df] bg-white p-7 shadow-sm sm:p-9">
      <h2 className="font-display text-xl font-semibold">Grupos de apoio mútuo</h2>
      <p className="mt-2 text-sm leading-6 text-[#526760]">A participação é voluntária. Os grupos podem oferecer convivência e apoio entre pares, mas não substituem atendimento médico ou psicológico. Consulte os sites oficiais para encontrar reuniões presenciais ou on-line na sua região.</p>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">{supportGroups.map((group) => <li key={group.name} className="rounded-xl bg-[#f4f8f7] p-4"><strong className="text-sm text-[#173f3a]">{group.name}</strong><p className="mt-1 text-sm leading-5 text-[#526760]">{group.purpose}.</p><a className="mt-2 inline-block text-sm font-semibold text-[#17675b] underline" href={group.url} target="_blank" rel="noopener noreferrer">Localizar reuniões e informações</a></li>)}</ul>
    </section>

    <section className="rounded-3xl border border-[#d9e6df] bg-white p-7 shadow-sm sm:p-9">
      <h2 className="font-display text-xl font-semibold">Atendimento de saúde e acompanhamento</h2>
      <div className="mt-3 space-y-3 text-sm leading-6 text-[#526760]">
        <p>Você pode procurar a Unidade Básica de Saúde (UBS) da sua região para conversar com a equipe e receber orientação. O CAPS AD (Centro de Atenção Psicossocial Álcool e outras Drogas) pode ser uma opção de cuidado especializado; a UBS ou a Secretaria Municipal de Saúde pode informar o serviço de referência e como acessá-lo.</p>
        {ageGroup === 'child' && <p>Para crianças, procure a UBS ou profissional de pediatria e compartilhe as observações registradas pelo responsável. Se houver suspeita de exposição ou risco atual, priorize a proteção e a avaliação presencial.</p>}
        {ageGroup === 'adolescent' && <p>Para adolescentes, o atendimento deve considerar desenvolvimento, privacidade e segurança. Sempre que possível e seguro, busque apoio de um adulto de confiança junto ao serviço de saúde.</p>}
        <p>Uma avaliação individual com profissional habilitado pode explorar histórico, frequência, sintomas, impactos, saúde física e emocional e preferências de cuidado. Não é necessário esperar que a situação piore para pedir orientação.</p>
        <p>Para conversar com a equipe do Dr. Frederick Martins Parreira sobre atendimento, use o WhatsApp. A equipe não substitui serviços de urgência.</p>
      </div>
      <Button asChild className="screening-result__contact mt-6 h-14 w-full rounded-xl bg-[#075e54] px-6 text-base font-bold text-white shadow-lg ring-2 ring-[#075e54]/20 transition-all hover:-translate-y-0.5 hover:bg-[#064e46] hover:shadow-xl focus-visible:ring-4"><a href={whatsappUrl} target="_blank" rel="noopener noreferrer"><MessageCircle className="mr-2 size-5"/>Falar com a equipe pelo WhatsApp</a></Button>
      <p className="mt-5 text-xs leading-5 text-[#71817b]">Em emergência atual, ligue para o SAMU 192 ou vá a uma UPA/pronto-socorro. Não aguarde resposta pelo WhatsApp ou por este formulário.</p>
    </section>
  </div></main>;
}
