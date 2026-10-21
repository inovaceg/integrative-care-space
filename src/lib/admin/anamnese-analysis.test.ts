import { analyzeAnamnese, type AnalysisResult } from './anamnese-analysis'
import type { AnamneseAnswers } from './anamnese'

function runTest(name: string, answers: AnamneseAnswers, expected: Partial<AnalysisResult>) {
  const result = analyzeAnamnese(answers, { demoMode: true })
  console.log(`\n=== ${name} ===`)
  console.log('Summary:', result.summary)
  console.log('Alerts:', result.alerts.length)
  console.log('Pendings:', result.pendings.length)
  console.log('Scales:', result.scales.length)
  console.log('Has alerts:', result.hasAlerts)
  console.log('Has pendings:', result.hasPendings)

  if (expected.hasAlerts !== undefined) {
    if (result.hasAlerts !== expected.hasAlerts) {
      console.error(`FAIL: hasAlerts expected ${expected.hasAlerts}, got ${result.hasAlerts}`)
    } else {
      console.log(`PASS: hasAlerts = ${result.hasAlerts}`)
    }
  }
  if (expected.hasPendings !== undefined) {
    if (result.hasPendings !== expected.hasPendings) {
      console.error(`FAIL: hasPendings expected ${expected.hasPendings}, got ${result.hasPendings}`)
    } else {
      console.log(`PASS: hasPendings = ${result.hasPendings}`)
    }
  }
  if (expected.alertCount !== undefined) {
    if (result.alerts.length !== expected.alertCount) {
      console.error(`FAIL: alertCount expected ${expected.alertCount}, got ${result.alerts.length}`)
    } else {
      console.log(`PASS: alertCount = ${result.alerts.length}`)
    }
  }
  if (expected.pendingCount !== undefined) {
    if (result.pendings.length !== expected.pendingCount) {
      console.error(`FAIL: pendingCount expected ${expected.pendingCount}, got ${result.pendings.length}`)
    } else {
      console.log(`PASS: pendingCount = ${result.pendings.length}`)
    }
  }
  if (expected.highAlertCount !== undefined) {
    const high = result.alerts.filter(a => a.severity === 'alta').length
    if (high !== expected.highAlertCount) {
      console.error(`FAIL: highAlertCount expected ${expected.highAlertCount}, got ${high}`)
    } else {
      console.log(`PASS: highAlertCount = ${high}`)
    }
  }
  if (expected.mediumAlertCount !== undefined) {
    const medium = result.alerts.filter(a => a.severity === 'media').length
    if (medium !== expected.mediumAlertCount) {
      console.error(`FAIL: mediumAlertCount expected ${expected.mediumAlertCount}, got ${medium}`)
    } else {
      console.log(`PASS: mediumAlertCount = ${medium}`)
    }
  }
  if (expected.noRiskMessage !== undefined) {
    const hasNoRisk = result.summary.includes('Nenhum alerta identificado pelas regras disponíveis')
    if (hasNoRisk !== expected.noRiskMessage) {
      console.error(`FAIL: noRiskMessage expected ${expected.noRiskMessage}, got ${hasNoRisk}`)
    } else {
      console.log(`PASS: noRiskMessage = ${hasNoRisk}`)
    }
  }
  if (expected.alertIds) {
    const foundIds = result.alerts.map(a => a.id)
    for (const id of expected.alertIds) {
      if (!foundIds.includes(id)) {
        console.error(`FAIL: Missing alert ${id}`)
      } else {
        console.log(`PASS: Found alert ${id}`)
      }
    }
  }
  if (expected.pendingIds) {
    const foundIds = result.pendings.map(p => p.id)
    for (const id of expected.pendingIds) {
      if (!foundIds.includes(id)) {
        console.error(`FAIL: Missing pending ${id}`)
      } else {
        console.log(`PASS: Found pending ${id}`)
      }
    }
  }
  if (expected.scaleLabels) {
    const foundLabels = result.scales.map(s => s.label)
    for (const label of expected.scaleLabels) {
      if (!foundLabels.includes(label)) {
        console.error(`FAIL: Missing scale ${label}`)
      } else {
        console.log(`PASS: Found scale ${label}`)
      }
    }
  }
  if (expected.disclaimerContains) {
    for (const text of expected.disclaimerContains) {
      if (!result.disclaimer.includes(text)) {
        console.error(`FAIL: Disclaimer missing "${text}"`)
      } else {
        console.log(`PASS: Disclaimer contains "${text}"`)
      }
    }
  }
  return result
}

