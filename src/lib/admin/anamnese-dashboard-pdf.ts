import type { AnamneseAnswers } from './anamnese'
import type { AnalysisResult } from './anamnese-analysis'
import type { DocumentLine, DocumentPage } from './document-layout'
import { displayAnswer } from './anamnese-display'

const palette = { background: '#f2f6f5', dark: '#12383c', ink: '#183038', muted: '#48636c', teal: '#147c74', pale: '#e2efec', amber: '#fff0dd', brown: '#793d19' }

export function anamneseDashboardWrap(text: string, size: number, maxWidth: number, bold = false): string[] {
  const context = typeof document === 'undefined' ? null : document.createElement('canvas').getContext('2d')
  if (context) context.font = `${bold ? 'bold' : 'normal'} ${size}px Arial`
  const measure = (value: string) => context ? context.measureText(value).width : value.length * size * 0.55
  return text.replace(/\r/g, '').split('\n').flatMap(paragraph => {
    if (!paragraph.trim()) return ['']
    const lines: string[] = []
    let line = ''
    for (const word of paragraph.trim().split(/\s+/)) {
      if (measure(line ? `${line} ${word}` : word) <= maxWidth) {
        line = line ? `${line} ${word}` : word
      } else {
        if (line) lines.push(line)
        line = ''
        for (const char of word) {
          if (line && measure(line + char) > maxWidth) { lines.push(line); line = '' }
          line += char
        }
      }
    }
    if (line) lines.push(line)
    return lines
  })
}

function roundedCard(x: number, y: number, width: number, height: number, color: string, radius = 12): DocumentLine {
  const r = Math.min(radius, width / 2, height / 2)
  const c = r * 0.552285
  let path = ''
  let pdfPath = ''
  const command = (svg: string, pdf: string, points: number[]) => {
    path += `${svg} ${points.join(' ')} `
    pdfPath += `${points.map((value, index) => index % 2 ? 842 - value : value).join(' ')} ${pdf} `
  }
  command('M', 'm', [x + r, y])
  command('L', 'l', [x + width - r, y])
  command('C', 'c', [x + width - r + c, y, x + width, y + r - c, x + width, y + r])
  command('L', 'l', [x + width, y + height - r])
  command('C', 'c', [x + width, y + height - r + c, x + width - r + c, y + height, x + width - r, y + height])
  command('L', 'l', [x + r, y + height])
  command('C', 'c', [x + r - c, y + height, x, y + height - r + c, x, y + height - r])
  command('L', 'l', [x, y + r])
  command('C', 'c', [x, y + r - c, x + r - c, y, x + r, y])
  return { text: '', x, y, size: 0, kind: 'path', color, path: `${path}Z`, pdfPath: `${pdfPath}h` }
}

