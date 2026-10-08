import { useRef, useState } from 'react'
import { FileText, Loader2, Printer } from 'lucide-react'
import { useAuth } from '@/components/auth/auth-provider'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { supabase } from '@/integrations/supabase/client'
import type { PatientRecord } from '@/lib/admin/records'

type ReportPatient = Pick<PatientRecord, 'id' | 'nome' | 'data_nascimento' | 'telefone' | 'endereco' | 'numero' | 'complemento' | 'bairro' | 'cidade' | 'estado' | 'cidade_estado' | 'cep'>

function address(patient: ReportPatient) {
  const city = [patient.cidade, patient.estado].filter(Boolean).join(' / ') || patient.cidade_estado
  return [patient.endereco, patient.numero, patient.complemento, patient.bairro, city, patient.cep ? `CEP ${patient.cep}` : null].filter(Boolean).join(', ') || 'Não informado'
}

export function PatientReports() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [patients, setPatients] = useState<ReportPatient[] | null>(null)
  const [generatedAt, setGeneratedAt] = useState('')
  const [error, setError] = useState('')
  const reportRef = useRef<HTMLDivElement>(null)
  const requestVersion = useRef(0)

  function changeOpen(next: boolean) {
    requestVersion.current += 1
    setOpen(next)
    setPatients(null)
    setError('')
    setLoading(false)
  }

  async function generate() {
    if (!user || loading) return
    const version = ++requestVersion.current
    setLoading(true)
    setError('')
    setPatients(null)
    try {
      const rows: ReportPatient[] = []
      const pageSize = 500
      for (let offset = 0; ; offset += pageSize) {
        const { data, error: queryError } = await supabase.from('pacientes')
          .select('id, nome, data_nascimento, telefone, endereco, numero, complemento, bairro, cidade, estado, cidade_estado, cep')
          .eq('profissional_id', user.id).order('nome').order('id').range(offset, offset + pageSize - 1)
        if (requestVersion.current !== version) return
        if (queryError) throw queryError
        rows.push(...(data ?? []))
        if (!data || data.length < pageSize) break
      }
      rows.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }) || a.id.localeCompare(b.id))
      setPatients(rows)
      setGeneratedAt(new Date().toLocaleString('pt-BR'))
    } catch {
      if (requestVersion.current === version) setError('Não foi possível gerar o relatório. Tente novamente.')
    } finally {
      if (requestVersion.current === version) setLoading(false)
    }
  }

  function printReport() {
    if (!reportRef.current || !patients?.length) return
    setError('')
    const printWindow = window.open('', '_blank', 'width=1100,height=800')
    if (!printWindow) {
      setError('Permita a abertura de janelas neste navegador para imprimir o relatório.')
      return
    }
    printWindow.opener = null
    printWindow.document.title = 'Cadastro de pacientes'
    printWindow.document.documentElement.lang = 'pt-BR'
    const style = printWindow.document.createElement('style')
    style.textContent = `
      @page { size: A4 landscape; margin: 12mm; }
      body { font-family: Arial, sans-serif; color: #1e293b; padding: 20px; }
      h2 { font-size: 22px; margin: 0 0 8px; }
      p { font-size: 12px; margin: 6px 0; }
      table { width: 100%; border-collapse: collapse; table-layout: fixed; margin-top: 20px; font-size: 11px; }
      th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; vertical-align: top; overflow-wrap: anywhere; }
      th { background: #f1f5f9; }
      th:nth-child(1) { width: 27%; } th:nth-child(2) { width: 13%; } th:nth-child(3) { width: 17%; }
      thead { display: table-header-group; } tr { break-inside: avoid; }
      @media print { body { padding: 0; } }
    `
    printWindow.document.head.appendChild(style)
    printWindow.document.body.appendChild(reportRef.current.cloneNode(true))
    printWindow.focus()
    printWindow.setTimeout(() => { if (!printWindow.closed) printWindow.print() }, 200)
  }

  return <Dialog open={open} onOpenChange={changeOpen}>
    <DialogTrigger asChild><Button variant="outline" className="gap-2"><FileText className="size-4" />Relatórios</Button></DialogTrigger>
    <DialogContent className="max-h-[90vh] max-w-6xl overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Relatórios de pacientes</DialogTitle>
        <DialogDescription>Gere o cadastro de todos os seus pacientes, independentemente da busca na lista.</DialogDescription>
      </DialogHeader>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 p-4">
        <div><h2 className="font-semibold text-slate-800">Cadastro de pacientes</h2><p className="text-sm text-slate-500">Nome, nascimento, telefone e endereço, em ordem alfabética.</p></div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => void generate()} disabled={loading || !user}>{loading && <Loader2 className="mr-2 size-4 animate-spin" />}{loading ? 'Gerando...' : patients ? 'Atualizar relatório' : 'Gerar relatório'}</Button>
          <Button variant="outline" disabled={!patients?.length || loading} onClick={printReport}><Printer className="mr-2 size-4" />Imprimir / Salvar PDF</Button>
        </div>
      </div>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {patients && <>
        <div ref={reportRef} className="space-y-3">
          <h2 className="text-xl font-semibold text-slate-800">Cadastro de pacientes</h2>
          <p className="text-sm text-slate-500">Emitido em {generatedAt} · Total: {patients.length} paciente(s)</p>
          <p className="text-xs text-slate-500">Confidencial — contém dados pessoais. Uso restrito ao atendimento.</p>
          {patients.length ? <div className="overflow-x-auto"><table className="w-full min-w-[750px] border-collapse text-left text-sm">
            <thead><tr className="bg-slate-50">{['Nome do paciente', 'Data de nascimento', 'Telefone', 'Endereço'].map(label => <th key={label} className="border border-slate-200 p-3 font-semibold">{label}</th>)}</tr></thead>
            <tbody>{patients.map(patient => <tr key={patient.id}>
              <td className="border border-slate-200 p-3 align-top">{patient.nome}</td>
              <td className="border border-slate-200 p-3 align-top">{patient.data_nascimento ? patient.data_nascimento.split('-').reverse().join('/') : 'Não informada'}</td>
              <td className="border border-slate-200 p-3 align-top">{patient.telefone || 'Não informado'}</td>
              <td className="border border-slate-200 p-3 align-top">{address(patient)}</td>
            </tr>)}</tbody>
          </table></div> : <p className="py-6 text-center text-sm text-slate-500">Nenhum paciente cadastrado para emitir o relatório.</p>}
        </div>
        {patients.length > 0 && <p className="text-xs text-slate-500">Para baixar o arquivo, clique em “Imprimir / Salvar PDF” e escolha “Salvar como PDF” na janela de impressão.</p>}
      </>}
    </DialogContent>
  </Dialog>
}
