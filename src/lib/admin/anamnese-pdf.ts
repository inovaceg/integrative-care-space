import type { AnalysisResult } from './anamnese-analysis'
import type { AnamneseAnswers } from './anamnese'
import type { DocumentPage } from './document-layout'
import { displayAnswer } from './anamnese-display'
import { anamneseDashboardWrap, buildAnamneseDashboard } from './anamnese-dashboard-pdf'

export function buildAnamnesePdf(
  patientName: string,
  completedAt: string,
  sections: Array<[string, Array<[string, unknown]>]>,
  analysis: AnalysisResult,
  answers: AnamneseAnswers,
): DocumentPage[] {
  const pages: DocumentPage[] = buildAnamneseDashboard(patientName, completedAt, answers, analysis)
  let page: DocumentPage = []
  let y = 0

  const nextPage = () => {
    page = []
    pages.push(page)
    page.push({ text: '', x: 24, y: 24, size: 0, kind: 'rect', width: 547, height: 6, color: '#147c74' })
    page.push({ text: 'FICHA INTEGRAL E ANÁLISE CLÍNICA', x: 42, y: 62, size: 14, bold: true, color: '#12383c' })
    const nameLines = anamneseDashboardWrap(`Paciente: ${patientName}`, 11, 511, true)
    nameLines.forEach((text, index) => page.push({ text, x: 42, y: 88 + index * 15, size: 11, bold: true }))
    const dateY = 106 + (nameLines.length - 1) * 15
    page.push({ text: `Preenchida em: ${new Date(completedAt).toLocaleString('pt-BR')}`, x: 42, y: dateY, size: 9, color: '#475569' })
    y = dateY + 30
  }

  const addText = (text: string, size: number, bold = false, color = '#334155') => {
    const lines = anamneseDashboardWrap(text, size, 511, bold)
    if (bold && y + (size + 5) * 2 > 730) nextPage()
    lines.forEach((line) => {
      if (y + size > 730) nextPage()
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

  pages.forEach((currentPage, index) => currentPage.push({ text: `Pagina ${index + 1} de ${pages.length}`, x: 270, y: 832, size: 8, color: '#64748b', align: 'center' }))
  return pages
}
