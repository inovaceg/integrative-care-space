import { useAuth } from '@/components/auth/auth-provider'
import { supabase } from '@/integrations/supabase/client'
import { useEffect, useMemo, useState } from 'react'
import { Calendar, Loader2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Link } from '@tanstack/react-router'
import { PatientAvatar } from '../admin-ui'

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'P'
}

interface BirthdayPatient {
  id: string
  nome: string
  data_nascimento: string | null
  avatar_url?: string | null
}

function getAge(birthDate: string): number {
  const today = new Date()
  const birth = new Date(birthDate)
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  return age
}

function getNextBirthday(birthDate: string): { month: number, day: number, isToday: boolean } {
  const today = new Date()
  const birth = new Date(birthDate)
  const nextBirthday = new Date(today.getFullYear(), birth.getMonth(), birth.getDate())
  if (nextBirthday < today) {
    nextBirthday.setFullYear(today.getFullYear() + 1)
  }
  const isToday = nextBirthday.toDateString() === today.toDateString()
  return { month: nextBirthday.getMonth() + 1, day: nextBirthday.getDate(), isToday }
}

export function DashboardBirthdays() {
  const { user } = useAuth()
  const [patients, setPatients] = useState<BirthdayPatient[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) return
    let mounted = true
    setLoading(true)
    setError('')
    supabase
      .from('pacientes')
      .select('id, nome, data_nascimento, avatar_url')
      .eq('profissional_id', user.id)
      .order('data_nascimento')
      .then(({ data, error }) => {
        if (!mounted) return
        if (error) setError(error.message)
        else setPatients((data ?? []).filter(p => p.data_nascimento))
        setLoading(false)
      })
    return () => { mounted = false }
  }, [user])

  const today = useMemo(() => new Date(), [])
  const currentMonth = today.getMonth() + 1
  const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1
  const nextYear = currentMonth === 12 ? today.getFullYear() + 1 : today.getFullYear()

  const currentMonthBirthdays = useMemo(() => {
    return patients
      .map(p => {
        const next = getNextBirthday(p.data_nascimento!)
        return { ...p, nextBirthday: next, age: getAge(p.data_nascimento!) }
      })
      .filter(p => p.nextBirthday.month === currentMonth)
      .sort((a, b) => a.nextBirthday.day - b.nextBirthday.day)
  }, [patients, currentMonth])

  const nextMonthBirthdays = useMemo(() => {
    return patients
      .map(p => {
        const next = getNextBirthday(p.data_nascimento!)
        return { ...p, nextBirthday: next, age: getAge(p.data_nascimento!) }
      })
      .filter(p => p.nextBirthday.month === nextMonth)
      .sort((a, b) => a.nextBirthday.day - b.nextBirthday.day)
  }, [patients, nextMonth])

  const hasData = currentMonthBirthdays.length > 0 || nextMonthBirthdays.length > 0

  if (loading) {
    return (
      <Card className="border border-slate-200 bg-white shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="mr-2 size-4 animate-spin" /> Carregando aniversariantes...
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border border-red-200 bg-red-50 shadow-sm">
        <CardContent className="p-6">
          <p className="text-sm text-red-700">Erro ao carregar aniversariantes: {error}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border border-slate-200 bg-white shadow-sm">
      <CardContent className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="size-5 text-[#2f8f82]" />
            <h2 className="font-display text-lg font-semibold text-slate-800">Aniversariantes</h2>
          </div>
          <Button asChild variant="ghost" size="sm" className="text-[#2f8f82]">
            <Link to="/admin/relatorios">Ver relatório completo</Link>
          </Button>
        </div>

        {!hasData ? (
          <p className="py-6 text-center text-sm text-slate-500">Nenhum aniversariante neste mês ou no próximo.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {currentMonthBirthdays.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-medium text-slate-700">
                  {today.getDate() === 1 && today.getMonth() === 0 ? 'Aniversariantes de hoje' : `Aniversariantes de ${today.toLocaleDateString('pt-BR', { month: 'long' })}`}
                </h3>
                <div className="space-y-2">
                  {currentMonthBirthdays.map(patient => (
                                      <div key={patient.id} className="flex items-center gap-3 rounded-lg p-3 hover:bg-slate-50">
                                        <PatientAvatar initials={initials(patient.nome)} />
                                        <div className="min-w-0 flex-1">
                                          <p className="truncate text-sm font-medium text-slate-800">{patient.nome}</p>
                                          <p className="text-xs text-slate-500">
                                            Faz {patient.age} anos • {patient.nextBirthday.isToday ? 'Aniversário hoje' : `Próximo aniversário: ${patient.nextBirthday.day}/${patient.nextBirthday.month}`}
                                          </p>
                                        </div>
                                      </div>
                                    ))}
                </div>
              </div>
            )}
            {nextMonthBirthdays.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-medium text-slate-700">
                  Próximo mês ({nextMonth === 12 ? 'dezembro' : ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'][nextMonth - 1]})
                </h3>
                <div className="space-y-2">
                  {nextMonthBirthdays.map(patient => (
                                      <div key={patient.id} className="flex items-center gap-3 rounded-lg p-3 hover:bg-slate-50">
                                        <PatientAvatar initials={initials(patient.nome)} />
                                        <div className="min-w-0 flex-1">
                                          <p className="truncate text-sm font-medium text-slate-800">{patient.nome}</p>
                                          <p className="text-xs text-slate-500">Faz {patient.age} anos • Próximo aniversário: {patient.nextBirthday.day}/{patient.nextBirthday.month}</p>
                                        </div>
                                      </div>
                                    ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}