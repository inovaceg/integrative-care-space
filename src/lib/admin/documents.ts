import { supabase } from '@/integrations/supabase/client';

export const professionalName = 'Dr. Frederick Martins Parreira';
export const professionalAreas = {
  psicologia: { label: 'Psicologia', title: 'Psicólogo Clínico', registration: 'CRP 04/86194', types: ['Orientações ao Paciente', 'Documento Profissional'] },
  biomedicina: { label: 'Biomedicina', title: 'Biomédico Esteta e Integrativo', registration: 'CRBM 30421', types: ['Receituário', 'Solicitação de Exames', 'Orientações ao Paciente'] },
} as const;
export type ProfessionalArea = keyof typeof professionalAreas;
export type DocumentType = (typeof professionalAreas)[ProfessionalArea]['types'][number];
export type PrescriptionItem = { id: string; product: string; presentation: string; concentration: string; quantity: string; route: string; dosage: string; duration: string; notes: string };
export type ExamItem = { id: string; name: string; notes: string };
export interface DocumentContent {
  patient: { name: string; cpf: string; birthDate: string; phone: string; date: string };
  mode: 'structured' | 'free';
  items: PrescriptionItem[];
  exams: ExamItem[];
  text: string;
  guidance: string;
  clinicalNotes: string;
  footer: string;
}
export interface ProfessionalDocument {
  id: string;
  user_id: string;
  area: ProfessionalArea;
  document_type: DocumentType;
  patient_name: string;
  attendance_date: string;
  content: DocumentContent;
  status: 'Rascunho' | 'Finalizado';
  created_at: string;
  updated_at: string;
}
export function today() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export const displayDate = (date: string) => date ? date.split('-').reverse().join('/') : '';
export function emptyContent(footer = ''): DocumentContent {
  return { patient: { name: '', cpf: '', birthDate: '', phone: '', date: today() }, mode: 'structured', items: [], exams: [], text: '', guidance: '', clinicalNotes: '', footer };
}
export function emptyItem(): PrescriptionItem {
  return { id: crypto.randomUUID(), product: '', presentation: '', concentration: '', quantity: '', route: '', dosage: '', duration: '', notes: '' };
}
export async function getDocuments(): Promise<ProfessionalDocument[]> {
  const { data, error } = await supabase.from('professional_documents').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data as ProfessionalDocument[];
}
export async function saveDocument(area: ProfessionalArea, type: DocumentType, content: DocumentContent, status: ProfessionalDocument['status'], id?: string): Promise<ProfessionalDocument> {
  const payload = { area, document_type: type, patient_name: content.patient.name.trim(), attendance_date: content.patient.date, content, status, updated_at: new Date().toISOString() };
  const query = id ? supabase.from('professional_documents').update(payload).eq('id', id) : supabase.from('professional_documents').insert(payload);
  const { data, error } = await query.select().single();
  if (error) throw error;
  return data as ProfessionalDocument;
}
export async function deleteDocument(id: string) {
  const { data, error } = await supabase.from('professional_documents').delete().eq('id', id).select('id').single();
  if (error || !data) throw error ?? new Error('Documento não encontrado.');
}
export async function getFooter(): Promise<string> {
  const { data, error } = await supabase.from('professional_document_settings').select('footer').maybeSingle();
  if (error) throw error;
  return data?.footer ?? '';
}
export async function saveFooter(footer: string, userId: string) {
  const { error } = await supabase.from('professional_document_settings').upsert({ user_id: userId, footer });
  if (error) throw error;
}
