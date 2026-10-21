import type { AnalysisResult } from './anamnese-analysis'
import type { DocumentPage } from './document-layout'
import { displayAnswer } from './anamnese-display'

export function buildAnamnesePdf(
  patientName: string,
  completedAt: string,
  sections: Array<[string, Array<[string, unknown]>]>,
  analysis: AnalysisResult,
): DocumentPage[] {
  const pages: DocumentPage[] = []
  let page: DocumentPage = []
  let y = 0

  const nextPage = () => {
    page = []
    pages.push(page)
    page.push({ text: 'FICHA DE ANAMNESE E ANALISE CLINICA', x: 42, y: 62, size: 14, bold: true, color: '#123c3d' })
    page.push({ text: `Paciente: ${patientName}`, x: 42, y: 88, size: 11, bold: true })
    page.push({ text: `Preenchida em: ${new Date(completedAt).toLocaleString('pt-BR')}`, x: 42, y: 106, size: 9, color: '#475569' })
    y = 145
  }

  const addText = (text: string, size: number, bold = false, color = '#334155') => {
    const words = text.split(/\s+/)
    let currentLine = ''
    const lines: string[] = []
    words.forEach((word) => {
      if (currentLine && `${currentLine} ${word}`.length > 88) {
        lines.push(currentLine)
        currentLine = word
      } else currentLine = currentLine ? `${currentLine} ${word}` : word
    })
    if (currentLine) lines.push(currentLine)
    lines.forEach((line) => {
      if (y > 700) nextPage()
      page.push({ text: line, x: 42, y, size, bold, color })
      y += size + 5
    })
  }

  nextPage()
  sections.forEach(([title, items]) => {
    y += 8
    addText(title, 12, true, '#21655f')
    items.forEach(([label, value]) => addText(`${label}: ${displayAnswer(value)}`, 9.5))
  })

  y += 14
  addText('RELATORIO DE ANALISE CLINICA', 13, true, '#123c3d')
  y += 4
  addText(`Resumo: ${analysis.summary}`, 10)

  if (analysis.alerts.length) {
    y += 8
    addText(`ALERTAS CLINICOS (${analysis.alerts.length})`, 11, true, '#9f1239')
    analysis.alerts.forEach((alert) => {
      y += 4
      addText(`${alert.severity.toUpperCase()} - ${alert.title}`, 10, true, '#7f1d1d')
      addText(alert.description, 9.5)
      addText(`Pergunta: ${alert.question}`, 9.5)
      addText(`Resposta: ${alert.originalAnswer}`, 9.5)
      addText(`Recomendacao: ${alert.recommendation}`, 9.5)
    })
  } else {
    y += 8
    addText('Nenhum alerta identificado pelas regras disponiveis.', 10, true, '#166534')
  }

  if (analysis.pendings.length) {
    y += 8
    addText(`PENDENCIAS PARA A CONSULTA (${analysis.pendings.length})`, 11, true, '#92400e')
    analysis.pendings.forEach((pending) => {
      y += 4
      addText(pending.title, 10, true, '#78350f')
      addText(pending.description, 9.5)
      addText(`Pergunta: ${pending.question}`, 9.5)
      addText(`Resposta: ${pending.originalAnswer}`, 9.5)
      addText(`Motivo: ${pending.reason}`, 9.5)
    })
  }

  if (analysis.scales.length) {
    y += 8
    addText('ESCALAS INFORMADAS', 11, true, '#21655f')
    analysis.scales.forEach((scale) => addText(`${scale.label}: ${scale.value ?? 'Nao informado'}/${scale.max} - ${scale.note}`, 9.5))
  }

  y += 8
  addText('CONCLUSAO DE APOIO PROFISSIONAL', 11, true, '#21655f')
  addText(analysis.conclusion, 9.5)
  addText(`Aviso: ${analysis.disclaimer}`, 8.5, false, '#475569')
  addText(`Motor de analise v${analysis.version} - Gerado em ${new Date(analysis.generatedAt).toLocaleString('pt-BR')}`, 8.5, false, '#64748b')

  pages.forEach((currentPage, index) => currentPage.push({ text: `Pagina ${index + 1} de ${pages.length}`, x: 270, y: 810, size: 8, color: '#64748b', align: 'center' }))
  return pages
}
