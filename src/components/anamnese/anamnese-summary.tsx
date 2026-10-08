import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { AnamneseAnswers } from '@/lib/admin/anamnese'

type AnamneseSummaryProps = { answers: AnamneseAnswers }

const biomedicalModalities = ['Biomedicina/Estética', 'Saúde Integrativa', 'Atendimento Integrado']

function AnamneseSummary({ answers }: AnamneseSummaryProps) {
  const value = (key: string) => String(answers[key] ?? '').trim()
  const answeredYes = (key: string) => value(key) === 'Sim'
  const showBiomedical = biomedicalModalities.includes(value('modalidade'))
  const thoughtsResponse = value('pensamentos_morte')
  const showThoughtFollowUp = thoughtsResponse !== 'Não' && (thoughtsResponse === 'Sim, neste momento' || value('pensamentos_presentes_agora') === 'Sim')
  const currentThoughts = thoughtsResponse === 'Sim, neste momento' || (showThoughtFollowUp && value('pensamentos_presentes_agora') === 'Sim')
  const explicitSafetyConcern = showThoughtFollowUp && (currentThoughts || value('planejamento') === 'Sim' || value('acesso_meios') === 'Sim')
  const symptoms = Array.isArray(answers['sintomas']) ? answers['sintomas'] : []
  const freeText = (label: string, key: string) => value(key) ? <p><span className="font-medium text-slate-700">{label}:</span> <span className="whitespace-pre-wrap">“{value(key)}”</span></p> : null
  const response = (label: string, key: string, detailKey?: string, showDetail = true) => value(key) ? <div><p><span className="font-medium text-slate-700">{label}:</span> {value(key)}</p>{detailKey && showDetail && freeText('Relato informado', detailKey)}</div> : null
  const advice = [
    'Organize suas dúvidas e converse com o profissional sobre os relatos apresentados nesta ficha durante a consulta.',
    value('alergias') === 'Sim' && 'Comunique as alergias ao profissional e confirme que estão registradas antes de qualquer cuidado.',
    value('medicamentos') === 'Sim' && 'Leve uma lista atualizada dos medicamentos e suplementos para conversar com o profissional; não altere o uso por conta própria.',
    value('doencas') === 'Sim' && 'Converse sobre suas condições de saúde e leve informações disponíveis para a consulta.',
    (value('exames') === 'Sim' || value('exames') === 'Vou apresentar durante a consulta') && 'Se desejar, leve os exames recentes à consulta para avaliação profissional.',
    value('acompanhamento') === 'Sim' && 'Informe sobre o acompanhamento de saúde que já realiza para que o profissional considere esse contexto.',
    value('substancias') === 'Sim' && 'Se sentir confortável, converse com o profissional sobre o uso relatado de substâncias.',
  ].filter(Boolean) as string[]

  return <Card className="mx-auto max-w-3xl border-slate-200 shadow-sm">
    <CardHeader className="border-b border-slate-100">
      <div className="flex items-center gap-2 text-[#2f8f82]"><CheckCircle2 className="size-5" /><p className="text-sm font-semibold">Ficha enviada com sucesso</p></div>
      <CardTitle className="mt-2 font-display text-2xl text-slate-800">Resumo educativo das respostas</CardTitle>
      <p className="text-sm leading-6 text-slate-600">Este resumo é automático e não foi revisado pelo Dr. Frederick Martins Parreira. Não constitui diagnóstico ou prescrição e não determina elegibilidade para procedimentos. A consulta e a avaliação profissional são indispensáveis.</p>
      <p className="text-xs leading-5 text-slate-500">Por privacidade, este resumo está disponível apenas nesta tela após o envio. Ao sair ou recarregar a página, não será possível reabri-lo pelo link utilizado.</p>
    </CardHeader>
    <CardContent className="space-y-6 p-5 sm:p-8">
      {explicitSafetyConcern && <div role="alert" className="rounded-lg border-2 border-red-300 bg-red-50 p-4 text-sm leading-6 text-red-900">
        <div className="mb-1 flex items-center gap-2 font-semibold"><AlertTriangle className="size-5 shrink-0" />Atenção à segurança</div>
        <p>Você informou pensamentos atuais, planejamento ou acesso a meios. Não aguarde retorno por este formulário: ele não é monitorado em tempo real. Em perigo imediato, ligue para o SAMU pelo 192 ou procure uma UPA/pronto-socorro, e procure uma pessoa de confiança. O CVV 188 oferece apoio emocional e não substitui atendimento de emergência.</p>
      </div>}

      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold text-slate-800">Motivo e expectativa</h2>
        <div className="space-y-2 text-sm leading-6 text-slate-600">
          {freeText('Motivo informado', 'motivo_atendimento')}
          {response('Modalidade desejada', 'modalidade')}
          {response('Início relatado', 'inicio_queixa')}
          {response('Acontecimento agravante', 'evento_agravante', 'evento_agravante_detalhes', answeredYes('evento_agravante'))}
          {freeText('Impacto relatado', 'impacto_vida')}
          {freeText('Expectativa informada', 'expectativa_tratamento')}
          <p><span className="font-medium text-slate-700">Escala autorrelatada de prejuízo à qualidade de vida:</span> {String(answers['escala_prejuizo'] ?? 0)} de 10</p>
        </div>
      </section>

      <section className="space-y-3 border-t border-slate-100 pt-5">
        <h2 className="font-display text-lg font-semibold text-slate-800">Saúde e acompanhamentos</h2>
        <div className="space-y-2 text-sm leading-6 text-slate-600">
          {response('Condição de saúde diagnosticada', 'doencas', 'doencas_detalhes', answeredYes('doencas'))}
          {response('Cirurgias ou internações', 'cirurgias', 'cirurgias_detalhes', answeredYes('cirurgias'))}
          {response('Alergias', 'alergias', 'alergias_detalhes', answeredYes('alergias'))}
          {response('Medicamentos ou suplementos', 'medicamentos', 'medicamentos_detalhes', answeredYes('medicamentos'))}
          {response('Acompanhamento profissional', 'acompanhamento', 'acompanhamento_detalhes', answeredYes('acompanhamento'))}
          {response('Exames recentes', 'exames')}
        </div>
      </section>

      <section className="space-y-3 border-t border-slate-100 pt-5">
        <h2 className="font-display text-lg font-semibold text-slate-800">Hábitos e rotina</h2>
        <div className="space-y-2 text-sm leading-6 text-slate-600">
          {freeText('Alimentação e ingestão de água relatadas', 'alimentacao')}
          {freeText('Sono relatado', 'sono')}
          {response('Atividade física', 'atividade_fisica', 'atividade_fisica_detalhes', answeredYes('atividade_fisica'))}
          {response('Uso de álcool, cigarro, nicotina ou outras substâncias', 'substancias', 'substancias_detalhes', answeredYes('substancias'))}
        </div>
      </section>

      <section className="space-y-3 border-t border-slate-100 pt-5">
        <h2 className="font-display text-lg font-semibold text-slate-800">Sintomas e saúde emocional</h2>
        <div className="space-y-2 text-sm leading-6 text-slate-600">
          <p><span className="font-medium text-slate-700">Sintomas selecionados pela pessoa:</span> {symptoms.length ? symptoms.join(', ') : 'Nenhum sintoma selecionado'}{symptoms.includes('Outro') && value('sintomas_outro') ? <> — relato informado: “{value('sintomas_outro')}”</> : null}</p>
          <p><span className="font-medium text-slate-700">Escala autorrelatada de ansiedade:</span> {String(answers['escala_ansiedade'] ?? 0)} de 10</p>
          <p><span className="font-medium text-slate-700">Escala autorrelatada de tristeza ou desânimo:</span> {String(answers['escala_tristeza'] ?? 0)} de 10</p>
          <p className="text-xs text-slate-500">As escalas são autorrelatos e não são testes diagnósticos nem indicam, por si só, gravidade ou risco.</p>
          {response('Tratamento psicológico ou psiquiátrico anterior', 'tratamento_anterior', 'tratamento_anterior_detalhes', answeredYes('tratamento_anterior'))}
          {response('Pensamentos de morte, autolesão ou suicídio', 'pensamentos_morte')}
          {showThoughtFollowUp && response('Pensamentos presentes neste momento', 'pensamentos_presentes_agora')}
          {showThoughtFollowUp && response('Planejamento informado', 'planejamento')}
          {showThoughtFollowUp && response('Acesso a meios informado', 'acesso_meios')}
          {showThoughtFollowUp && freeText('Tentativas ou autolesão anteriores relatadas', 'historico_risco')}
          {showThoughtFollowUp && freeText('Fatores relatados que ajudam a impedir uma ação', 'fatores_impeditivos')}
          {showThoughtFollowUp && freeText('Pessoa indicada para procurar imediatamente', 'rede_apoio_nome')}
          {response('Rede de apoio', 'rede_apoio', 'rede_apoio_nome', answeredYes('rede_apoio'))}
          {answeredYes('rede_apoio') && value('rede_apoio_vinculo') && <p><span className="font-medium text-slate-700">Vínculo informado:</span> {value('rede_apoio_vinculo')}</p>}
          {answeredYes('rede_apoio') && value('rede_apoio_telefone') && <p><span className="font-medium text-slate-700">Telefone informado:</span> {value('rede_apoio_telefone')}</p>}
          {response('Traumas, perdas, violência ou abuso', 'traumas', 'traumas_detalhes', answeredYes('traumas'))}
          {freeText('Relacionamentos relatados', 'relacionamentos')}
          {response('Dificuldades relacionadas à sexualidade', 'sexualidade', 'sexualidade_detalhes', answeredYes('sexualidade'))}
          {freeText('Rotina profissional ou acadêmica relatada', 'vida_profissional')}
          {response('Religião ou espiritualidade', 'espiritualidade', 'espiritualidade_detalhes', answeredYes('espiritualidade'))}
          {freeText('Informação adicional relatada', 'observacoes_finais')}
        </div>
      </section>

      {showBiomedical && <section className="space-y-3 border-t border-slate-100 pt-5">
        <h2 className="font-display text-lg font-semibold text-slate-800">Informações para modalidade biomédica, estética ou integrativa</h2>
        <div className="space-y-2 text-sm leading-6 text-slate-600">
          {freeText('Objetivo informado', 'objetivo_biomedicina')}
          {value('peso') && <p><span className="font-medium text-slate-700">Peso informado:</span> {value('peso')}</p>}
          {value('altura') && <p><span className="font-medium text-slate-700">Altura informada:</span> {value('altura')}</p>}
          {freeText('Tratamentos anteriores informados', 'tratamentos_anteriores')}
          {['tirzepatida', 'semaglutida', 'outros_medicamentos_emagrecimento', 'gestacao_amamentacao', 'anticoagulante', 'tendencia_manchas', 'tendencia_queloides', 'doenca_autoimune', 'herpes_recorrente', 'uso_acidos', 'isotretinoina'].filter(key => value(key)).map(key => <div key={key}>{response(key.replaceAll('_', ' '), key)}</div>)}
        </div>
        <p className="text-xs leading-5 text-slate-500">As respostas são apenas informações autorrelatadas; somente a avaliação profissional poderá discutir cuidados e adequação a procedimentos.</p>
      </section>}

      {advice.length > 0 && <section className="space-y-3 border-t border-slate-100 pt-5">
        <h2 className="font-display text-lg font-semibold text-slate-800">Orientações gerais</h2>
        <ul className="list-disc space-y-2 pl-5 text-sm leading-6 text-slate-600">{advice.map(item => <li key={item}>{item}</li>)}</ul>
      </section>}
    </CardContent>
  </Card>
}

export { AnamneseSummary }
