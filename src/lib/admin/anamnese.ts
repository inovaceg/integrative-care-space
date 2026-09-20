import { supabase } from '@/integrations/supabase/client'

export type AnamneseAnswers = Record<string, string | number | boolean | string[]>
export type AnamneseRecord = {
  id: string
  paciente_id: string
  profissional_id: string
  respostas: AnamneseAnswers
  preenchido_em: string | null
  created_at: string
  updated_at: string
  link_gerado_em: string | null
  lgpd_consentimento: boolean
  lgpd_data_consentimento: string | null
  declaracao_veracidade: boolean
  ciencia_urgencia: boolean
  assinatura_eletronica: string | null
  termo_versao: string | null
  autorizacao_foto_prontuario: boolean
  autorizacao_divulgacao_imagem: boolean
  pensamentos_morte_atual: string | null
  planejamento_suicida_bool: boolean
  acesso_meios: boolean
  doencas_fisicas: string | null
  medicamentos_atuais: string | null
}

const url = 'https://fusqpjescampwoyazceu.supabase.co/functions/v1/anamnese'

async function request<T>(body: Record<string, unknown>, authenticated = false): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', apikey: 'sb_publishable_g7UiDq4z1OWmThE52EZNbQ_aKSUfA1x' }
  if (authenticated) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('Sessão expirada. Entre novamente para acessar a anamnese.')
    headers['Authorization'] = `Bearer ${session.access_token}`
  }
  const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload.error ?? 'Não foi possível processar a anamnese.')
  return payload as T
}

export function getAnamneseStatus(patient: { token_anamnese?: string | null; token_expira_em?: string | null }, record: AnamneseRecord | null) {
  if (record?.preenchido_em) return 'Concluída'
  if (!patient.token_anamnese || !patient.token_expira_em) return 'Não enviada'
  if (new Date(patient.token_expira_em) <= new Date()) return 'Expirada'
  return record && Object.keys(record.respostas ?? {}).length ? 'Em preenchimento' : 'Link gerado'
}

export async function fetchAnamneseStatus(patientId: string) {
  return request<{ patient: { nome: string; telefone: string | null; token_anamnese: string | null; token_expira_em: string | null }; anamnese: AnamneseRecord | null }>({ action: 'admin-status', patientId }, true)
}

export async function fetchCompletedAnamnese(patientId: string, professionalId: string) {
  const { data: patient, error: patientError } = await supabase.from('pacientes').select('nome').eq('id', patientId).eq('profissional_id', professionalId).maybeSingle()
  if (patientError) throw patientError
  if (!patient) return { patient: null, anamnese: null }
  const { data, error } = await supabase.from('anamneses').select('*').eq('paciente_id', patientId).eq('profissional_id', professionalId).not('preenchido_em', 'is', null).order('updated_at', { ascending: false }).order('created_at', { ascending: false }).limit(1).maybeSingle()
  if (error) throw error
  return { patient: patient as { nome: string }, anamnese: data as AnamneseRecord | null }
}

export async function generateAnamneseLink(patientId: string) {
  return request<{ token: string; expiresAt: string }>({ action: 'admin-generate', patientId }, true)
}

export async function invalidateAnamneseLink(patientId: string) {
  return request<{ ok: true }>({ action: 'admin-invalidate', patientId }, true)
}

export async function loadPublicAnamnese(token: string) {
  return request<{ firstName: string; expiresAt: string; answers: AnamneseAnswers; savedAt: string | null }>({ action: 'public-load', token })
}

export async function savePublicAnamnese(token: string, answers: AnamneseAnswers) {
  return request<{ savedAt: string }>({ action: 'public-save', token, answers })
}

export async function submitPublicAnamnese(token: string, answers: AnamneseAnswers, consent: { truth: boolean; lgpd: boolean; urgent: boolean; signature: string; clinicalPhoto: boolean; publicPhoto: boolean }) {
  return request<{ completedAt: string }>({ action: 'public-submit', token, answers, consent })
}
