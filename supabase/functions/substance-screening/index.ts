import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const functionName = 'substance-screening'
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const consentVersion = 'triagem-substancias-1.0'
const urgentKeys = new Set(['overdose', 'intoxication', 'breathing', 'unconscious', 'seizure', 'withdrawal', 'suicide', 'violence'])

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: corsHeaders })
}

function cleanText(value: unknown, max = 200) {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

function ageOnDate(birthDate: string) {
  const [year, month, day] = birthDate.split('-').map(Number)
  const today = new Date()
  return today.getFullYear() - year - (today.getMonth() + 1 < month || (today.getMonth() + 1 === month && today.getDate() < day) ? 1 : 0)
}

function ageGroup(age: number) {
  return age < 12 ? 'child' : age < 18 ? 'adolescent' : 'adult'
}

function cleanAnswers(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Respostas inválidas.')
  const entries = Object.entries(value as Record<string, unknown>)
  if (entries.length > 100) throw new Error('Há respostas demais.')
  const answers: Record<string, unknown> = {}
  for (const [key, answer] of entries) {
    if (!/^[a-z0-9_]{1,60}$/.test(key)) continue
    if (key === 'safety' && answer && typeof answer === 'object' && !Array.isArray(answer)) {
      answers.safety = Object.fromEntries(Object.entries(answer as Record<string, unknown>).filter(([safetyKey, active]) => urgentKeys.has(safetyKey) && typeof active === 'boolean'))
    } else if (typeof answer === 'string') {
      if (answer.length > 3000) throw new Error('Uma resposta excede o limite permitido.')
      answers[key] = answer.trim()
    } else if (typeof answer === 'boolean') answers[key] = answer
    else if (Array.isArray(answer)) answers[key] = answer.filter((item): item is string => typeof item === 'string').slice(0, 20).map((item) => item.slice(0, 100))
  }
  return answers
}

function hasUrgentSignal(answers: Record<string, unknown>) {
  const safety = answers.safety
  if (!safety || typeof safety !== 'object' || Array.isArray(safety)) return false
  return Object.values(safety as Record<string, unknown>).some((value) => value === true)
}

async function hashToken(token: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Método não permitido.' }, 405)
  try {
    const raw = await req.text()
    if (raw.length > 200_000) return json({ error: 'Solicitação muito grande.' }, 413)
    const body = JSON.parse(raw)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const admin = createClient(supabaseUrl, serviceKey)

    if (body.action === 'create') {
      const token = cleanText(body.token, 100)
      if (!/^[0-9a-f-]{36}$/i.test(token)) return json({ error: 'Chave de retomada inválida.' }, 400)
      const { data: staff, error: staffError } = await admin.from('user_roles').select('user_id').eq('role', 'doctor')
      if (staffError || staff?.length !== 1) return json({ error: 'Não foi possível iniciar a triagem neste momento.' }, 503)
      const professionalId = staff[0].user_id
      const tokenHash = await hashToken(token)
      const { data, error } = await admin.from('substance_screenings').insert({ professional_id: professionalId, access_token_hash: tokenHash, status: 'draft' }).select('id,status,answers,patient_name,birth_date,age_group,updated_at').single()
      if (error) throw error
      await admin.from('substance_screening_audit').insert({ screening_id: data.id, professional_id: professionalId, action: 'draft_created', details: { modality: 'online' } })
      return json({ screening: data })
    }

    const token = cleanText(body.token, 100)
    if (!/^[0-9a-f-]{36}$/i.test(token)) return json({ error: 'Chave de retomada inválida.' }, 400)
    const tokenHash = await hashToken(token)
    const { data: existing, error: lookupError } = await admin.from('substance_screenings').select('id,professional_id,status,answers,patient_name,contact_whatsapp,birth_date,age_group,urgent_alert,consent_version,consented_at,updated_at').eq('access_token_hash', tokenHash).maybeSingle()
    if (lookupError || !existing) return json({ error: 'Não foi possível localizar esta triagem neste dispositivo.' }, 404)

    if (body.action === 'resume') return json({ screening: existing })
    if (body.action !== 'save' && body.action !== 'submit') return json({ error: 'Ação inválida.' }, 400)
    if (existing.status !== 'draft') return json({ error: 'Esta triagem já foi enviada e não pode ser alterada.' }, 409)

    const name = cleanText(body.patient_name, 120)
    const contactWhatsapp = cleanText(body.contact_whatsapp, 30)
    const birthDate = cleanText(body.birth_date, 10)
    const parsed = new Date(`${birthDate}T00:00:00.000Z`)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate) || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== birthDate || birthDate > new Date().toISOString().slice(0, 10)) return json({ error: 'Informe uma data de nascimento válida.' }, 400)
    const answers = cleanAnswers(body.answers)
    const group = ageGroup(ageOnDate(birthDate))
    if (body.age_group && body.age_group !== group) return json({ error: 'O fluxo de atendimento não corresponde à data de nascimento.' }, 400)
    const urgent = hasUrgentSignal(answers)
    const submitting = body.action === 'submit'
    if (body.consent !== true) return json({ error: 'A triagem precisa de consentimento antes de salvar as respostas.' }, 400)
    if (submitting && group === 'child' && !cleanText(answers.guardian_name, 120)) return json({ error: 'Informe o nome do responsável para continuar.' }, 400)

    const update = {
      patient_name: name,
      contact_whatsapp: contactWhatsapp,
      birth_date: birthDate,
      age_group: group,
      answers,
      urgent_alert: urgent,
      status: submitting ? 'pending' : 'draft',
      consent_version: body.consent === true ? consentVersion : existing.consent_version,
      consented_at: body.consent === true ? existing.consented_at ?? new Date().toISOString() : existing.consented_at,
      submitted_at: submitting ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    }
    const { data, error } = await admin.from('substance_screenings').update(update).eq('id', existing.id).eq('status', 'draft').select('id,status,patient_name,birth_date,age_group,urgent_alert,updated_at').single()
    if (error) throw error
    await admin.from('substance_screening_audit').insert({ screening_id: existing.id, professional_id: existing.professional_id, action: urgent ? 'urgent_alert' : submitting ? 'submitted' : 'draft_saved', details: { age_group: group, urgent } })
    return json({ screening: data, urgent })
  } catch (error) {
    console.error(`[${functionName}] request failed`, { error: error instanceof Error ? error.message : String(error) })
    return json({ error: 'Não foi possível salvar a triagem agora. Revise os dados e tente novamente.' }, 400)
  }
})
