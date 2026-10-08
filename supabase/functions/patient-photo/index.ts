import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const bucket = 'patient-avatars'
const reply = (body: Record<string, unknown>, status = 200) => Response.json(body, { status, headers: corsHeaders })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  if (req.method !== 'POST') return reply({ error: 'Método não permitido.' }, 405)
  try {
    if (Number(req.headers.get('content-length')) > 3 * 1024 * 1024) return reply({ error: 'Foto muito grande.' }, 413)
    const form = await req.formData()
    const token = form.get('token')
    const photo = form.get('photo')
    if (typeof token !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)) return reply({ error: 'Link inválido ou expirado.' }, 403)
    if (!(photo instanceof File) || photo.type !== 'image/jpeg' || photo.size < 4 || photo.size > 2 * 1024 * 1024) return reply({ error: 'Envie uma foto JPEG de até 2 MB.' }, 400)
    const bytes = new Uint8Array(await photo.arrayBuffer())
    if (bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) return reply({ error: 'Imagem inválida.' }, 400)
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    // This public endpoint is authorized by the expiring registration token, never by a caller-supplied patient ID.
    const { data: patient, error: lookupError } = await admin.from('pacientes')
      .select('id,profissional_id,avatar_url').eq('token_anamnese', token)
      .gt('token_expira_em', new Date().toISOString()).maybeSingle()
    if (lookupError) throw lookupError
    if (!patient) return reply({ error: 'Link inválido ou expirado.' }, 403)
    const path = `${patient.profissional_id}/${crypto.randomUUID()}.jpg`
    const { error: uploadError } = await admin.storage.from(bucket).upload(path, bytes, { contentType: 'image/jpeg' })
    if (uploadError) throw uploadError
    const { data: updated, error: updateError } = await admin.from('pacientes')
      .update({ avatar_url: path, updated_at: new Date().toISOString() })
      .eq('id', patient.id).eq('token_anamnese', token).gt('token_expira_em', new Date().toISOString())
      .select('id').maybeSingle()
    if (updateError || !updated) {
      await admin.storage.from(bucket).remove([path])
      if (updateError) throw updateError
      return reply({ error: 'Link inválido ou expirado.' }, 403)
    }
    console.info('[patient-photo] Photo saved')
    return reply({ ok: true })
  } catch (error) {
    console.error('[patient-photo] Upload failed', { message: error instanceof Error ? error.message : 'Storage or database error' })
    return reply({ error: 'Não foi possível salvar a foto. Tente novamente.' }, 500)
  }
})