export function buildAnamneseDashboard(patientName: string, completedAt: string, answers: AnamneseAnswers, analysis: AnalysisResult): DocumentPage[] {
  const pages: DocumentPage[] = []
  let page: DocumentPage = []
  let y = 24
  const date = new Date(completedAt).toLocaleDateString('pt-BR')
  const short = (value: string, length = 230) => value.length > length ? `${value.slice(0, length).trimEnd()}…` : value
  const answer = (key: string) => {
    const value = answers[key]
    return value === undefined || value === null || value === '' || (Array.isArray(value) && !value.length) ? 'Não informado' : displayAnswer(value)
  }
  const text = (value: string, x: number, baseline: number, size = 10, color = palette.ink, bold = false) => {
    page.push({ text: value, x, y: baseline, size, color, bold })
  }
  const newPage = () => {
    page = [{ text: '', x: 0, y: 0, size: 0, kind: 'rect', width: 595, height: 842, color: palette.background }]
    pages.push(page)
    y = 24
    if (pages.length > 1) {
      text('PAINEL DA CONSULTA · CONTINUAÇÃO', 24, 40, 11, palette.dark, true)
      text(short(patientName, 85), 24, 58, 10, palette.muted)
      y = 78
    }
  }
  const room = (height: number) => { if (y + height > 762) newPage() }
  newPage()

  const patientLines = anamneseDashboardWrap(patientName, 15, 503, true)
  const objectiveLines = anamneseDashboardWrap(`Objetivo relatado · ${short(answer('expectativa_tratamento'), 190)}`, 10, 503)
  const headerHeight = 80 + patientLines.length * 18 + objectiveLines.length * 13
  page.push(roundedCard(24, y, 547, headerHeight, palette.dark))
  text(`ATENDIMENTO INTEGRADO / ANAMNESE DE ${date}`, 42, y + 25, 9, '#acd7ce', true)
  text('Painel da consulta', 42, y + 57, 27, '#ffffff', true)
  let headerY = y + 80
  patientLines.forEach(line => { text(line, 42, headerY, 15, '#ffffff', true); headerY += 18 })
  objectiveLines.forEach(line => { text(line, 42, headerY + 4, 10, '#d6e7e5'); headerY += 13 })
  y += headerHeight + 14

  const priority = analysis.alerts.find(item => item.category === 'seguranca') ?? analysis.alerts[0]
  const review = priority
    ? `${priority.description}\n${priority.recommendation}\nPergunta: ${priority.question}\nResposta registrada: ${priority.originalAnswer}`
    : 'Revisar as respostas e os temas reservados para a consulta. A ausência de sinalizações pelas regras disponíveis não determina a situação clínica atual.'
  const reviewLines = anamneseDashboardWrap(review, 10, 511)
  for (let offset = 0; offset < reviewLines.length; offset += 18) {
    const chunk = reviewLines.slice(offset, offset + 18)
    const height = 48 + chunk.length * 13
    room(height)
    page.push(roundedCard(24, y, 547, height, priority ? palette.amber : palette.pale))
    text(offset ? 'Revisar primeiro · continuação' : priority ? 'Revisar primeiro' : 'Revisão em consulta', 42, y + 23, 15, priority ? palette.brown : palette.dark, true)
    chunk.forEach((line, index) => text(line, 42, y + 44 + index * 13, 10, palette.muted))
    y += height + 14
  }

  room(132)
  text('Como a pessoa descreveu o impacto', 24, y + 12, 15, palette.ink, true)
  y += 26
  const metrics = [
    ['Prejuízo à qualidade de vida', 'escala_prejuizo'],
    ['Ansiedade', 'escala_ansiedade'],
    ['Tristeza ou desânimo', 'escala_tristeza'],
  ]
  metrics.forEach(([label, key], index) => {
    const x = 24 + index * 186
    const raw = answers[key]
    const value = raw === undefined || raw === null || raw === '' || typeof raw === 'boolean' || Array.isArray(raw) ? null : Number(raw)
    const valid = value !== null && Number.isFinite(value) && value >= 0 && value <= 10
    page.push(roundedCard(x, y, 175, 77, '#ffffff'))
    text(label, x + 12, y + 19, 8.5, palette.ink, true)
    text(valid ? `${value}/10` : 'Não informado', x + 12, y + 47, valid ? 23 : 12, palette.teal, true)
    page.push(roundedCard(x + 12, y + 59, 151, 5, '#deE9e7', 2.5))
    if (valid && value > 0) page.push(roundedCard(x + 12, y + 59, 151 * value / 10, 5, palette.teal, 2.5))
  })
  y += 90
  text('Notas autorrelatadas, sem interpretação diagnóstica automática.', 24, y, 8, palette.muted)
  text('Na escala de prejuízo, 10/10 indica o maior prejuízo informado.', 24, y + 12, 8, palette.muted)
  y += 27

  const medicationFields = [['medicamentos_detalhes', 'Medicamentos/suplementos'], ['tirzepatida', 'Tirzepatida'], ['semaglutida', 'Semaglutida'], ['outros_medicamentos_emagrecimento', 'Outros medicamentos']]
  const medications = medicationFields.filter(([key]) => answer(key) !== 'Não informado').map(([key, label]) => `${label}: ${answer(key)}`).join('. ')
  const cardEntries: Array<[string, string]>[] = [
    [['Sintomas relatados', answer('sintomas')], ['Tratamento anterior', answer('tratamento_anterior_detalhes') !== 'Não informado' ? answer('tratamento_anterior_detalhes') : answer('tratamento_anterior')], ['Temas para a consulta', answer('traumas')]],
    [['Peso informado', answer('peso')], ['Medicamentos e suplementos', medications || answer('medicamentos')], ['Exames laboratoriais', answer('exames')]],
  ]
  const titles = ['Saúde emocional', 'Peso e acompanhamento']
  const prepared = cardEntries.map(entries => entries.map(([label, value]) => ({ label, lines: anamneseDashboardWrap(short(value), 9.5, 236) })))
  const heights = prepared.map(entries => 43 + entries.reduce((height, entry) => height + 17 + entry.lines.length * 12 + 12, 0))
  const cardHeight = Math.max(...heights)
  room(cardHeight + 14)
  prepared.forEach((entries, index) => {
    const x = 24 + index * 279
    page.push(roundedCard(x, y, 268, cardHeight, '#ffffff'))
    text(titles[index], x + 16, y + 26, 15, palette.ink, true)
    let cursor = y + 51
    entries.forEach(entry => {
      text(entry.label, x + 16, cursor, 10, palette.teal, true)
      cursor += 17
      entry.lines.forEach(line => { text(line, x + 16, cursor, 9.5, palette.muted); cursor += 12 })
      cursor += 12
    })
  })
  y += cardHeight + 14

  const routine = `Atividade física: ${answer('atividade_fisica_detalhes') !== 'Não informado' ? answer('atividade_fisica_detalhes') : answer('atividade_fisica')}. Sono: ${answer('sono')}. Alimentação e água: ${answer('alimentacao')}. Cirurgias/internações: ${answer('cirurgias_detalhes') !== 'Não informado' ? answer('cirurgias_detalhes') : answer('cirurgias')}.`
  const routineLines = anamneseDashboardWrap(short(routine, 360), 10, 511)
  const routineHeight = 48 + routineLines.length * 13
  room(routineHeight)
  page.push(roundedCard(24, y, 547, routineHeight, palette.pale))
  text('Rotina e histórico relatados', 42, y + 24, 13, palette.ink, true)
  routineLines.forEach((line, index) => text(line, 42, y + 46 + index * 13, 10, palette.muted))

  pages.forEach(current => {
    current.push({ text: `Uso clínico reservado · Síntese da ficha de ${date}`, x: 24, y: 785, size: 8.5, color: palette.muted, bold: true })
    current.push({ text: 'Autorrelatos. A situação atual requer avaliação clínica. Respostas completas nas próximas páginas.', x: 24, y: 801, size: 8, color: palette.muted })
    current.push({ text: 'Campos resumidos no painel; consulte a ficha integral antes de qualquer conduta.', x: 24, y: 814, size: 8, color: palette.muted })
  })
  return pages
}
