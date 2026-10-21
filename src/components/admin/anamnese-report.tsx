import { useState } from 'react'
import {
  AlertTriangle,
  AlertCircle,
  Info,
  FileText,
  Printer,
  ChevronDown,
  ShieldAlert,
  Clock,
  HelpCircle,
  CheckCircle2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import type { AnalysisResult, AnalysisAlert, AnalysisPending, AnalysisScale } from '@/lib/admin/anamnese-analysis'

const SEVERITY_CONFIG = {
  alta: { color: 'bg-red-100 text-red-800 border-red-200', icon: AlertTriangle, label: 'Alta prioridade' },
  media: { color: 'bg-amber-100 text-amber-800 border-amber-200', icon: AlertCircle, label: 'Prioridade média' },
  baixa: { color: 'bg-blue-100 text-blue-800 border-blue-200', icon: Info, label: 'Baixa prioridade' },
  informativo: { color: 'bg-slate-100 text-slate-800 border-slate-200', icon: Info, label: 'Informativo' },
} as const

const CATEGORY_CONFIG = {
  seguranca: { label: 'Segurança e risco', icon: ShieldAlert },
  'saude-emocional': { label: 'Saúde emocional', icon: HelpCircle },
  clinico: { label: 'Clínico', icon: FileText },
  pendencia: { label: 'Pendência', icon: Clock },
  informacao: { label: 'Informação', icon: Info },
} as const

function formatDate(value: string | undefined) {
  if (!value) return '—'
  return new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

function ScaleBar({ label, value, max, note }: AnalysisScale) {
  const percentage = value !== null ? Math.min(100, Math.max(0, (value / max) * 100)) : 0
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="text-slate-500">{value !== null ? `${value}/${max}` : 'Não informado'}</span>
      </div>
      <div className="relative h-3 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full bg-[#2f8f82] transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <p className="text-xs text-slate-500">{note}</p>
    </div>
  )
}

function AlertCard({ alert, index }: { alert: AnalysisAlert; index: number }) {
  const config = SEVERITY_CONFIG[alert.severity]
  const categoryConfig = CATEGORY_CONFIG[alert.category]
  const Icon = config.icon
  const CategoryIcon = categoryConfig.icon

  return (
    <Card className={`border-l-4 ${config.color.replace('bg-', 'border-l-')}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <Icon className="size-5" style={{ color: config.color.split(' ')[0].replace('bg-', 'text-') }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
                <CategoryIcon className="size-3" />
                {categoryConfig.label}
              </span>
              <Badge variant="outline" className={config.color}>{config.label}</Badge>
            </div>
            <h4 className="mt-2 font-semibold text-slate-800">{alert.title}</h4>
            <p className="mt-1 text-sm text-slate-600">{alert.description}</p>

            <div className="mt-3 space-y-2 text-sm">
              <div className="flex items-center gap-2 text-slate-500">
                <span className="font-medium text-slate-700 w-28 shrink-0">Pergunta:</span>
                <span className="text-slate-700">{alert.question}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-500">
                <span className="font-medium text-slate-700 w-28 shrink-0">Resposta:</span>
                <span className="text-slate-700 font-mono bg-slate-50 px-2 py-0.5 rounded">{alert.originalAnswer}</span>
              </div>
            </div>

            <div className="mt-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-2 text-sm">
                <Info className="size-4 text-[#2f8f82]" />
                <span className="font-medium text-slate-700">Recomendação:</span>
              </div>
              <p className="mt-1 text-sm text-slate-600">{alert.recommendation}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function PendingCard({ pending, index }: { pending: AnalysisPending; index: number }) {
  return (
    <Card className="border-l-4 border-amber-300 bg-amber-50/50">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <Clock className="size-5 text-amber-700" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200">
                Pendência
              </Badge>
            </div>
            <h4 className="mt-2 font-semibold text-slate-800">{pending.title}</h4>
            <p className="mt-1 text-sm text-slate-600">{pending.description}</p>

            <div className="mt-3 space-y-2 text-sm">
              <div className="flex items-center gap-2 text-slate-500">
                <span className="font-medium text-slate-700 w-28 shrink-0">Pergunta:</span>
                <span className="text-slate-700">{pending.question}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-500">
                <span className="font-medium text-slate-700 w-28 shrink-0">Resposta:</span>
                <span className="text-slate-700 font-mono bg-white px-2 py-0.5 rounded border">{pending.originalAnswer}</span>
              </div>
            </div>

            <div className="mt-3 p-3 rounded-lg bg-white border border-amber-200">
              <div className="flex items-center gap-2 text-sm">
                <Info className="size-4 text-amber-700" />
                <span className="font-medium text-slate-700">Motivo:</span>
              </div>
              <p className="mt-1 text-sm text-slate-600">{pending.reason}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function NoAlertsCard() {
  return (
    <Card className="border-l-4 border-emerald-300 bg-emerald-50/50">
      <CardContent className="p-5">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <CheckCircle2 className="size-5 text-emerald-700" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-emerald-900">Nenhum alerta identificado pelas regras disponíveis</h4>
            <p className="mt-2 text-sm text-emerald-800">
              As regras atuais (versão 1.0.0) não identificaram sinalizações de prioridade alta ou média nas respostas fornecidas.
            </p>
            <div className="mt-3 p-3 rounded-lg bg-emerald-100 border border-emerald-200">
              <div className="flex items-center gap-2 text-sm">
                <ShieldAlert className="size-4 text-emerald-700" />
                <span className="font-medium text-emerald-900">Importante:</span>
              </div>
              <p className="mt-1 text-sm text-emerald-800">
                Isso <strong>não substitui a avaliação clínica profissional</strong>. A ausência de alertas automáticos não significa ausência de risco ou necessidade clínica. O profissional deve conduzir a avaliação completa durante a consulta.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function AnamneseReport({
  result,
  onPrint,
  onIncludeInPdf,
}: {
  result: AnalysisResult
  onPrint?: () => void
  onIncludeInPdf?: () => void
}) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    alerts: true,
    pendings: true,
    scales: true,
  })

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  const { alerts, pendings, scales, summary, conclusion, disclaimer, version, generatedAt, patientName, completedAt, demoMode } = result

  const highAlerts = alerts.filter(a => a.severity === 'alta')
  const mediumAlerts = alerts.filter(a => a.severity === 'media')
  const lowAlerts = alerts.filter(a => a.severity === 'baixa')
  const infoAlerts = alerts.filter(a => a.severity === 'informativo')

  return (
    <TooltipProvider>
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[#2f8f82]">Relatório de Análise Clínica</span>
                {demoMode && (
                  <Badge variant="secondary" className="text-xs">Modo demonstração</Badge>
                )}
              </div>
              <CardTitle className="mt-1 font-display text-xl">{patientName ?? 'Paciente'}</CardTitle>
              <p className="mt-1 text-sm text-slate-500">
                {completedAt ? `Preenchida em ${formatDate(completedAt)}` : 'Anamnese em andamento'}
                {demoMode && ' · Dados fictícios para validação das regras'}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" onClick={onPrint} disabled={!onPrint}>
                    <Printer className="mr-2 size-4" />Gerar PDF
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">Imprime o relatório ou salva como PDF</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" onClick={onIncludeInPdf} disabled={!onIncludeInPdf}>
                    <FileText className="mr-2 size-4" />Incluir no PDF da ficha
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">Adiciona este relatório ao PDF da ficha de anamnese</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-4 space-y-6">
          {/* Resumo */}
          <Card className="bg-slate-50 border-slate-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-sm">
                <Info className="size-4 text-[#2f8f82]" />
                <span className="font-medium text-slate-700">Resumo da análise</span>
              </div>
              <p className="mt-2 text-sm text-slate-600">{summary}</p>
            </CardContent>
          </Card>

          {/* Alertas */}
          <Collapsible open={expandedSections.alerts} onOpenChange={() => toggleSection('alerts')}>
            <CollapsibleTrigger className="flex w-full items-center justify-between p-4 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-3">
                <AlertTriangle className="size-5 text-red-600" />
                <span className="font-semibold text-slate-800">Alertas clínicos ({alerts.length})</span>
                {highAlerts.length > 0 && (
                  <Badge variant="destructive" className="ml-2">{highAlerts.length} alta</Badge>
                )}
                {mediumAlerts.length > 0 && (
                  <Badge variant="secondary" className="ml-2">{mediumAlerts.length} média</Badge>
                )}
              </div>
              <ChevronDown className="size-5 text-slate-400 transition-transform" style={{ transform: expandedSections.alerts ? 'rotate(180deg)' : 'rotate(0deg)' }} />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4 space-y-3">
              {alerts.length === 0 ? (
                <NoAlertsCard />
              ) : (
                <>
                  {highAlerts.length > 0 && (
                    <div className="space-y-3">
                      <h5 className="text-xs font-semibold uppercase tracking-wide text-red-600">Alta prioridade</h5>
                      {highAlerts.map((alert, i) => <AlertCard key={alert.id} alert={alert} index={i} />)}
                    </div>
                  )}
                  {mediumAlerts.length > 0 && (
                    <div className="space-y-3">
                      <h5 className="text-xs font-semibold uppercase tracking-wide text-amber-600">Prioridade média</h5>
                      {mediumAlerts.map((alert, i) => <AlertCard key={alert.id} alert={alert} index={i} />)}
                    </div>
                  )}
                  {lowAlerts.length > 0 && (
                    <div className="space-y-3">
                      <h5 className="text-xs font-semibold uppercase tracking-wide text-blue-600">Baixa prioridade</h5>
                      {lowAlerts.map((alert, i) => <AlertCard key={alert.id} alert={alert} index={i} />)}
                    </div>
                  )}
                  {infoAlerts.length > 0 && (
                    <div className="space-y-3">
                      <h5 className="text-xs font-semibold uppercase tracking-wide text-slate-600">Informativo</h5>
                      {infoAlerts.map((alert, i) => <AlertCard key={alert.id} alert={alert} index={i} />)}
                    </div>
                  )}
                </>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Pendências */}
          <Collapsible open={expandedSections.pendings} onOpenChange={() => toggleSection('pendings')}>
            <CollapsibleTrigger className="flex w-full items-center justify-between p-4 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-3">
                <Clock className="size-5 text-amber-600" />
                <span className="font-semibold text-slate-800">Pendências para a consulta ({pendings.length})</span>
              </div>
              <ChevronDown className="size-5 text-slate-400 transition-transform" style={{ transform: expandedSections.pendings ? 'rotate(180deg)' : 'rotate(0deg)' }} />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4 space-y-3">
              {pendings.length === 0 ? (
                <Card className="border-slate-200 bg-slate-50">
                  <CardContent className="p-4 text-center text-sm text-slate-500">
                    Nenhuma pendência identificada. Todas as perguntas obrigatórias foram respondidas.
                  </CardContent>
                </Card>
              ) : (
                pendings.map((pending, i) => <PendingCard key={pending.id} pending={pending} index={i} />)
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Escalas */}
          <Collapsible open={expandedSections.scales} onOpenChange={() => toggleSection('scales')}>
            <CollapsibleTrigger className="flex w-full items-center justify-between p-4 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-3">
                <FileText className="size-5 text-[#2f8f82]" />
                <span className="font-semibold text-slate-800">Escalas informadas ({scales.length})</span>
              </div>
              <ChevronDown className="size-5 text-slate-400 transition-transform" style={{ transform: expandedSections.scales ? 'rotate(180deg)' : 'rotate(0deg)' }} />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4 space-y-4">
              {scales.length === 0 ? (
                <Card className="border-slate-200 bg-slate-50">
                  <CardContent className="p-4 text-center text-sm text-slate-500">
                    Nenhuma escala informada na anamnese.
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {scales.map((scale, i) => (
                    <Card key={i} className="border-slate-200">
                      <CardContent className="p-4">
                        <ScaleBar {...scale} />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <p className="text-xs text-slate-600">
                  <strong>Nota:</strong> Os valores acima foram informados pelo paciente. Não existem limiares automáticos de corte nesta versão.
                  A relevância clínica de cada valor deve ser avaliada pelo profissional durante a consulta.
                </p>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Conclusão */}
          <Card className="border-l-4 border-[#2f8f82] bg-[#f1faf8]">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-sm">
                <FileText className="size-4 text-[#2f8f82]" />
                <span className="font-medium text-slate-700">Conclusão de apoio profissional</span>
              </div>
              <p className="mt-2 text-sm text-slate-600">{conclusion}</p>
            </CardContent>
          </Card>

          {/* Disclaimer */}
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="size-4 mt-0.5 text-amber-600 shrink-0" />
                <div className="text-xs text-amber-900">
                  <p className="font-medium">Aviso legal</p>
                  <p className="mt-1">{disclaimer}</p>
                  <p className="mt-2">Motor de análise: v{version} · Gerado em {formatDate(generatedAt)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </TooltipProvider>
  )
}