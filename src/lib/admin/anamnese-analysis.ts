import type { AnamneseAnswers } from './anamnese'

/**
 * Motor de análise clínica de anamnese — Versão 1.0.0
 *
 * Motor interno, determinístico e versionado. Não envia dados clínicos para
 * serviços externos. Não cria diagnósticos. Não classifica pacientes como
 * "sem risco". Todas as sinalizações mostram a pergunta e a resposta original.
 *
 * Regras aprovadas (v1.0.0):
 * 1. Pensamentos de morte/autolesão/suicídio atuais → avaliação profissional imediata (não risco iminente automático).
 * 2. Histórico no passado → revisão prioritária, esclarecer situação atual e rede de apoio.
 * 3. "Prefiro conversar pessoalmente" → pendência para consulta, não eleva prioridade isoladamente.
 * 4. Sem limiares automáticos de ansiedade/tristeza/prejuízo. Mostra valores e destaca relevância.
 * 5. Nunca "sem risco": "Nenhum alerta identificado pelas regras disponíveis" + aviso de não substituição da avaliação clínica.
 * 6. Toda sinalização mostra pergunta e resposta original.
 * 7. Informações ausentes/contraditórias/ambíguas → pendências, sem suposições.
 * 8. Funciona para anamneses preenchidas e novas fichas.
 * 9. Relatório ao final da ficha, visual profissional, por categorias, imprimir/PDF.
 * 10. Motor interno, determinístico, versionado, sem IA externa.
 * 11. Preserva autenticação, permissões e respostas originais.
 * 12. Sem migrações nem alteração de banco. Análise sob demanda, sem persistência.
 */

export const ANAMNESE_ANALYSIS_VERSION = '1.0.0'

export type AnalysisAlert = {
  id: string
  category: 'seguranca' | 'saude-emocional' | 'clinico' | 'pendencia' | 'informacao'
  severity: 'alta' | 'media' | 'baixa' | 'informativo'
  title: string
  description: string
  question: string
  originalAnswer: string
  recommendation: string
}

export type AnalysisPending = {
  id: string
  category: 'pendencia' | 'informacao'
  title: string
  description: string
  question: string
  originalAnswer: string
  reason: string
}

export type AnalysisScale = {
  label: string
  value: number | null
  max: number
  note: string
}

export type AnalysisResult = {
  version: string
  generatedAt: string
  patientName?: string
  completedAt?: string
  summary: string
  alerts: AnalysisAlert[]
  pendings: AnalysisPending[]
  scales: AnalysisScale[]
  conclusion: string
  disclaimer: string
  hasAlerts: boolean
  hasPendings: boolean
  demoMode: boolean
}

function isEmpty(value: unknown): boolean {
  return value === undefined || value === null || value === '' ||
    (Array.isArray(value) && value.length === 0)
}

function displayAnswer(value: unknown): string {
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não'
  if (Array.isArray(value)) return value.length ? value.map(displayAnswer).join(', ') : 'Nenhuma opção selecionada'
  if (value && typeof value === 'object') return JSON.stringify(value, null, 2)
  return String(value)
}

function hasAnswer(value: unknown): boolean {
  return !isEmpty(value)
}

function alert(
  id: string,
  category: AnalysisAlert['category'],
  severity: AnalysisAlert['severity'],
  title: string,
  description: string,
  question: string,
  originalAnswer: unknown,
  recommendation: string
): AnalysisAlert {
  return {
    id,
    category,
    severity,
    title,
    description,
    question,
    originalAnswer: displayAnswer(originalAnswer),
    recommendation,
  }
}

function pending(
  id: string,
  category: AnalysisPending['category'],
  title: string,
  description: string,
  question: string,
  originalAnswer: unknown,
  reason: string
): AnalysisPending {
  return {
    id,
    category,
    title,
    description,
    question,
    originalAnswer: displayAnswer(originalAnswer),
    reason,
  }
}

