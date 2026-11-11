import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const consentVersion = '1.0-2026-11-11'
type Answers = Record<string, string | number | boolean | string[]>

function text(value: unknown, max = 5000) {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

function validBirthDate(value: unknown) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value && value <= new Date().toISOString().slice(0, 10)
}

function ageAtDate(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  const now = new Date()
  let age = now.getUTCFullYear() - year
  if (now.getUTCMonth() + 1 < month || (now.getUTCMonth() + 1 === month && now.getUTCDate() < day)) age -= 1
  return age
}

function validCpf(value: string) {
  const cpf = value.replace(/\D/g, '')
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false
  const digit = (length: number) => {
    const sum = cpf.slice(0, length).split('').reduce((total, number, index) => total + Number(number) * (length + 1 - index), 0)
    const remainder = (sum * 10) % 11
    return remainder === 10 ? 0 : remainder
  }
  return digit(9) === Number(cpf[9]) && digit(10) === Number(cpf[10])
}

function sanitizeAnswers(input: unknown): Answers {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Respostas inválidas.')
  const source = input as Record<string, unknown>
  if (Object.keys(source).length > 150) throw new Error('Quantidade de respostas inválida.')
  const result: Answers = {}
  const scaleKeys = new Set(['life_impact_scale', 'anxiety_scale', 'stress_scale', 'quality_of_life_scale', 'self_esteem_scale', 'thoughts_intensity'])
  for (const [key, value] of Object.entries(source)) {
    if (!/^[a-z0-9_]{1,80}$/.test(key)) continue
    if (typeof value === 'string') {
      if (value.length > 5000) throw new Error('Resposta muito longa.')
      const answer = text(value)
      if (scaleKeys.has(key) && answer !== '' && !/^(?:[0-9]|10)$/.test(answer)) throw new Error('Valor de escala inválido.')
      result[key] = answer
    } else if (typeof value === 'boolean') result[key] = value
    else if (typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 10) result[key] = value
    else if (Array.isArray(value)) result[key] = value.filter((item): item is string => typeof item === 'string').map(item => text(item, 300)).filter(Boolean).slice(0, 30)
  }
  return result
}

async function hashKey(key: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(key))
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
}

function isRiskReviewRequired(answers: Answers) {
  return answers.suicidal_thoughts_ever === 'Sim'
    || answers.death_thoughts_current === 'Sim'
    || answers.suicide_plan === 'Sim'
    || answers.access_to_means === 'Sim'
    || answers.self_harm_ever === 'Sim'
}

async function authorizedStaff(req: Request, admin: ReturnType<typeof createClient>) {
  const header = req.headers.get('Authorization')
  if (!header?.startsWith('Bearer ')) return false
  const { data: { user }, error } = await admin.auth.getUser(header.slice(7))
  if (error || !user) return false
  const { data: role } = await admin.from('user_roles').select('role').eq('user_id', user.id).maybeSingle()
  return role?.role === 'doctor' || role?.role === 'admin'
}

function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, '\\$&')
}

async function findRecoveryRecord(admin: ReturnType<typeof createClient>, email: string, lookupType: unknown, lookupValue: unknown, includeDetails = true) {
  const type = text(lookupType, 10)
  const value = text(lookupValue, 200).replace(/\s+/g, ' ')
  if (type === 'cpf' && !validCpf(value)) return null
  if (type !== 'cpf' && type !== 'name') return null
  if (type === 'name' && value.length < 3) return null
  let query = admin.from('psychological_anamnesis_submissions')
    .select(includeDetails ? 'id,status,birth_date,patient_name,contact_email,contact_phone,responses,risk_review_required,signed_name,consent_version,consented_at,submitted_at' : 'id')
    .eq('status', 'submitted').ilike('contact_email', escapeLike(email))
  query = type === 'cpf' ? query.eq('responses->>cpf', value.replace(/\D/g, '')) : query.ilike('patient_name', escapeLike(value))
  const { data, error } = await query.order('submitted_at', { ascending: false }).limit(1).maybeSingle()
  if (error) throw error
  return data
}

