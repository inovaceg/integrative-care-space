import { createFileRoute, Link, useNavigate, useParams } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { ArrowLeft, Download, Loader2 } from 'lucide-react'
import { useAuth } from '@/components/auth/auth-provider'
import { AdminLayout, PageIntro } from '@/components/admin/admin-ui'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { displayAnswer, getAnamneseSections, getAnamneseConsents } from '@/lib/admin/anamnese-display'
import { analyzeAnamnese } from '@/lib/admin/anamnese-analysis'
import { buildAnamnesePdf } from '@/lib/admin/anamnese-pdf'
import { AnamneseReport } from '@/components/admin/anamnese-report'
import { fetchCompletedAnamnese, type AnamneseRecord } from '@/lib/admin/anamnese'
import { downloadDocumentPdf } from '@/lib/admin/document-layout'
import { AnamneseActions } from '@/components/admin/patients/anamnese-actions'

export const Route = createFileRoute('/admin/pacientes/$id/anamnese')({ component: CompletedAnamnesePage })

function CompletedAnamnesePage() {
  const { id } = useParams({ from: '/admin/pacientes/$id/anamnese' })
  const navigate = useNavigate()
  const { user, isLoading: authLoading } = useAuth()
  const [patient, setPatient] = useState<{ nome: string } | null>(null)
  const [record, setRecord] = useState<AnamneseRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [pdfError, setPdfError] = useState('')

  useEffect(() => {
    if (!user || authLoading) return
    fetchCompletedAnamnese(id, user.id)
      .then(({ patient: p, anamnese }) => { setPatient(p); setRecord(anamnese) })
      .catch((failure) => setError(failure instanceof Error ? failure.message : 'Não foi possível carregar a anamnese.'))
      .finally(() => setLoading(false))
  }, [authLoading, id, user?.id])

  if (authLoading || loading) return <AdminLayout><div className="flex items-center justify-center p-12 text-sm text-slate-500"><Loader2 className="mr-2 size-4 animate-spin" />Carregando anamnese...</div></AdminLayout>
  if (error) return <AdminLayout><p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p></AdminLayout>
  if (!patient || !record) return <AdminLayout><div className="space-y-4"><Link to="/admin/pacientes" className="inline-flex items-center gap-2 text-sm text-slate-500"><ArrowLeft className="size-4" />Voltar para pacientes</Link><p className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-500">Nenhuma anamnese concluída encontrada para este paciente.</p></div></AdminLayout>

  const sections = [...getAnamneseSections(record.respostas ?? {}), ['Consentimentos e assinatura', getAnamneseConsents(record)] as [string, Array<[string, unknown]>]]
  const analysisResult = analyzeAnamnese(record.respostas ?? {}, {
    patientName: patient.nome,
    completedAt: record.preenchido_em ?? undefined,
    demoMode: false,
  })

  async function generatePdf() {
    if (!record.preenchido_em) return
    setPdfError('')
    const safeName = patient.nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase()
    try {
      await downloadDocumentPdf(
        buildAnamnesePdf(patient.nome, record.preenchido_em, sections, analysisResult, record.respostas ?? {}),
        `ficha-anamnese-${safeName}`,
        false,
        true,
      )
    } catch (failure) {
      setPdfError(failure instanceof Error ? failure.message : 'Não foi possível gerar o PDF.')
    }
  }

  return <AdminLayout>
    <div className="space-y-6">
      <Link to="/admin/pacientes/$id" params={{ id }} className="inline-flex items-center gap-2 text-sm text-slate-500"><ArrowLeft className="size-4" />Voltar ao perfil</Link>
      <PageIntro eyebrow="Anamnese concluída" title={patient.nome} description={`Preenchida em ${new Date(record.preenchido_em!).toLocaleString('pt-BR')}`} action={<Button type="button" variant="outline" onClick={() => void generatePdf()}><Download className="mr-2 size-4" />Gerar PDF da ficha e análise</Button>} />
      {pdfError && <p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{pdfError}</p>}
      <AnamneseActions
        record={record}
        patientId={id}
        onUpdated={setRecord}
        onDeleted={() => void navigate({ to: '/admin/pacientes/$id', params: { id }, replace: true })}
      />
      {sections.map(([title, items]) => <Card key={title}>
        <CardContent className="p-5">
          <h2 className="font-display text-lg font-semibold text-slate-800">{title}</h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            {items.map(([label, value]) => <div key={label} className="min-w-0">
              <dt className="text-xs font-medium text-slate-400">{label}</dt>
              <dd className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">{displayAnswer(value)}</dd>
            </div>)}
          </dl>
        </CardContent>
      </Card>)}
      <AnamneseReport result={analysisResult} onPrint={() => void generatePdf()} onIncludeInPdf={() => void generatePdf()} />
    </div>
  </AdminLayout>
}
