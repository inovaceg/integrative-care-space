import { describe, expect, test } from 'bun:test'
import { buildAnamnesePdf } from './anamnese-pdf'
import { buildAnamneseDashboard } from './anamnese-dashboard-pdf'
import { analyzeAnamnese } from './anamnese-analysis'

const date = '2026-10-21T12:00:00Z'
const patient = 'Paciente fictício para teste'
const answers = { expectativa_tratamento: 'Melhorar o bem-estar', escala_prejuizo: 0, escala_ansiedade: 8, escala_tristeza: 7, peso: '79,45', sono: 'Sono regular', sintomas: ['Ansiedade'], exames: 'Vou apresentar durante a consulta' }
const textOf = pages => pages.flat().map(line => line.text).join(' ').replace(/\s+/g, ' ')

describe('painel de anamnese no PDF', () => {
  test('mostra somente os dados reais recebidos e preserva escala zero', () => {
    const pages = buildAnamneseDashboard(patient, date, answers, analyzeAnamnese(answers))
    const text = textOf(pages)
    expect(text).toContain('Painel da consulta')
    expect(text).toContain(patient)
    expect(text).toContain('0/10')
    expect(text).toContain('8/10')
    expect(text).toContain('7/10')
    expect(text).toContain('79,45')
    expect(text).not.toContain('Franciane')
    expect(text).not.toContain('tirzepatida')
    expect(text).not.toContain('Sem risco')
  })

  test('campos ausentes não recebem valores do exemplo', () => {
    const pages = buildAnamneseDashboard(patient, date, {}, analyzeAnamnese({}))
    expect(textOf(pages)).toContain('Não informado')
    expect(pages.flat().some(line => /^\d+\/10$/.test(line.text))).toBe(false)
    expect(textOf(pages)).toContain('não determina a situação clínica atual')
  })

  test('preserva perguntas, respostas, consentimentos e análise no documento completo', () => {
    const sections = [['Ficha completa', [['Resposta integral', 'Resposta que deve permanecer inteira.'], ['Consentimento LGPD', 'Aceito']]]]
    const analysis = analyzeAnamnese(answers)
    const pages = buildAnamnesePdf(patient, date, sections, analysis, answers)
    const text = textOf(pages)
    expect(text).toContain('Resposta integral: Resposta que deve permanecer inteira.')
    expect(text).toContain('Consentimento LGPD: Aceito')
    expect(text).toContain(analysis.conclusion.slice(0, 30))
    expect(text).toContain(`Pagina ${pages.length} de ${pages.length}`)
    expect(pages.length).toBeGreaterThan(1)
  })

  test('formas vetoriais são válidas e o painel respeita o limite de conteúdo', () => {
    const pages = buildAnamneseDashboard(patient, date, answers, analyzeAnamnese(answers))
    for (const page of pages) {
      for (const line of page) {
        expect(Number.isFinite(line.x)).toBe(true)
        expect(Number.isFinite(line.y)).toBe(true)
        if (line.kind === 'path') {
          expect(line.pdfPath).not.toMatch(/NaN|Infinity|undefined/)
          expect(line.y).toBeLessThan(762)
        }
        expect(line.y).toBeLessThanOrEqual(842)
      }
    }
  })
})
