import { supabase } from '@/integrations/supabase/client'

export type PsychologicalAnswers = Record<string, string | number | boolean | string[]>
export type AnamnesisSubmission = {
  id: string
  status?: 'submitted'
  birth_date: string
  patient_name: string | null
  contact_email: string | null
  contact_phone: string | null
  risk_review_required: boolean
  submitted_at: string | null
  created_at: string
  responses?: PsychologicalAnswers
  signed_name?: string | null
  consent_version?: string | null
  consented_at?: string | null
}

async function invoke<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('psychological-anamnesis', { body })
  if (error) throw error
  return data as T
}

export async function startPsychologicalAnamnesis(birthDate: string) {
  return invoke<{ resumeKey: string }>({ action: 'draft-start', birthDate })
}

export async function loadPsychologicalAnamnesis(resumeKey: string) {
  return invoke<{ birthDate: string; responses: PsychologicalAnswers }>({ action: 'draft-load', resumeKey })
}

export async function savePsychologicalAnamnesis(resumeKey: string, responses: PsychologicalAnswers) {
  return invoke<{ savedAt: string }>({ action: 'draft-save', resumeKey, responses })
}

export async function submitPsychologicalAnamnesis(resumeKey: string, responses: PsychologicalAnswers, signedName: string) {
  return invoke<{ received: true }>({ action: 'public-submit', resumeKey, responses, consent: { accepted: true, signedName } })
}

export async function listPsychologicalAnamneses() {
  return invoke<{ submissions: AnamnesisSubmission[] }>({ action: 'admin-list' })
}

export async function getPsychologicalAnamnesis(id: string) {
  return invoke<{ submission: AnamnesisSubmission }>({ action: 'admin-detail', id })
}
