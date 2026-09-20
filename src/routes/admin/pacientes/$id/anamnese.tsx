import { createFileRoute, Link, useParams } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { useAuth } from '@/components/auth/auth-provider'
import { AdminLayout, PageIntro } from '@/components/admin/admin-ui'
import { Card, CardContent } from '@/components/ui/card'
import { fetchCompletedAnamnese, type AnamneseRecord } from '@/lib/admin/anamnese'

export const Route = createFileRoute('/admin/pacientes/$id/anamnese')({ component: CompletedAnamnesePage })

const groups: Array<[string, string[]]> = [
  ['Motivo do atendimento', ['motivo_atendimento', 'modalidade', 'inicio_queixa', 'impacto_vida', 'expectativa_tratamento']],
  ['Histórico de saúde', ['doencas_detalhes', 'cirurgias_detalhes', 'alergias_detalhes', 'medicamentos_detalhes', 'acompanhamento_detalhes', 'exames']],
  ['Hábitos e rotina', ['alimentacao', 'sono', 'atividade_fisica_detalhes', 'substancias_detalhes']],
  ['Saúde emocional', ['sintomas', 'escala_ansiedade', 'escala_tristeza', 'tratamento_anterior_detalhes', 'pensamentos_morte', 'planejamento', 'rede_de_apoio_nome', 'traumas_detalhes']],
  ['Relacionamentos e bem-estar', ['relacionamentos', 'sexualidade_detalhes', 'vida_profissional', 'espiritualidade_detalhes']],
  ['Informações biomédicas', ['objetivo_biomedicina', 'peso', 'altura', 'tratamentos_anteriores', 'anticoagulante', 'gestacao_amamentacao', 'doenca_autoimune', 'observacoes_finais']],
]
const labels: Record<string, string> = Object.fromEntries(groups.flatMap(([, keys]) => keys.map((key) => [key, key.replaceAll('_', ' ')])))
function display(value: unknown) { return Array.isArray(value) ? value.join(', ') : String(value) }

function CompletedAnamnesePage() {
  const { id } = useParams({ from: '/admin/pacientes/$id/anamnese' })
  const { user, isLoading: authLoading } = useAuth()
  const [patient, setPatient] = useState<{ nome: string } | null>(null)
  const [record, setRecord] = useState<AnamneseRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => { if (!user || authLoading) return; fetchCompletedAnamnese(id, user.id).then(({ patient: p, anamnese }) => { setPatient(p); setRecord(anamnese) }).catch((e) => setError(e instanceof Error ? e.message : 'Não foi possível carregar a anamnese.')).finally(() => setLoading(false)) }, [authLoading, id, user?.id])
  if (authLoading || loading) return <AdminLayout><div className="flex items-center justify-center p-12 text-sm text-slate-500"><Loader2 className="mr-2 size-4 animate-spin" />Carregando anamnese...</div></AdminLayout>
  if (error) return <AdminLayout><p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p></AdminLayout>
  if (!patient || !record) return <AdminLayout><div className="space-y-4"><Link to="/admin/pacientes" className="inline-flex items-center gap-2 text-sm text-slate-500"><ArrowLeft className="size-4" />Voltar para pacientes</Link><p className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-500">Nenhuma anamnese concluída encontrada para este paciente.</p></div></AdminLayout>
  const answers = record.respostas ?? {}
  return <AdminLayout><div className="space-y-6"><Link to="/admin/pacientes/$id" params={{ id }} className="inline-flex items-center gap-2 text-sm text-slate-500"><ArrowLeft className="size-4" />Voltar ao perfil</Link><PageIntro eyebrow="Anamnese concluída" title={patient.nome} description={`Preenchida em ${new Date(record.preenchido_em!).toLocaleString('pt-BR')}`} />{groups.map(([title, keys]) => { const entries = keys.filter((key) => answers[key] !== undefined && answers[key] !== null && answers[key] !== '') ; return entries.length ? <Card key={title}><CardContent className="p-5"><h2 className="font-display text-lg font-semibold text-slate-800">{title}</h2><dl className="mt-4 grid gap-4 sm:grid-cols-2">{entries.map((key) => <div key={key}><dt className="text-xs font-medium capitalize text-slate-400">{labels[key]}</dt><dd className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">{display(answers[key])}</dd></div>)}</dl></CardContent></Card> : null })}<Card><CardContent className="p-5"><h2 className="font-display text-lg font-semibold text-slate-800">Consentimentos e assinatura</h2><dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2"><div>Consentimento LGPD: {record.lgpd_consentimento ? 'Aceito' : 'Não registrado'}</div><div>Declaração de veracidade: {record.declaracao_veracidade ? 'Aceita' : 'Não registrada'}</div><div>Ciência sobre urgência: {record.ciencia_urgencia ? 'Aceita' : 'Não registrada'}</div><div>Assinatura: {record.assinatura_eletronica ?? 'Não registrada'}</div><div>Versão do termo: {record.termo_versao ?? '—'}</div></dl></CardContent></Card></div></AdminLayout>
}
