import { useAuth } from '@/components/auth/auth-provider'
import { supabase } from '@/integrations/supabase/client'
import { useEffect, useMemo, useState } from 'react'
import { Calendar, Copy, Loader2, MessageCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Link } from '@tanstack/react-router'
import { PatientAvatar } from '../admin-ui'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'P'
}

interface BirthdayPatient {
  id: string
  nome: string
  data_nascimento: string | null
  telefone: string | null
  avatar_url?: string | null
}

type ListedBirthdayPatient = BirthdayPatient & { nextBirthday: { month: number; day: number; isToday: boolean }; age: number }
type MessageTemplate = 'warm' | 'short' | 'professional' | 'celebratory' | 'gentle' | 'gratitude'

function localDate(dateString: string): Date {
  const [year, month, day] = dateString.slice(0, 10).split('-').map(Number)
  return new Date(year, month - 1, day)
}

function getAge(birthDate: string): number {
  const today = new Date()
  const birth = localDate(birthDate)
  let age = today.getFullYear() - birth.getFullYear()
  if (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) age--
  return age
}

function getNextBirthday(birthDate: string): { month: number; day: number; isToday: boolean } {
  const today = new Date()
  const birth = localDate(birthDate)
  const nextBirthday = new Date(today.getFullYear(), birth.getMonth(), birth.getDate())
  if (nextBirthday < new Date(today.getFullYear(), today.getMonth(), today.getDate())) nextBirthday.setFullYear(today.getFullYear() + 1)
  return { month: nextBirthday.getMonth() + 1, day: nextBirthday.getDate(), isToday: nextBirthday.toDateString() === today.toDateString() }
}

function normalizeWhatsAppPhone(phone: string | null): string | null {
  if (!phone) return null
  const digits = phone.replace(/\D/g, '')
  const international = digits.startsWith('55') ? digits : digits.length === 10 || digits.length === 11 ? `55${digits}` : digits
  return international.length >= 12 && international.length <= 15 ? international : null
}

function birthdayMessage(patient: ListedBirthdayPatient, template: MessageTemplate): string {
  const firstName = patient.nome.trim().split(/\s+/)[0] || patient.nome
  const messages: Record<MessageTemplate, string> = {
    warm: `Olá, ${firstName}! Hoje é um dia especial: feliz aniversário! Desejo que seu novo ciclo seja repleto de saúde, alegrias e bons momentos. Espero que aproveite muito o seu dia. Um abraço, Dr. Frederick.`,
    short: `Olá, ${firstName}! Feliz aniversário! Desejo a você um dia muito especial e um novo ciclo cheio de saúde e alegrias. — Dr. Frederick`,
    professional: `Olá, ${firstName}. Parabéns pelo seu aniversário! Desejo um excelente novo ciclo, com saúde, realizações e muitos momentos felizes. Atenciosamente, Dr. Frederick.`,
    celebratory: `Feliz aniversário, ${firstName}! Que hoje não faltem motivos para sorrir e celebrar. Muitas felicidades e um novo ano de vida maravilhoso para você! — Dr. Frederick`,
    gentle: `Olá, ${firstName}! Passando para desejar um feliz aniversário e um dia tranquilo, feliz e cheio de carinho. Que seu novo ciclo traga muitas coisas boas. Um abraço, Dr. Frederick.`,
    gratitude: `Parabéns pelo seu dia, ${firstName}! Que este novo ciclo venha cheio de saúde, alegrias e boas surpresas. Obrigado pela confiança. Feliz aniversário! — Dr. Frederick`,
  }
  return messages[template]
}

function formatBirthday(dateString: string): string {
  return localDate(dateString).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
}

