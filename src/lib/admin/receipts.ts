import { supabase } from '@/integrations/supabase/client';
import { professionalAreas, professionalDocumentFooter, professionalName, today } from './documents';
import { fetchPatient } from './records';

export type ReceiptArea = 'Psicologia' | 'Biomedicina';
export type Receipt = {
  id: string;
  user_id: string;
  receipt_number: string;
  patient_id: string | null;
  patient_name: string;
  patient_cpf: string;
  professional_area: ReceiptArea;
  professional_registration: string;
  professional_name: string;
  professional_title: string;
  city: string;
  footer: string;
  service_description: string;
  amount: number;
  payment_method: string;
  payment_date: string | null;
  issue_date: string;
  notes: string;
  status: 'RASCUNHO' | 'FINALIZADO' | 'CANCELADO';
  created_at: string;
};
export const paymentMethods = ['Pix', 'Dinheiro', 'Cartão de crédito', 'Cartão de débito', 'Transferência bancária', 'Cheque', 'Outro'];
export const receiptMoney = (value: number) => Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const receiptPageSize = 50;

export async function fetchReceipts(userId: string, offset = 0) {
  const { data, error } = await supabase.from('receipts').select('*').eq('user_id', userId)
    .order('created_at', { ascending: false }).order('id').range(offset, offset + receiptPageSize - 1);
  if (error) throw error;
  return data as Receipt[];
}

export async function createReceiptDraft(userId: string, input: { patientId: string; area: ReceiptArea; amount: number; paymentDate: string; paymentMethod: string }) {
  if (!Number.isFinite(input.amount) || input.amount <= 0 || input.amount >= 1000000000) throw new Error('Informe um valor válido para a consulta.');
  const [patientResult, settingsResult] = await Promise.all([
    fetchPatient(userId, input.patientId),
    supabase.from('receipt_settings').select('*').eq('user_id', userId).maybeSingle(),
  ]);
  if (patientResult.error || settingsResult.error) throw new Error('Não foi possível consultar os dados do paciente ou do profissional.');
  const patient = patientResult.data;
  if (!patient?.nome?.trim()) throw new Error('Preencha o nome no cadastro do paciente antes de emitir o recibo.');
  const settings = settingsResult.data;
  const psychology = input.area === 'Psicologia';
  const identity = professionalAreas[psychology ? 'psicologia' : 'biomedicina'];
  const { data, error } = await supabase.from('receipts').insert({
    user_id: userId,
    patient_id: patient.id,
    patient_name: patient.nome,
    patient_cpf: patient.cpf?.trim() || '',
    professional_area: input.area,
    professional_name: settings?.professional_name || professionalName,
    professional_title: (psychology ? settings?.psychology_title : settings?.biomedicine_title) || identity.title,
    professional_registration: (psychology ? settings?.psychology_registration : settings?.biomedicine_registration) || identity.registration,
    city: settings?.city || 'Juiz de Fora – MG',
    footer: settings?.footer || professionalDocumentFooter,
    service_description: `Consulta de ${input.area}`,
    amount: input.amount,
    payment_date: input.paymentDate,
    payment_method: input.paymentMethod,
    issue_date: today(),
    status: 'RASCUNHO',
  }).select('*').single();
  if (error) throw new Error('Não foi possível salvar o recibo. Verifique sua conexão e suas permissões.');
  return data as Receipt;
}

export async function finalizeReceipt(userId: string, id: string) {
  const { data, error } = await supabase.from('receipts').update({ status: 'FINALIZADO' })
    .eq('user_id', userId).eq('id', id).eq('status', 'RASCUNHO').select('*').single();
  if (error) throw new Error('O recibo permanece salvo como rascunho. Tente finalizar novamente pelo histórico.');
  return data as Receipt;
}
