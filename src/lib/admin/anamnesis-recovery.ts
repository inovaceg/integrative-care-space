import { createClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { PsychologicalAnswers } from '@/lib/admin/psychological-anamnesis';

const recoveryAuth = createClient('https://fusqpjescampwoyazceu.supabase.co', 'sb_publishable_g7UiDq4z1OWmThE52EZNbQ_aKSUfA1x', {
  auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
});

type LookupType = 'cpf' | 'name';

async function invoke<T>(body: Record<string, unknown>, accessToken?: string): Promise<T> {
  const { data, error } = await supabase.functions.invoke('psychological-anamnesis', {
    body,
    ...(accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {}),
  });
  if (error) throw error;
  return data as T;
}

export function requestAnamnesisEditCode(lookupType: LookupType, lookupValue: string, email: string) {
  return invoke<{ sent: true; message: string }>({ action: 'edit-code-request', lookupType, lookupValue, email });
}

export async function verifyAnamnesisEditCode(email: string, token: string) {
  const { data, error } = await recoveryAuth.auth.verifyOtp({ email, token, type: 'email' });
  if (error || !data.session) throw error ?? new Error('Não foi possível confirmar o código.');
  return data.session.access_token;
}

export function recoverAnamnesisForEdit(lookupType: LookupType, lookupValue: string, accessToken: string) {
  return invoke<{ submission: { id: string; birth_date: string; responses: PsychologicalAnswers } }>({
    action: 'edit-recover', lookupType, lookupValue,
  }, accessToken);
}

export function saveAnamnesisEdit(id: string, responses: PsychologicalAnswers, accessToken: string) {
  return invoke<{ saved: true; id: string }>({ action: 'edit-save', id, responses }, accessToken);
}