export function DashboardBirthdays() {
  const { user } = useAuth()
  const [patients, setPatients] = useState<BirthdayPatient[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedPatient, setSelectedPatient] = useState<ListedBirthdayPatient | null>(null)
  const [template, setTemplate] = useState<MessageTemplate>('warm')
  const [message, setMessage] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!user) return
    let mounted = true
    setLoading(true)
    setError('')
    supabase
      .from('pacientes')
      .select('id, nome, data_nascimento, telefone, avatar_url')
      .eq('profissional_id', user.id)
      .order('data_nascimento')
      .then(({ data, error }) => {
        if (!mounted) return
        if (error) setError(error.message)
        else setPatients((data ?? []).filter((patient) => patient.data_nascimento))
        setLoading(false)
      })
    return () => { mounted = false }
  }, [user])

  const today = useMemo(() => new Date(), [])
  const currentMonth = today.getMonth() + 1
  const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1

  const listedPatients = useMemo(() => patients.map((patient) => {
    const nextBirthday = getNextBirthday(patient.data_nascimento!)
    return { ...patient, nextBirthday, age: getAge(patient.data_nascimento!) }
  }), [patients])
  const currentMonthBirthdays = useMemo(() => listedPatients.filter((patient) => patient.nextBirthday.month === currentMonth).sort((a, b) => a.nextBirthday.day - b.nextBirthday.day), [currentMonth, listedPatients])
  const nextMonthBirthdays = useMemo(() => listedPatients.filter((patient) => patient.nextBirthday.month === nextMonth).sort((a, b) => a.nextBirthday.day - b.nextBirthday.day), [listedPatients, nextMonth])
  const hasData = currentMonthBirthdays.length > 0 || nextMonthBirthdays.length > 0
  const normalizedPhone = normalizeWhatsAppPhone(selectedPatient?.telefone ?? null)
  const whatsappUrl = normalizedPhone ? `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}` : null

  function openPatient(patient: ListedBirthdayPatient) {
    setSelectedPatient(patient)
    setTemplate('warm')
    setMessage(birthdayMessage(patient, 'warm'))
    setCopied(false)
  }

  function chooseTemplate(value: MessageTemplate) {
    setTemplate(value)
    if (selectedPatient) setMessage(birthdayMessage(selectedPatient, value))
    setCopied(false)
  }

  async function copyMessage() {
    await navigator.clipboard.writeText(message)
    setCopied(true)
  }

  if (loading) {
    return <Card className="border border-slate-200 bg-white shadow-sm"><CardContent className="p-6"><div className="flex items-center justify-center py-8"><Loader2 className="mr-2 size-4 animate-spin" /> Carregando aniversariantes...</div></CardContent></Card>
  }

  if (error) {
    return <Card className="border border-red-200 bg-red-50 shadow-sm"><CardContent className="p-6"><p className="text-sm text-red-700">Erro ao carregar aniversariantes: {error}</p></CardContent></Card>
  }

  return <>
    <Card className="border border-slate-200 bg-white shadow-sm">
      <CardContent className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2"><Calendar className="size-5 text-[#2f8f82]" /><h2 className="font-display text-lg font-semibold text-slate-800">Aniversariantes</h2></div>
          <Button asChild variant="ghost" size="sm" className="text-[#2f8f82]"><Link to="/admin/pacientes">Ver relatório completo</Link></Button>
        </div>
        {!hasData ? <p className="py-6 text-center text-sm text-slate-500">Nenhum aniversariante neste mês ou no próximo.</p> : <div className="grid gap-4 md:grid-cols-2">
          {currentMonthBirthdays.length > 0 && <div><h3 className="mb-2 text-sm font-medium text-slate-700">Aniversariantes de {today.toLocaleDateString('pt-BR', { month: 'long' })}</h3><div className="space-y-2">{currentMonthBirthdays.map((patient) => <button key={patient.id} type="button" onClick={() => openPatient(patient)} className="flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f8f82]"><PatientAvatar initials={initials(patient.nome)} /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-slate-800">{patient.nome}</span><span className="block text-xs text-slate-500">Faz {patient.age} anos · {patient.nextBirthday.isToday ? 'Aniversário hoje' : `Próximo aniversário: ${patient.nextBirthday.day}/${patient.nextBirthday.month}`}</span></span></button>)}</div></div>}
          {nextMonthBirthdays.length > 0 && <div><h3 className="mb-2 text-sm font-medium text-slate-700">Próximo mês ({new Date(today.getFullYear(), nextMonth - 1, 1).toLocaleDateString('pt-BR', { month: 'long' })})</h3><div className="space-y-2">{nextMonthBirthdays.map((patient) => <button key={patient.id} type="button" onClick={() => openPatient(patient)} className="flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f8f82]"><PatientAvatar initials={initials(patient.nome)} /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-slate-800">{patient.nome}</span><span className="block text-xs text-slate-500">Faz {patient.age} anos · Próximo aniversário: {patient.nextBirthday.day}/{patient.nextBirthday.month}</span></span></button>)}</div></div>}
        </div>}
      </CardContent>
    </Card>
    <Dialog open={Boolean(selectedPatient)} onOpenChange={(open) => { if (!open) setSelectedPatient(null) }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        {selectedPatient && <>
          <DialogHeader><DialogTitle className="font-display text-xl text-slate-900">Uma mensagem especial</DialogTitle><DialogDescription>Revise e personalize antes de abrir o WhatsApp.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="rounded-xl bg-[#f1f8f6] p-4"><p className="font-semibold text-slate-900">{selectedPatient.nome}</p><p className="mt-1 text-sm text-slate-600">Aniversário: {formatBirthday(selectedPatient.data_nascimento!)}</p><p className="text-sm text-slate-600">Telefone: {selectedPatient.telefone || 'Não cadastrado'}</p></div>
            {!selectedPatient.nextBirthday.isToday && <div role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">A data de aniversário não é hoje. Confira a data antes de enviar para evitar uma mensagem antecipada.</div>}
            <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-600">Antes de contatar, confirme que a paciente aceita receber mensagens e não se opôs a esse tipo de contato. A preferência de comunicação não está registrada nos dados disponíveis neste módulo.</p>
            <div className="grid gap-2"><Label htmlFor="birthday-message-template">Modelo da mensagem</Label><Select value={template} onValueChange={(value) => chooseTemplate(value as MessageTemplate)}><SelectTrigger id="birthday-message-template"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="warm">Acolhedor</SelectItem><SelectItem value="short">Curto</SelectItem><SelectItem value="professional">Profissional</SelectItem><SelectItem value="celebratory">Celebrativo</SelectItem><SelectItem value="gentle">Delicado</SelectItem><SelectItem value="gratitude">Com agradecimento</SelectItem></SelectContent></Select></div>
            <div className="grid gap-2"><Label htmlFor="birthday-message">Mensagem (editável)</Label><Textarea id="birthday-message" value={message} onChange={(event) => { setMessage(event.target.value); setCopied(false) }} rows={5} maxLength={1000} /></div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={() => void copyMessage()} disabled={!message.trim()}><Copy className="mr-2 size-4" />{copied ? 'Mensagem copiada' : 'Copiar mensagem'}</Button>
              {whatsappUrl ? <Button asChild className="bg-[#128c7e] text-white hover:bg-[#0f766a]"><a href={whatsappUrl} target="_blank" rel="noopener noreferrer"><MessageCircle className="mr-2 size-4" />Abrir no WhatsApp</a></Button> : <Button type="button" disabled title="Cadastre um telefone válido para abrir o WhatsApp"><MessageCircle className="mr-2 size-4" />Telefone inválido ou ausente</Button>}
            </div>
            <p className="text-xs text-slate-500">O WhatsApp será aberto para revisão e envio manual. Nenhuma mensagem é enviada automaticamente.</p>
          </div>
        </>}
      </DialogContent>
    </Dialog>
  </>
}