// Test 1: Pensamentos suicidas atuais com planejamento e acesso a meios
runTest('Pensamentos suicidas atuais com planejamento e acesso a meios', {
  motivo_atendimento: 'Não consigo mais lidar com a vida',
  modalidade: 'Psicologia',
  inicio_queixa: 'Há algumas semanas',
  impacto_vida: 'Não consigo trabalhar, não saio de casa',
  expectativa_tratamento: 'Quero voltar a me sentir bem',
  escala_prejuizo: 9,
  escala_ansiedade: 8,
  escala_tristeza: 9,
  sintomas: ['Tristeza', 'Falta de energia', 'Pensamentos repetitivos', 'Sensação de vazio'],
  tratamento_anterior: 'Não',
  pensamentos_morte: 'Sim, neste momento',
  pensamentos_presentes_agora: 'Sim',
  planejamento: 'Sim',
  acesso_meios: 'Sim',
  historico_risco: 'Já pensei em pular do prédio',
  fatores_impeditivos: 'Meu cachorro me mantém vivo',
  rede_apoio: 'Sim',
  rede_apoio_nome: 'Maria',
  rede_apoio_vinculo: 'Irmã',
  rede_apoio_telefone: '(11) 99999-9999',
  traumas: 'Não',
  relacionamentos: 'Isolado',
  sexualidade: 'Não',
  vida_profissional: 'Trabalho remoto, ansioso o tempo todo',
  espiritualidade: 'Não',
  doencas: 'Não',
  cirurgias: 'Não',
  alergias: 'Não',
  medicamentos: 'Sim',
  medicamentos_detalhes: 'Sertralina 50mg, há 2 anos',
  acompanhamento: 'Não',
  exames: 'Não',
  alimentacao: 'Pouco apetite',
  sono: 'Dificuldade para dormir',
  atividade_fisica: 'Não',
  substancias: 'Não',
}, {
  hasAlerts: true,
  hasPendings: true,
  highAlertCount: 3, // pensamentos-morte-atual, pensamentos-presentes-agora, planejamento-suicida, acesso-meios
  alertIds: ['pensamentos-morte-atual', 'pensamentos-presentes-agora', 'planejamento-suicida', 'acesso-meios'],
  pendingIds: ['historico-risco-passado'],
  scaleLabels: ['Prejuízo à qualidade de vida', 'Ansiedade', 'Tristeza ou desânimo'],
  disclaimerContains: ['motor interno', 'não substitui', 'não cria diagnósticos', 'não classifica'],
})

// Test 2: Histórico de pensamentos suicidas no passado
runTest('Histórico de pensamentos suicidas no passado', {
  motivo_atendimento: 'Ansiedade em situações sociais',
  modalidade: 'Psicologia',
  inicio_queixa: 'Há alguns meses',
  impacto_vida: 'Evito eventos sociais',
  expectativa_tratamento: 'Aprender a lidar com ansiedade',
  escala_prejuizo: 6,
  escala_ansiedade: 7,
  escala_tristeza: 3,
  sintomas: ['Ansiedade', 'Medo excessivo', 'Crises de pânico', 'Falta de concentração'],
  tratamento_anterior: 'Sim',
  tratamento_anterior_detalhes: 'Psicologia por 1 ano, há 3 anos',
  pensamentos_morte: 'Sim, no passado',
  pensamentos_presentes_agora: 'Não',
  planejamento: 'Não',
  acesso_meios: 'Não',
  historico_risco: 'Tentativa de overdose aos 22 anos',
  fatores_impeditivos: 'Terapia me ajudou muito',
  rede_apoio: 'Sim',
  rede_apoio_nome: 'Carlos',
  rede_apoio_vinculo: 'Namorado',
  rede_apoio_telefone: '(11) 88888-8888',
  traumas: 'Sim',
  traumas_detalhes: 'Perda da mãe aos 18 anos',
  relacionamentos: 'Relacionamento estável',
  sexualidade: 'Não',
  vida_profissional: 'Trabalho em escritório, estressado',
  espiritualidade: 'Sim',
  espiritualidade_detalhes: 'Pratico meditação',
  doencas: 'Não',
  cirurgias: 'Não',
  alergias: 'Não',
  medicamentos: 'Não',
  acompanhamento: 'Não',
  exames: 'Não',
  alimentacao: 'Alimentação equilibrada',
  sono: 'Sono regular',
  atividade_fisica: 'Sim',
  atividade_fisica_detalhes: 'Corrida 3x por semana',
  substancias: 'Não',
}, {
  hasAlerts: true,
  hasPendings: true,
  mediumAlertCount: 1, // pensamentos-morte-passado
  alertIds: ['pensamentos-morte-passado'],
  pendingIds: ['historico-risco-passado', 'traumas-detalhes'],
  scaleLabels: ['Prejuízo à qualidade de vida', 'Ansiedade', 'Tristeza ou desânimo'],
  disclaimerContains: ['motor interno', 'não substitui', 'não cria diagnósticos', 'não classifica'],
})