export function analyzeAnamnese(
  answers: AnamneseAnswers,
  options: { patientName?: string; completedAt?: string; demoMode?: boolean } = {}
): AnalysisResult {
  const { patientName, completedAt, demoMode = false } = options
  const alerts: AnalysisAlert[] = []
  const pendings: AnalysisPending[] = []
  const scales: AnalysisScale[] = []

  const get = (key: string): unknown => answers[key]

  // =========================================================================
  #region Escala de prejuízo, ansiedade e tristeza (regra 4: sem limiares automáticos)
  // =========================================================================
  const prejuizo = Number(answers['escala_prejuizo'] ?? 0)
  const ansiedade = Number(answers['escala_ansiedade'] ?? 0)
  const tristeza = Number(answers['escala_tristeza'] ?? 0)

  if (hasAnswer(answers['escala_prejuizo'])) {
    scales.push({
      label: 'Prejuízo à qualidade de vida',
      value: prejuizo,
      max: 10,
      note: 'Valor informado pelo paciente. Relevante para avaliação profissional — não constitui diagnóstico.',
    })
  }
  if (hasAnswer(answers['escala_ansiedade'])) {
    scales.push({
      label: 'Ansiedade',
      value: ansiedade,
      max: 10,
      note: 'Valor informado pelo paciente. Relevante para avaliação profissional — não constitui diagnóstico.',
    })
  }
  if (hasAnswer(answers['escala_tristeza'])) {
    scales.push({
      label: 'Tristeza ou desânimo',
      value: tristeza,
      max: 10,
      note: 'Valor informado pelo paciente. Relevante para avaliação profissional — não constitui diagnóstico.',
    })
  }

  // =========================================================================
  #region Pensamentos de morte, autolesão ou suicídio (regras 1, 2, 3, 6)
  // =========================================================================
  const pensamentosMorte = get('pensamentos_morte')
  const pensamentosPresentes = get('pensamentos_presentes_agora')
  const planejamento = get('planejamento')
  const acessoMeios = get('acesso_meios')
  const historicoRisco = get('historico_risco')
  const fatoresImpeditivos = get('fatores_impeditivos')
  const redeApoio = get('rede_apoio')
  const redeApoioNome = get('rede_apoio_nome')
  const redeApoioVinculo = get('rede_apoio_vinculo')
  const redeApoioTelefone = get('rede_apoio_telefone')

  const isAtual = pensamentosMorte === 'Sim, neste momento'
  const isRecente = pensamentosMorte === 'Sim, recentemente'
  const isPassado = pensamentosMorte === 'Sim, no passado'
  const isPessoal = pensamentosMorte === 'Prefiro conversar pessoalmente'
  const isNao = pensamentosMorte === 'Não'

  // Regra 1: pensamentos atuais → avaliação profissional imediata (não risco iminente automático)
  if (isAtual) {
    alerts.push(alert(
      'pensamentos-morte-atual',
      'seguranca',
      'alta',
      'Pensamentos de morte, autolesão ou suicídio relatados como atuais',
      'O paciente relatou pensamentos de morte, autolesão ou suicídio neste momento. Isso sinaliza necessidade de avaliação profissional imediata, sem determinar automaticamente risco iminente.',
      'Já teve pensamentos de morte, autolesão ou suicídio?',
      pensamentosMorte,
      'Avalie a necessidade de encaminhamento urgente para atendimento presencial ou serviço de emergência, conforme julgamento clínico.',
    ))

    if (pensamentosPresentes === 'Sim') {
      alerts.push(alert(
        'pensamentos-presentes-agora',
        'seguranca',
        'alta',
        'Pensamentos presentes neste momento',
        'O paciente confirmou que os pensamentos estão presentes neste momento.',
        'Esses pensamentos estão presentes neste momento?',
        pensamentosPresentes,
        'Priorize a avaliação de segurança imediata e o plano de contenção.',
      ))
    } else if (pensamentosPresentes === 'Não') {
      pendings.push(pending(
        'pensamentos-presentes-nao',
        'pendencia',
        'Confirmação de pensamentos presentes',
        'O paciente relatou pensamentos atuais, mas não confirmou se estão presentes neste momento.',
        'Esses pensamentos estão presentes neste momento?',
        pensamentosPresentes,
        'Esclareça durante a consulta se os pensamentos persistem atualmente.',
      ))
    } else {
      pendings.push(pending(
        'pensamentos-presentes-ausente',
        'pendencia',
        'Resposta ausente sobre pensamentos presentes',
        'Não há resposta registrada para a pergunta sobre se os pensamentos estão presentes neste momento.',
        'Esses pensamentos estão presentes neste momento?',
        pensamentosPresentes,
        'Solicite esclarecimento durante a consulta.',
      ))
    }

    if (planejamento === 'Sim') {
      alerts.push(alert(
        'planejamento-suicida',
        'seguranca',
        'alta',
        'Existe planejamento',
        'O paciente relatou que existe planejamento.',
        'Existe planejamento?',
        planejamento,
        'Avalie imediatamente a necessidade de intervenção de segurança.',
      ))
    } else if (planejamento === 'Não') {
      pendings.push(pending(
        'planejamento-nao',
        'pendencia',
        'Planejamento negado',
        'O paciente negou planejamento, mas relatou pensamentos atuais. Confirme durante a consulta.',
        'Existe planejamento?',
        planejamento,
        'Reavalie o planejamento na consulta presencial.',
      ))
    } else {
      pendings.push(pending(
        'planejamento-ausente',
        'pendencia',
        'Resposta ausente sobre planejamento',
        'Não há resposta registrada sobre planejamento.',
        'Existe planejamento?',
        planejamento,
        'Solicite esclarecimento durante a consulta.',
      ))
    }

    if (acessoMeios === 'Sim') {
      alerts.push(alert(
        'acesso-meios',
        'seguranca',
        'alta',
        'Acesso aos meios mencionados',
        'O paciente relatou possuir acesso aos meios mencionados.',
        'Possui acesso aos meios mencionados?',
        acessoMeios,
        'Avalie restrição de acesso a meios e plano de segurança.',
      ))
    } else if (acessoMeios === 'Não') {
      pendings.push(pending(
        'acesso-meios-nao',
        'pendencia',
        'Acesso aos meios negado',
        'O paciente negou acesso aos meios, mas relatou pensamentos atuais. Confirme durante a consulta.',
        'Possui acesso aos meios mencionados?',
        acessoMeios,
        'Reavalie o acesso a meios na consulta presencial.',
      ))
    } else {
      pendings.push(pending(
        'acesso-meios-ausente',
        'pendencia',
        'Resposta ausente sobre acesso a meios',
        'Não há resposta registrada sobre acesso aos meios mencionados.',
        'Possui acesso aos meios mencionados?',
        acessoMeios,
        'Solicite esclarecimento durante a consulta.',
      ))
    }
  }

  // Regra 2: histórico no passado → revisão prioritária
  if (isPassado) {
    alerts.push(alert(
      'pensamentos-morte-passado',
      'seguranca',
      'media',
      'Pensamentos de morte, autolesão ou suicídio no passado',
      'O paciente relatou pensamentos de morte, autolesão ou suicídio no passado. Isso gera revisão prioritária, com orientação para esclarecer a situação atual e a rede de apoio.',
      'Já teve pensamentos de morte, autolesão ou suicídio?',
      pensamentosMorte,
      'Durante a consulta, esclareça se a situação mudou e avalie a rede de apoio atual.',
    ))

    if (historicoRisco && !isEmpty(historicoRisco)) {
      pendings.push(pending(
        'historico-risco-passado',
        'pendencia',
        'Tentativa anterior ou autolesão no passado',
        'O paciente relatou histórico de tentativa anterior ou autolesão.',
        'Já houve tentativa anterior ou autolesão?',
        historicoRisco,
        'Revise o histórico e avalie fatores de proteção atuais.',
      ))
    }

    if (redeApoio === 'Sim') {
      if (!redeApoioNome || !redeApoioVinculo || !redeApoioTelefone) {
        pendings.push(pending(
          'rede-apoio-incompleta',
          'pendencia',
          'Rede de apoio incompleta',
          'O paciente indicou possuir rede de apoio, mas não informou nome, vínculo e/ou telefone completos.',
          'Quem poderia ser procurado imediatamente?',
          { nome: redeApoioNome, vinculo: redeApoioVinculo, telefone: redeApoioTelefone },
          'Complete os dados da rede de apoio durante a consulta.',
        ))
      }
    } else if (redeApoio === 'Não') {
      pendings.push(pending(
        'rede-apoio-nao',
        'pendencia',
        'Sem rede de apoio identificada',
        'O paciente relatou não possuir alguém para procurar em uma crise.',
        'Existe alguém que procuraria imediatamente em uma crise?',
        redeApoio,
        'Avalie a construção de uma rede de apoio durante o acompanhamento.',
      ))
    } else {
      pendings.push(pending(
        'rede-apoio-ausente',
        'pendencia',
        'Resposta ausente sobre rede de apoio',
        'Não há resposta registrada sobre rede de apoio.',
        'Existe alguém que procuraria imediatamente em uma crise?',
        redeApoio,
        'Solicite esclarecimento durante a consulta.',
      ))
    }
  }

  // Regra 3: "Prefiro conversar pessoalmente" → pendência, não eleva prioridade isoladamente
  if (isPessoal) {
    pendings.push(pending(
      'pensamentos-morte-pessoal',
      'pendencia',
      'Prefere conversar pessoalmente sobre pensamentos de morte/autolesão/suicídio',
      'O paciente optou por conversar pessoalmente sobre pensamentos de morte, autolesão ou suicídio. Isso gera uma pendência para a consulta, mas não eleva, isoladamente, a prioridade clínica.',
      'Já teve pensamentos de morte, autolesão ou suicídio?',
      pensamentosMorte,
        'Aborde o tema durante a consulta presencial, conforme o conforto do paciente.',
    ))
  }

  // =========================================================================
  #region Traumas (regra 3: "Prefiro conversar pessoalmente" → pendência)
  // =========================================================================
  const traumas = get('traumas')
  const traumasDetalhes = get('traumas_detalhes')

  if (traumas === 'Prefiro conversar pessoalmente') {
    pendings.push(pending(
      'traumas-pessoal',
      'pendencia',
      'Prefere conversar pessoalmente sobre traumas',
      'O paciente optou por conversar pessoalmente sobre traumas, perdas, violência ou abuso. Isso gera uma pendência para a consulta.',
      'Há traumas, perdas, violência ou abuso que ainda afetam você?',
      traumas,
      'Aborde o tema durante a consulta presencial, conforme o conforto do paciente.',
    ))
  } else if (traumas === 'Sim' && traumasDetalhes && !isEmpty(traumasDetalhes)) {
    pendings.push(pending(
      'traumas-detalhes',
      'pendencia',
      'Traumas relatados com detalhes',
      'O paciente relatou traumas, perdas, violência ou abuso e forneceu detalhes.',
      'Há traumas, perdas, violência ou abuso que ainda afetam você?',
      traumas,
      'Revise os detalhes durante a consulta e avalie o impacto no atendimento.',
    ))
  } else if (traumas === 'Sim' && isEmpty(traumasDetalhes)) {
    pendings.push(pending(
      'traumas-sem-detalhes',
      'pendencia',
      'Traumas relatados sem detalhes',
      'O paciente relatou traumas, perdas, violência ou abuso, mas não forneceu detalhes.',
      'Há traumas, perdas, violência ou abuso que ainda afetam você?',
      traumas,
      'Solicite detalhes apenas se o paciente se sentir à vontade durante a consulta.',
    ))
  }

  // =========================================================================
  #region Sexualidade (regra 3: "Prefiro conversar pessoalmente" → pendência)
  // =========================================================================
  const sexualidade = get('sexualidade')
  const sexualidadeDetalhes = get('sexualidade_detalhes')

  if (sexualidade === 'Prefiro conversar pessoalmente') {
    pendings.push(pending(
      'sexualidade-pessoal',
      'pendencia',
      'Prefere conversar pessoalmente sobre sexualidade',
      'O paciente optou por conversar pessoalmente sobre dificuldades relacionadas à sexualidade. Isso gera uma pendência para a consulta.',
      'Possui dificuldades relacionadas à sexualidade, libido ou vida sexual?',
      sexualidade,
      'Aborde o tema durante a consulta presencial, conforme o conforto do paciente.',
    ))
  } else if (sexualidade === 'Sim' && sexualidadeDetalhes && !isEmpty(sexualidadeDetalhes)) {
    pendings.push(pending(
      'sexualidade-detalhes',
      'pendencia',
      'Dificuldades sexuais relatadas com detalhes',
      'O paciente relatou dificuldades relacionadas à sexualidade e forneceu detalhes.',
      'Possui dificuldades relacionadas à sexualidade, libido ou vida sexual?',
      sexualidade,
      'Revise os detalhes durante a consulta.',
    ))
  }

  // =========================================================================
  #region Exames (regra 7: "Vou apresentar durante a consulta" → pendência)
  // =========================================================================
  const exames = get('exames')
  if (exames === 'Vou apresentar durante a consulta') {
    pendings.push(pending(
      'exames-apresentacao',
      'pendencia',
      'Exames laboratoriais a serem apresentados',
      'O paciente informou que apresentará exames laboratoriais recentes durante a consulta.',
      'Possui exames laboratoriais recentes?',
      exames,
      'Solicite a apresentação dos exames durante a consulta.',
    ))
  }

  // =========================================================================
  #region Informações ausentes/contraditórias/ambíguas (regra 7)
  // =========================================================================
  // Doenças físicas
  const doencas = get('doencas')
  const doencasDetalhes = get('doencas_detalhes')
  if (doencas === 'Sim' && isEmpty(doencasDetalhes)) {
    pendings.push(pending(
      'doencas-sem-detalhes',
      'pendencia',
      'Doenças relatadas sem detalhes',
      'O paciente indicou possuir doença ou condição de saúde diagnosticada, mas não forneceu detalhes.',
      'Doença ou condição diagnosticada',
      doencas,
      'Solicite detalhes das condições de saúde durante a consulta.',
    ))
  }

  // Alergias
  const alergias = get('alergias')
  const alergiasDetalhes = get('alergias_detalhes')
  if (alergias === 'Sim' && isEmpty(alergiasDetalhes)) {
    pendings.push(pending(
      'alergias-sem-detalhes',
      'pendencia',
      'Alergias relatadas sem detalhes',
      'O paciente indicou possuir alergias, mas não forneceu detalhes.',
      'Possui alergias',
      alergias,
      'Solicite detalhes das alergias durante a consulta.',
    ))
  }

  // Medicamentos
  const medicamentos = get('medicamentos')
  const medicamentosDetalhes = get('medicamentos_detalhes')
  if (medicamentos === 'Sim' && isEmpty(medicamentosDetalhes)) {
    pendings.push(pending(
      'medicamentos-sem-detalhes',
      'pendencia',
      'Medicamentos relatados sem detalhes',
      'O paciente indicou uso de medicamentos ou suplementos, mas não forneceu detalhes.',
      'Uso de medicamentos ou suplementos',
      medicamentos,
      'Solicite nome, dose, frequência e prescritor durante a consulta.',
    ))
  }

  // Acompanhamento
  const acompanhamento = get('acompanhamento')
  const acompanhamentoDetalhes = get('acompanhamento_detalhes')
  if (acompanhamento === 'Sim' && isEmpty(acompanhamentoDetalhes)) {
    pendings.push(pending(
      'acompanhamento-sem-detalhes',
      'pendencia',
      'Acompanhamento relatado sem detalhes',
      'O paciente indicou acompanhamento com outro profissional, mas não forneceu detalhes.',
      'Acompanhamento com outro profissional',
      acompanhamento,
      'Solicite especialidade e motivo durante a consulta.',
    ))
  }

  // Atividade física
  const atividadeFisica = get('atividade_fisica')
  const atividadeFisicaDetalhes = get('atividade_fisica_detalhes')
  if (atividadeFisica === 'Sim' && isEmpty(atividadeFisicaDetalhes)) {
    pendings.push(pending(
      'atividade-fisica-sem-detalhes',
      'pendencia',
      'Atividade física relatada sem detalhes',
      'O paciente indicou praticar atividade física, mas não forneceu tipo e frequência.',
      'Pratica atividade física',
      atividadeFisica,
      'Solicite tipo e frequência durante a consulta.',
    ))
  }

  // Substâncias
  const substancias = get('substancias')
  const substanciasDetalhes = get('substancias_detalhes')
  if (substancias === 'Sim' && isEmpty(substanciasDetalhes)) {
    pendings.push(pending(
      'substancias-sem-detalhes',
      'pendencia',
      'Uso de substâncias relatado sem detalhes',
      'O paciente indicou uso de álcool, cigarro, nicotina ou outras substâncias, mas não forneceu detalhes.',
      'Uso de álcool, cigarro, nicotina ou outras substâncias',
      substancias,
      'Solicite quais substâncias, frequência e última utilização durante a consulta.',
    ))
  }

  // Sintomas
  const sintomas = get('sintomas')
  const sintomasOutro = get('sintomas_outro')
  if (Array.isArray(sintomas) && sintomas.includes('Outro') && isEmpty(sintomasOutro)) {
    pendings.push(pending(
      'sintomas-outro-sem-detalhes',
      'pendencia',
      'Sintoma "Outro" selecionado sem detalhes',
      'O paciente selecionou "Outro" entre os sintomas, mas não explicou qual.',
      'Quais sintomas apresenta atualmente?',
      sintomas,
      'Solicite esclarecimento sobre o outro sintoma durante a consulta.',
    ))
  }

  // Tratamento anterior
  const tratamentoAnterior = get('tratamento_anterior')
  const tratamentoAnteriorDetalhes = get('tratamento_anterior_detalhes')
  if (tratamentoAnterior === 'Sim' && isEmpty(tratamentoAnteriorDetalhes)) {
    pendings.push(pending(
      'tratamento-anterior-sem-detalhes',
      'pendencia',
      'Tratamento anterior relatado sem detalhes',
      'O paciente indicou tratamento psicológico ou psiquiátrico anterior, mas não forneceu detalhes.',
      'Já realizou tratamento psicológico ou psiquiátrico?',
      tratamentoAnterior,
      'Solicite quando, por quanto tempo, motivo e experiência durante a consulta.',
    ))
  }

  // =========================================================================
  #region Conclusão e resumo
  // =========================================================================
  const highSeverityAlerts = alerts.filter(a => a.severity === 'alta')
  const mediumSeverityAlerts = alerts.filter(a => a.severity === 'media')

  let summary = ''
  let conclusion = ''

  if (highSeverityAlerts.length > 0) {
    summary = `Identificadas ${highSeverityAlerts.length} sinalização(ões) de alta prioridade que requerem atenção profissional durante a consulta.`
    conclusion = 'Recomenda-se prioridade na avaliação dos itens sinalizados como alta prioridade, conforme julgamento clínico do profissional.'
  } else if (mediumSeverityAlerts.length > 0) {
    summary = `Identificadas ${mediumSeverityAlerts.length} sinalização(ões) de prioridade média que merecem revisão durante a consulta.`
    conclusion = 'Revise os itens sinalizados durante a consulta e avalie a necessidade de acompanhamento aprofundado.'
  } else if (pendings.length > 0) {
    summary = `Não foram identificados alertas pelas regras disponíveis. Foram registradas ${pendings.length} pendência(ões) para esclarecimento durante a consulta.`
    conclusion = 'Utilize as pendências listadas como roteiro para complementar a anamnese durante a consulta presencial.'
  } else {
    summary = 'Nenhum alerta identificado pelas regras disponíveis.'
    conclusion = 'Nenhum alerta foi identificado pelas regras disponíveis. Isso não substitui a avaliação clínica profissional.'
  }

  const disclaimer = 'Este relatório é gerado por um motor interno de regras determinísticas (versão ' + ANAMNESE_ANALYSIS_VERSION + '). Ele não substitui o julgamento clínico do profissional, não cria diagnósticos e não classifica o paciente como "sem risco". Todas as sinalizações são baseadas exclusivamente nas respostas informadas pelo paciente na ficha de anamnese.'

  return {
    version: ANAMNESE_ANALYSIS_VERSION,
    generatedAt: new Date().toISOString(),
    patientName,
    completedAt,
    summary,
    alerts,
    pendings,
    scales,
    conclusion,
    disclaimer,
    hasAlerts: alerts.length > 0,
    hasPendings: pendings.length > 0,
    demoMode,
  }
}
