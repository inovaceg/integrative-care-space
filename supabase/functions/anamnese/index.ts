import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const termVersion = 'anamnese-v1'

type Answers = Record<string, unknown>

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || 'Paciente'
}

function text(value: unknown, max = 5000) {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

function integer(value: unknown) {
  const number = Number(value)
  return Number.isInteger(number) && number >= 0 && number <= 10 ? number : null
}

function requiredAnswers(answers: Answers) {
  return text(answers.motivo_atendimento) && text(answers.modalidade) && text(answers.inicio_queixa) && text(answers.impacto_vida) && text(answers.expectativa_tratamento)
}

function hasCurrentRisk(answers: Answers) {
  return answers.pensamentos_morte === 'Sim, neste momento' || answers.pensamentos_presentes_agora === 'Sim'
}

function sanitizeAnswers(input: unknown): Answers {
  const source = input && typeof input === 'object' && !Array.isArray(input) ? input as Answers : {}
  const result: Answers = {}
  for (const [key, value] of Object.entries(source)) {
    if (typeof value === 'string') result[key] = text(value)
    else if (typeof value === 'boolean') result[key] = value
    else if (typeof value === 'number' && Number.isFinite(value)) result[key] = value
    else if (Array.isArray(value)) result[key] = value.filter(item => typeof item === 'string').map(item => text(item, 120)).filter(Boolean).slice(0, 30)
    else if (value && typeof value === 'object') result[key] = value
  }
  return result
}

async function adminUser(req: Request, admin: ReturnType<typeof createClient>) {
  const header = req.headers.get('Authorization')
  if (!header?.startsWith('Bearer ')) return null
  const { data: { user } } = await admin.auth.getUser(header.slice(7))
  if (!user) return null
  const { data: role } = await admin.from('user_roles').select('role').eq('user_id', user.id).maybeSingle()
  return role?.role === 'doctor' || role?.role === 'admin' ? user : null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  try {
    const body = await req.json()
    const action = body.action
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    if (action === 'public-load') {
      const token = text(body.token, 64)
      const { data: patient } = await admin.from('pacientes').select('id,nome,token_expira_em').eq('token_anamnese', token).maybeSingle()
      if (!patient || !patient.token_expira_em || new Date(patient.token_expira_em) <= new Date()) return Response.json({ error: 'LINK_INVALIDO' }, { status: 404, headers: corsHeaders })
      const { data: latest } = await admin.from('anamneses').select('respostas,updated_at,preenchido_em').eq('paciente_id', patient.id).order('created_at', { ascending: false }).limit(1).maybeSingle()
      if (latest?.preenchido_em) return Response.json({ error: 'LINK_UTILIZADO' }, { status: 409, headers: corsHeaders })
      return Response.json({ firstName: firstName(patient.nome), expiresAt: patient.token_expira_em, answers: latest?.respostas ?? {}, savedAt: latest?.updated_at ?? null }, { headers: corsHeaders })
    }

    if (action === 'public-save' || action === 'public-submit') {
      const token = text(body.token, 64)
      const answers = sanitizeAnswers(body.answers)
      const { data: patient } = await admin.from('pacientes').select('id,profissional_id,token_expira_em').eq('token_anamnese', token).maybeSingle()
      if (!patient || !patient.token_expira_em || new Date(patient.token_expira_em) <= new Date()) return Response.json({ error: 'LINK_INVALIDO' }, { status: 404, headers: corsHeaders })
      const { data: existing } = await admin.from('anamneses').select('id,preenchido_em').eq('paciente_id', patient.id).order('created_at', { ascending: false }).limit(1).maybeSingle()
      if (existing?.preenchido_em) return Response.json({ error: 'LINK_UTILIZADO' }, { status: 409, headers: corsHeaders })
      const base = {
        paciente_id: patient.id, profissional_id: patient.profissional_id, respostas: answers, updated_at: new Date().toISOString(),
        queixa_principal: text(answers.motivo_atendimento), quando_comecou: text(answers.inicio_queixa),
        expectativas_tratamento: text(answers.expectativa_tratamento), preferencia_modalidade: text(answers.modalidade),
        doencas_fisicas: text(answers.doencas_detalhes), cirurgias: text(answers.cirurgias_detalhes),
        alergias: text(answers.alergias_detalhes), medicamentos_atuais: text(answers.medicamentos_detalhes),
        alimentacao: text(answers.alimentacao), qualidade_sono: text(answers.sono), atividade_fisica: text(answers.atividade_fisica_detalhes),
        uso_substancias: text(answers.substancias_detalhes), sintomas_checklist: answers.sintomas ?? [],
        escala_ansiedade: integer(answers.escala_ansiedade), escala_tristeza: integer(answers.escala_tristeza),
        pensamentos_morte_atual: text(answers.pensamentos_morte), pensamentos_suicidas: hasCurrentRisk(answers),
        planejamento_suicida_bool: answers.planejamento === 'Sim', acesso_meios: answers.acesso_meios === 'Sim',
        fatores_impeditivos: text(answers.fatores_impeditivos), rede_apoio_quem: text(answers.rede_apoio_nome),
        traumas_detalhes: text(answers.traumas_detalhes), relacionamentos_familiares: text(answers.relacionamentos),
        dificuldades_sexuais: text(answers.sexualidade_detalhes), vida_profissional: text(answers.vida_profissional),
        pratica_espiritual: text(answers.espiritualidade_detalhes), observacoes_adicionais: text(answers.observacoes_finais),
      }
      if (action === 'public-save') {
        const { error } = existing ? await admin.from('anamneses').update(base).eq('id', existing.id) : await admin.from('anamneses').insert(base)
        if (error) throw error
        return Response.json({ savedAt: new Date().toISOString() }, { headers: corsHeaders })
      }
      const consent = body.consent ?? {}
      if (!requiredAnswers(answers) || consent.truth !== true || consent.lgpd !== true || consent.urgent !== true || !text(consent.signature, 200)) return Response.json({ error: 'CAMPOS_OBRIGATORIOS' }, { status: 422, headers: corsHeaders })
      const completed = { ...base, preenchido_em: new Date().toISOString(), lgpd_consentimento: true, lgpd_data_consentimento: new Date().toISOString(), declaracao_veracidade: true, ciencia_urgencia: true, assinatura_eletronica: text(consent.signature, 200), termo_versao: termVersion, autorizacao_foto_prontuario: consent.clinicalPhoto === true, autorizacao_divulgacao_imagem: consent.publicPhoto === true }
      const { error } = existing ? await admin.from('anamneses').update(completed).eq('id', existing.id).is('preenchido_em', null) : await admin.from('anamneses').insert(completed)
      if (error) throw error
      return Response.json({ completedAt: completed.preenchido_em }, { headers: corsHeaders })
    }

    const user = await adminUser(req, admin)
    if (!user) return new Response('Unauthorized', { status: 401, headers: corsHeaders })
    const patientId = text(body.patientId, 64)
    const { data: patient } = await admin.from('pacientes').select('id,nome,telefone,token_anamnese,token_expira_em,profissional_id').eq('id', patientId).eq('profissional_id', user.id).maybeSingle()
    if (!patient) return new Response('Not found', { status: 404, headers: corsHeaders })
    if (action === 'admin-status') {
      const { data: anamnese } = await admin.from('anamneses').select('*').eq('paciente_id', patient.id).eq('profissional_id', user.id).order('updated_at', { ascending: false }).limit(1).maybeSingle()
      return Response.json({ patient, anamnese }, { headers: corsHeaders })
    }
    if (action === 'admin-generate') {
      const token = crypto.randomUUID(); const expiresAt = new Date(Date.now() + 7 * 86400000).toISOString()
      const { error } = await admin.from('pacientes').update({ token_anamnese: token, token_expira_em: expiresAt }).eq('id', patient.id).eq('profissional_id', user.id)
      if (error) throw error
      const { error: draftError } = await admin.from('anamneses').insert({ paciente_id: patient.id, profissional_id: user.id, link_gerado_em: new Date().toISOString() })
      if (draftError) throw draftError
      return Response.json({ token, expiresAt }, { headers: corsHeaders })
    }
    if (action === 'admin-invalidate') {
      const { error } = await admin.from('pacientes').update({ token_anamnese: null, token_expira_em: null }).eq('id', patient.id).eq('profissional_id', user.id)
      if (error) throw error
      return Response.json({ ok: true }, { headers: corsHeaders })
    }
    return new Response('Bad request', { status: 400, headers: corsHeaders })
  } catch (error) {
    console.error('[anamnese] request failed', error instanceof Error ? error.message : 'unknown')
    return new Response('Internal server error', { status: 500, headers: corsHeaders })
  }
})