// Test 3: "Prefiro conversar pessoalmente" — pendência sem elevação de prioridade
runTest('"Prefiro conversar pessoalmente" — pendência sem elevação de prioridade', {
  motivo_atendimento: 'Dificuldade para dormir',
  modalidade: 'Psicologia',
  inicio_queixa: 'Há algumas semanas',
  impacto_vida: 'Cansaço durante o dia',
  expectativa_tratamento: 'Melhorar o sono',
  escala_prejuizo: 4,
  escala_ansiedade: 5,
  escala_tristeza: 2,
  sintomas: ['Alterações no sono', 'Falta de energia'],
  tratamento_anterior: 'Não',
  pensamentos_morte: 'Prefiro conversar pessoalmente',
  rede_apoio: 'Sim',
  rede_apoio_nome: 'Ana',
  rede_apoio_vinculo: 'Amiga',
  rede_apoio_telefone: '(11) 77777-7777',
  traumas: 'Prefiro conversar pessoalmente',
  relacionamentos: 'Relacionamento saudável',
  sexualidade: 'Prefiro conversar pessoalmente',
  vida_profissional: 'Trabalho presencial',
  espiritualidade: 'Não',
  doencas: 'Não',
  cirurgias: 'Não',
  alergias: 'Não',
  medicamentos: 'Não',
  acompanhamento: 'Não',
  exames: 'Vou apresentar durante a consulta',
  alimentacao: 'Alimentação regular',
  sono: 'Dificuldade para manter sono',
  atividade_fisica: 'Sim',
  atividade_fisica_detalhes: 'Caminhada leve',
  substancias: 'Não',
}, {
  hasAlerts: false,
  hasPendings: true,
  pendingIds: ['pensamentos-morte-pessoal', 'traumas-pessoal', 'sexualidade-pessoal', 'exames-apresentacao'],
  scaleLabels: ['Prejuízo à qualidade de vida', 'Ansiedade', 'Tristeza ou desânimo'],
  disclaimerContains: ['motor interno', 'não substitui', 'não cria diagnósticos', 'não classifica'],
})

// Test 4: Anamnese sem alertas — sem risco
runTest('Anamnese sem alertas — sem risco', {
  motivo_atendimento: 'Acompanhamento de rotina',
  modalidade: 'Psicologia',
  inicio_queixa: 'Há alguns meses',
  impacto_vida: 'Leve impacto no dia a dia',
  expectativa_tratamento: 'Manter o equilíbrio emocional',
  escala_prejuizo: 3,
  escala_ansiedade: 2,
  escala_tristeza: 1,
  sintomas: ['Falta de energia'],
  tratamento_anterior: 'Não',
  pensamentos_morte: 'Não',
  rede_apoio: 'Sim',
  rede_apoio_nome: 'Mãe',
  rede_apoio_vinculo: 'Familiar',
  rede_apoio_telefone: '(11) 66666-6666',
  traumas: 'Não',
  relacionamentos: 'Relacionamentos saudáveis',
  sexualidade: 'Não',
  vida_profissional: 'Trabalho remoto',
  espiritualidade: 'Não',
  doencas: 'Não',
  cirurgias: 'Não',
  alergias: 'Não',
  medicamentos: 'Não',
  acompanhamento: 'Não',
  exames: 'Não',
  alimentacao: 'Alimentação equilibrada',
  sono: 'Sono regular',
  atividade_fisica: 'Sim',
  atividade_fisica_detalhes: 'Yoga 2x por semana',
  substancias: 'Não',
}, {
  hasAlerts: false,
  hasPendings: false,
  noRiskMessage: true,
  scaleLabels: ['Prejuízo à qualidade de vida', 'Ansiedade', 'Tristeza ou desânimo'],
  disclaimerContains: ['motor interno', 'não substitui', 'não cria diagnósticos', 'não classifica'],
})

// Test 5: Informações ausentes e contraditórias — pendências
runTest('Informações ausentes e contraditórias — pendências', {
  motivo_atendimento: 'Dor nas costas',
  modalidade: 'Biomedicina/Estética',
  inicio_queixa: 'Há alguns meses',
  impacto_vida: 'Dificuldade para me mover',
  expectativa_tratamento: 'Aliviar a dor',
  escala_prejuizo: 5,
  escala_ansiedade: 0,
  escala_tristeza: 0,
  sintomas: ['Outro'],
  sintomas_outro: '',
  tratamento_anterior: 'Sim',
  pensamentos_morte: 'Não',
  rede_apoio: 'Não',
  traumas: 'Sim',
  relacionamentos: 'Relacionamento conturbado',
  sexualidade: 'Não',
  vida_profissional: 'Trabalho pesado',
  espiritualidade: 'Não',
  doencas: 'Sim',
  cirurgias: 'Não',
  alergias: 'Sim',
  medicamentos: 'Sim',
  acompanhamento: 'Sim',
  exames: 'Não',
  alimentacao: 'Alimentação irregular',
  sono: 'Sono pesado',
  atividade_fisica: 'Não',
  substancias: 'Não',
}, {
  hasAlerts: false,
  hasPendings: true,
  pendingIds: ['sintomas-outro-sem-detalhes', 'tratamento-anterior-sem-detalhes', 'rede-apoio-nao', 'traumas-sem-detalhes', 'doencas-sem-detalhes', 'alergias-sem-detalhes', 'medicamentos-sem-detalhes', 'acompanhamento-sem-detalhes'],
  scaleLabels: ['Prejuízo à qualidade de vida', 'Ansiedade', 'Tristeza ou desânimo'],
  disclaimerContains: ['motor interno', 'não substitui', 'não cria diagnósticos', 'não classifica'],
})

console.log('\n=== All tests completed ===')