async function verifiedRecoveryUser(req: Request, admin: ReturnType<typeof createClient>) {
  const header = req.headers.get('Authorization')
  if (!header?.startsWith('Bearer ')) return null
  const { data: { user }, error } = await admin.auth.getUser(header.slice(7))
  if (error || !user?.email || !user.email_confirmed_at) return null
  return { id: user.id, email: user.email.toLowerCase() }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  if (req.method !== 'POST') return Response.json({ error: 'Método não permitido.' }, { status: 405, headers: corsHeaders })
  try {
    const rawBody = await req.text()
    if (rawBody.length > 1000000) return Response.json({ error: 'Solicitação muito grande.' }, { status: 413, headers: corsHeaders })
    const body = JSON.parse(rawBody)
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    if (body.action === 'edit-code-request') {
      const email = text(body.email, 254).toLowerCase()
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        const record = await findRecoveryRecord(admin, email, body.lookupType, body.lookupValue, false)
        if (record) {
          const authClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { auth: { autoRefreshToken: false, persistSession: false } })
          await authClient.auth.signInWithOtp({ email, options: { shouldCreateUser: true } })
        }
      }
      return Response.json({ sent: true, message: 'Se os dados coincidirem com uma ficha, enviaremos um código ao e-mail cadastrado.' }, { headers: corsHeaders })
    }

    if (body.action === 'edit-recover') {
      const user = await verifiedRecoveryUser(req, admin)
      if (!user) return new Response('Unauthorized', { status: 401, headers: corsHeaders })
      const record = await findRecoveryRecord(admin, user.email, body.lookupType, body.lookupValue)
      if (!record) return Response.json({ error: 'Não foi possível localizar uma ficha correspondente a este e-mail verificado.' }, { status: 404, headers: corsHeaders })
      return Response.json({ submission: record }, { headers: corsHeaders })
    }

    if (body.action === 'edit-save') {
      const user = await verifiedRecoveryUser(req, admin)
      if (!user) return new Response('Unauthorized', { status: 401, headers: corsHeaders })
      const id = text(body.id, 64)
      if (!/^[0-9a-f-]{36}$/i.test(id)) return Response.json({ error: 'Ficha inválida.' }, { status: 400, headers: corsHeaders })
      const { data: record, error: recordError } = await admin.from('psychological_anamnesis_submissions')
        .select('id,birth_date,patient_name,contact_email,responses,status').eq('id', id).eq('status', 'submitted').ilike('contact_email', escapeLike(user.email)).maybeSingle()
      if (recordError) throw recordError
      if (!record) return Response.json({ error: 'Ficha não encontrada para este e-mail.' }, { status: 404, headers: corsHeaders })
      const responses = sanitizeAnswers(body.responses)
      const patientName = text(responses.full_name, 200).replace(/\s+/g, ' ')
      const contactEmail = text(responses.email, 254).toLowerCase()
      const contactPhone = text(responses.phone, 40)
      const signedName = text(responses.signed_name, 200).replace(/\s+/g, ' ')
      if (!patientName || signedName !== patientName || !validCpf(text(responses.cpf, 20)) || contactEmail !== user.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail) || !/^\d{10,11}$/.test(contactPhone.replace(/\D/g, '')) || !text(responses.city, 120) || !/^(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)$/.test(text(responses.state, 2))) {
        return Response.json({ error: 'Confira os campos obrigatórios antes de salvar as alterações.' }, { status: 422, headers: corsHeaders })
      }
      responses.date_of_birth = record.birth_date
      const { error: historyError } = await admin.from('psychological_anamnesis_revisions').insert({ submission_id: record.id, previous_responses: record.responses, changed_by_user_id: user.id })
      if (historyError) throw historyError
      const { error } = await admin.from('psychological_anamnesis_submissions').update({
        responses, patient_name: patientName, contact_phone: contactPhone, signed_name: signedName,
        risk_review_required: isRiskReviewRequired(responses), updated_at: new Date().toISOString(),
      }).eq('id', record.id).eq('status', 'submitted').ilike('contact_email', escapeLike(user.email))
      if (error) throw error
      return Response.json({ saved: true, id: record.id }, { headers: corsHeaders })
    }

    if (body.action === 'draft-start') {
      if (!validBirthDate(body.birthDate)) return Response.json({ error: 'Informe uma data de nascimento válida.' }, { status: 422, headers: corsHeaders })
      if (ageAtDate(body.birthDate) < 18) return Response.json({ error: 'UNDER_18' }, { status: 422, headers: corsHeaders })
      const resumeKey = `${crypto.randomUUID()}${crypto.randomUUID()}`
      const { error } = await admin.from('psychological_anamnesis_submissions').insert({ draft_key_hash: await hashKey(resumeKey), birth_date: body.birthDate })
      if (error) throw error
      return Response.json({ resumeKey }, { headers: corsHeaders })
    }

    if (body.action === 'draft-load' || body.action === 'draft-save' || body.action === 'public-submit') {
      const resumeKey = text(body.resumeKey, 100)
      if (!/^[0-9a-f-]{70,80}$/i.test(resumeKey)) return Response.json({ error: 'Chave de retomada inválida.' }, { status: 400, headers: corsHeaders })
      const keyHash = await hashKey(resumeKey)
      const { data: draft, error: draftError } = await admin.from('psychological_anamnesis_submissions').select('id,status,birth_date,responses').eq('draft_key_hash', keyHash).maybeSingle()
      if (draftError) throw draftError
      if (!draft || draft.status !== 'draft') return Response.json({ error: 'Rascunho indisponível ou já enviado.' }, { status: 404, headers: corsHeaders })

      if (body.action === 'draft-load') return Response.json({ birthDate: draft.birth_date, responses: draft.responses }, { headers: corsHeaders })

      const responses = sanitizeAnswers(body.responses)
      if (text(responses.full_name).length > 200) return Response.json({ error: 'O nome completo excede o limite permitido.' }, { status: 422, headers: corsHeaders })
      const patientName = text(responses.full_name, 200).replace(/\s+/g, ' ')
      const contactEmail = text(responses.email, 254).toLowerCase()
      const contactPhone = text(responses.phone, 40)
      const riskReview = isRiskReviewRequired(responses)

      if (body.action === 'draft-save') {
        const { error } = await admin.from('psychological_anamnesis_submissions').update({
          responses,
          patient_name: patientName || null,
          contact_email: contactEmail || null,
          contact_phone: contactPhone || null,
          risk_review_required: riskReview,
          updated_at: new Date().toISOString(),
        }).eq('id', draft.id).eq('status', 'draft')
        if (error) throw error
        return Response.json({ savedAt: new Date().toISOString() }, { headers: corsHeaders })
      }

      const consent = body.consent
      const signedName = text(consent?.signedName, 200).replace(/\s+/g, ' ')
      if (consent?.accepted !== true || !signedName || signedName !== patientName || ageAtDate(draft.birth_date) < 18) {
        return Response.json({ error: 'Confirme a ciência do termo e assine com o mesmo nome completo informado na identificação.' }, { status: 422, headers: corsHeaders })
      }
      if (!patientName || !validBirthDate(draft.birth_date) || !validCpf(text(responses.cpf, 20)) || !contactEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail) || !/^\d{10,11}$/.test(contactPhone.replace(/\D/g, '')) || !text(responses.city, 120) || !/^(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)$/.test(text(responses.state, 2))) {
        return Response.json({ error: 'Complete os campos obrigatórios de identificação com valores válidos.' }, { status: 422, headers: corsHeaders })
      }
      const now = new Date().toISOString()
      const { data: submitted, error } = await admin.from('psychological_anamnesis_submissions').update({
        responses,
        patient_name: patientName,
        contact_email: contactEmail || null,
        contact_phone: contactPhone || null,
        risk_review_required: riskReview,
        status: 'submitted',
        signed_name: signedName,
        consent_version: text(consent?.version, 80) || consentVersion,
        consented_at: now,
        submitted_at: now,
        updated_at: now,
      }).eq('id', draft.id).eq('status', 'draft').select('id').maybeSingle()
      if (error) throw error
      if (!submitted) return Response.json({ error: 'Esta ficha já foi enviada.' }, { status: 409, headers: corsHeaders })
      return Response.json({ received: true, id: submitted.id }, { headers: corsHeaders })
    }

    if (!await authorizedStaff(req, admin)) return new Response('Unauthorized', { status: 401, headers: corsHeaders })
    if (body.action === 'admin-list') {
      const { data, error } = await admin.from('psychological_anamnesis_submissions')
        .select('id,status,birth_date,patient_name,contact_email,contact_phone,risk_review_required,submitted_at,created_at')
        .eq('status', 'submitted').order('submitted_at', { ascending: false })
      if (error) throw error
      return Response.json({ submissions: data ?? [] }, { headers: corsHeaders })
    }
    if (body.action === 'admin-detail') {
      const id = text(body.id, 64)
      if (!/^[0-9a-f-]{36}$/i.test(id)) return Response.json({ error: 'Ficha inválida.' }, { status: 400, headers: corsHeaders })
      const { data, error } = await admin.from('psychological_anamnesis_submissions')
        .select('id,birth_date,patient_name,contact_email,contact_phone,responses,risk_review_required,signed_name,consent_version,consented_at,submitted_at')
        .eq('id', id).eq('status', 'submitted').maybeSingle()
      if (error) throw error
      if (!data) return Response.json({ error: 'Ficha não encontrada.' }, { status: 404, headers: corsHeaders })
      return Response.json({ submission: data }, { headers: corsHeaders })
    }
    return Response.json({ error: 'Ação inválida.' }, { status: 400, headers: corsHeaders })
  } catch (error) {
    console.error('[psychological-anamnesis] request failed', error instanceof Error ? error.message : 'Unknown error')
    return Response.json({ error: 'Não foi possível processar a solicitação.' }, { status: 500, headers: corsHeaders })
  }
})
