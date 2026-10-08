import type { AnamneseAnswers, AnamneseRecord } from './anamnese'

type Section = [string, Array<[string, unknown]>]

export const anamneseFields: Array<[string, Array<[string, string]>]> = [
  ['Motivo do atendimento', [
    ['motivo_atendimento', 'Motivo do atendimento'], ['modalidade', 'Modalidade'],
    ['inicio_queixa', 'Início da queixa'], ['evento_agravante', 'Acontecimento que iniciou ou agravou o problema'],
    ['evento_agravante_detalhes', 'Detalhes do acontecimento'], ['impacto_vida', 'Impacto na vida'],
    ['expectativa_tratamento', 'Expectativa com o tratamento'], ['escala_prejuizo', 'Prejuízo à qualidade de vida (0–10)'],
  ]],
  ['Histórico de saúde', [
    ['doencas', 'Doença ou condição diagnosticada'], ['doencas_detalhes', 'Detalhes das condições de saúde'],
    ['cirurgias', 'Cirurgias ou internações'], ['cirurgias_detalhes', 'Detalhes das cirurgias ou internações'],
    ['alergias', 'Possui alergias'], ['alergias_detalhes', 'Detalhes das alergias'],
    ['medicamentos', 'Uso de medicamentos ou suplementos'], ['medicamentos_detalhes', 'Detalhes dos medicamentos ou suplementos'],
    ['acompanhamento', 'Acompanhamento com outro profissional'], ['acompanhamento_detalhes', 'Detalhes do acompanhamento'],
    ['exames', 'Exames laboratoriais recentes'],
  ]],
  ['Hábitos e rotina', [
    ['alimentacao', 'Alimentação e ingestão de água'], ['sono', 'Sono'],
    ['atividade_fisica', 'Pratica atividade física'], ['atividade_fisica_detalhes', 'Tipo e frequência da atividade física'],
    ['substancias', 'Uso de álcool, cigarro, nicotina ou outras substâncias'], ['substancias_detalhes', 'Detalhes do uso de substâncias'],
  ]],
  ['Saúde emocional', [
    ['sintomas', 'Sintomas atuais'], ['sintomas_outro', 'Outro sintoma'],
    ['escala_ansiedade', 'Ansiedade (0–10)'], ['escala_tristeza', 'Tristeza ou desânimo (0–10)'],
    ['tratamento_anterior', 'Tratamento psicológico ou psiquiátrico anterior'], ['tratamento_anterior_detalhes', 'Detalhes do tratamento anterior'],
    ['pensamentos_morte', 'Pensamentos de morte, autolesão ou suicídio'], ['pensamentos_presentes_agora', 'Pensamentos presentes neste momento'],
    ['planejamento', 'Existe planejamento'], ['acesso_meios', 'Acesso aos meios mencionados'],
    ['historico_risco', 'Tentativa anterior ou autolesão'], ['fatores_impeditivos', 'O que ajuda a impedir uma ação'],
    ['rede_apoio', 'Possui alguém para procurar em uma crise'], ['rede_apoio_nome', 'Rede de apoio — nome'],
    ['rede_apoio_vinculo', 'Rede de apoio — vínculo'], ['rede_apoio_telefone', 'Rede de apoio — telefone'],
    ['traumas', 'Traumas, perdas, violência ou abuso'], ['traumas_detalhes', 'Detalhes dos traumas ou perdas'],
  ]],
  ['Relacionamentos e bem-estar', [
    ['relacionamentos', 'Relacionamentos familiares, afetivos e sociais'], ['sexualidade', 'Dificuldades relacionadas à sexualidade'],
    ['sexualidade_detalhes', 'Detalhes das dificuldades relacionadas à sexualidade'], ['vida_profissional', 'Rotina profissional ou acadêmica'],
    ['espiritualidade', 'Religião, espiritualidade ou prática de enfrentamento'], ['espiritualidade_detalhes', 'Detalhes da espiritualidade'],
  ]],
  ['Informações biomédicas', [
    ['objetivo_biomedicina', 'Região, condição ou objetivo do tratamento'], ['peso', 'Peso atual'], ['altura', 'Altura'],
    ['tratamentos_anteriores', 'Tratamentos anteriores'], ['tirzepatida', 'Uso de tirzepatida'], ['semaglutida', 'Uso de semaglutida'],
    ['outros_medicamentos_emagrecimento', 'Outros medicamentos para emagrecimento'], ['gestacao_amamentacao', 'Gestação ou amamentação'],
    ['anticoagulante', 'Uso de anticoagulante'], ['tendencia_manchas', 'Tendência a manchas'], ['tendencia_queloides', 'Tendência a queloides'],
    ['doenca_autoimune', 'Doença autoimune'], ['herpes_recorrente', 'Herpes recorrente'], ['uso_acidos', 'Uso de ácidos'], ['isotretinoina', 'Uso de isotretinoína'],
  ]],
  ['Observações finais', [['observacoes_finais', 'Informações adicionais']]],
]

export function hasAnswer(value: unknown) {
  return value !== undefined && value !== null && value !== ''
}

export function displayAnswer(value: unknown): string {
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não'
  if (Array.isArray(value)) return value.length ? value.map(displayAnswer).join(', ') : 'Nenhuma opção selecionada'
  if (value && typeof value === 'object') return JSON.stringify(value, null, 2)
  return String(value)
}

export function getAnamneseSections(answers: AnamneseAnswers): Section[] {
  const sections: Section[] = anamneseFields.map(([title, fields]) => [title, fields
    .filter(([key]) => hasAnswer(answers[key]))
    .map(([key, label]) => [label, answers[key]])])
  const knownKeys = new Set(anamneseFields.flatMap(([, fields]) => fields.map(([key]) => key)))
  const otherAnswers = Object.entries(answers).filter(([key, value]) => !knownKeys.has(key) && hasAnswer(value))
  if (otherAnswers.length) sections.push(['Outras respostas registradas', otherAnswers.map(([key, value]) => [key.replaceAll('_', ' '), value])])
  return sections.filter(([, items]) => items.length > 0)
}

export function getAnamneseConsents(record: AnamneseRecord): Array<[string, unknown]> {
  return [
    ['Consentimento LGPD', record.lgpd_consentimento ? 'Aceito' : 'Não registrado'],
    ['Declaração de veracidade', record.declaracao_veracidade ? 'Aceita' : 'Não registrada'],
    ['Ciência sobre urgência', record.ciencia_urgencia ? 'Aceita' : 'Não registrada'],
    ['Registro fotográfico no prontuário', record.autorizacao_foto_prontuario ? 'Autorizado' : 'Não autorizado'],
    ['Divulgação pública de imagens', record.autorizacao_divulgacao_imagem ? 'Autorizada' : 'Não autorizada'],
    ['Assinatura eletrônica', record.assinatura_eletronica ?? 'Não registrada'],
    ['Versão do termo', record.termo_versao ?? 'Não registrada'],
    ['Consentimento em', record.lgpd_data_consentimento ? new Date(record.lgpd_data_consentimento).toLocaleString('pt-BR') : 'Não registrado'],
  ]
}
