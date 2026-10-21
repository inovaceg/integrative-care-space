import { useState } from 'react'
import { Pencil, Save, Trash2, X } from 'lucide-react'
import { useAuth } from '@/components/auth/auth-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { anamneseFields } from '@/lib/admin/anamnese-display'
import { invalidateAnamneseLink, type AnamneseAnswers, type AnamneseRecord } from '@/lib/admin/anamnese'
import { supabase } from '@/integrations/supabase/client'

const fieldLabels = new Map(anamneseFields.flatMap(([, fields]) => fields))

export function AnamneseActions({
  record,
  patientId,
  onDeleted,
  onUpdated,
}: {
  record: AnamneseRecord
  patientId: string
  onDeleted: () => void
  onUpdated: (record: AnamneseRecord) => void
}) {
  const { user } = useAuth()
  const [editing, setEditing] = useState(false)
  const [answers, setAnswers] = useState<AnamneseAnswers>(record.respostas ?? {})
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  function startEditing() {
    setAnswers(record.respostas ?? {})
    setMessage('')
    setEditing(true)
  }

  function updateAnswer(key: string, value: string | number | boolean | string[]) {
    setAnswers((current) => ({ ...current, [key]: value }))
  }

  function clearAnswer(key: string) {
    setAnswers((current) => {
      const next = { ...current }
      delete next[key]
      return next
    })
  }

  async function save() {
    if (!user) return
    setBusy(true)
    setMessage('')
    const { data, error } = await supabase
      .from('anamneses')
      .update({ respostas: answers, updated_at: new Date().toISOString() })
      .eq('id', record.id)
      .eq('paciente_id', patientId)
      .eq('profissional_id', user.id)
      .select('id')
      .maybeSingle()

    if (error || !data) {
      setMessage(error?.message ?? 'Não foi possível salvar as alterações da anamnese.')
      setBusy(false)
      return
    }

    const updatedRecord = { ...record, respostas: answers, updated_at: new Date().toISOString() }
    onUpdated(updatedRecord)
    setEditing(false)
    setMessage('Anamnese atualizada.')
    setBusy(false)
  }

  async function remove() {
    if (!user || !window.confirm('Excluir permanentemente esta anamnese? Esta ação não pode ser desfeita.')) return
    setBusy(true)
    setMessage('')
    try {
      await invalidateAnamneseLink(patientId)
      const { data, error } = await supabase
        .from('anamneses')
        .delete()
        .eq('id', record.id)
        .eq('paciente_id', patientId)
        .eq('profissional_id', user.id)
        .select('id')
        .maybeSingle()

      if (error || !data) {
        setMessage(error?.message ?? 'Não foi possível excluir a anamnese.')
        setBusy(false)
        return
      }

      setBusy(false)
      onDeleted()
    } catch (failure) {
      setMessage(failure instanceof Error ? failure.message : 'Não foi possível excluir a anamnese.')
      setBusy(false)
    }
  }

  return <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
    <div className="flex flex-wrap gap-2">
      {!editing ? <>
        <Button type="button" variant="outline" onClick={startEditing} disabled={busy}><Pencil className="mr-2 size-4" />Editar anamnese</Button>
        <Button type="button" variant="outline" onClick={() => void remove()} disabled={busy} className="border-red-200 text-red-600 hover:bg-red-50"><Trash2 className="mr-2 size-4" />Excluir anamnese</Button>
      </> : <>
        <Button type="button" onClick={() => void save()} disabled={busy}><Save className="mr-2 size-4" />{busy ? 'Salvando...' : 'Salvar alterações'}</Button>
        <Button type="button" variant="outline" onClick={() => { setEditing(false); setMessage('') }} disabled={busy}><X className="mr-2 size-4" />Cancelar</Button>
      </>}
    </div>
    {editing && <div className="space-y-5">
      {anamneseFields.map(([section, fields]) => {
        const currentFields = fields.filter(([key]) => Object.hasOwn(answers, key))
        if (!currentFields.length) return null
        return <div key={section} className="space-y-3">
          <h3 className="font-display font-semibold text-slate-800">{section}</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {currentFields.map(([key, label]) => {
              const value = answers[key]
              return <label key={key} className="grid gap-1.5 text-sm font-medium text-slate-700">
                {label}
                {typeof value === 'boolean' ? <Select value={String(value)} onValueChange={(next) => updateAnswer(key, next === 'true')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="true">Sim</SelectItem><SelectItem value="false">Não</SelectItem></SelectContent>
                </Select> : Array.isArray(value) ? <Textarea rows={3} value={value.join('\n')} onChange={(event) => updateAnswer(key, event.target.value.split('\n').filter(Boolean))} /> : typeof value === 'number' ? <Input type="number" value={value} onChange={(event) => { if (event.target.value === '') clearAnswer(key); else updateAnswer(key, Number(event.target.value)) }} /> : <Textarea rows={3} value={String(value ?? '')} onChange={(event) => updateAnswer(key, event.target.value)} />}
              </label>
            })}
          </div>
        </div>
      })}
      {Object.entries(answers).some(([key]) => !fieldLabels.has(key)) && <div className="space-y-3">
        <h3 className="font-display font-semibold text-slate-800">Outras respostas</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {Object.entries(answers).filter(([key]) => !fieldLabels.has(key)).map(([key, value]) => <label key={key} className="grid gap-1.5 text-sm font-medium text-slate-700">
            {key.replaceAll('_', ' ')}
            <Textarea rows={3} value={Array.isArray(value) ? value.join('\n') : String(value)} onChange={(event) => updateAnswer(key, Array.isArray(value) ? event.target.value.split('\n').filter(Boolean) : event.target.value)} />
          </label>)}
        </div>
      </div>}
    </div>}
    {message && <p role="status" className="text-sm text-slate-600">{message}</p>}
  </section>
}
