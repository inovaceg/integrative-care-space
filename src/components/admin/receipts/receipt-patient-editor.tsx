import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useAuth } from '@/components/auth/auth-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { fetchPatient, updatePatient, type PatientInput, type PatientRecord } from '@/lib/admin/records';

const fields: { key: keyof PatientInput; label: string; type?: string; maxLength?: number }[] = [
  { key: 'nome', label: 'Nome completo *' },
  { key: 'cpf', label: 'CPF (opcional)' },
  { key: 'data_nascimento', label: 'Data de nascimento', type: 'date' },
  { key: 'nome_social', label: 'Nome social' },
  { key: 'email', label: 'E-mail', type: 'email' },
  { key: 'telefone', label: 'Telefone', type: 'tel' },
  { key: 'endereco', label: 'Endereço' },
  { key: 'numero', label: 'Número' },
  { key: 'complemento', label: 'Complemento' },
  { key: 'cidade', label: 'Cidade' },
  { key: 'estado', label: 'Estado', maxLength: 2 },
  { key: 'cep', label: 'CEP' },
];

export function ReceiptPatientEditor({ patientId, onClose, onSaved }: { patientId: string; onClose: () => void; onSaved: (patient: PatientRecord) => void }) {
  const { user } = useAuth();
  const [form, setForm] = useState<PatientInput | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const lock = useRef(false);

  useEffect(() => {
    if (!user) return;
    let active = true;
    setLoading(true); setError(''); setForm(null);
    fetchPatient(user.id, patientId).then(({ data, error }) => {
      if (error || !data) throw new Error();
      if (!active) return;
      setForm({
        nome: data.nome, cpf: data.cpf, data_nascimento: data.data_nascimento,
        email: data.email, telefone: data.telefone, status: data.status,
        cidade_estado: data.cidade_estado, cep: data.cep, endereco: data.endereco,
        numero: data.numero, complemento: data.complemento, cidade: data.cidade,
        estado: data.estado, nome_social: data.nome_social, genero: data.genero,
        pronomes: data.pronomes, como_conheceu: data.como_conheceu,
      });
    }).catch(() => { if (active) setError('Não foi possível carregar o cadastro do paciente. Tente novamente.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user?.id, patientId, retry]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (!user || !form || lock.current) return;
    if (!form.nome.trim()) { setError('Informe o nome completo do paciente.'); return; }
    lock.current = true; setSaving(true); setError('');
    try {
      const { data, error } = await updatePatient(user.id, patientId, { ...form, nome: form.nome.trim(), cpf: form.cpf?.trim() || null });
      if (error || !data) throw new Error();
      onSaved(data as PatientRecord);
    } catch { setError('Não foi possível salvar as alterações. Confira sua conexão e tente novamente.'); }
    finally { lock.current = false; setSaving(false); }
  }

  return <Dialog open onOpenChange={open => { if (!open && !lock.current) onClose(); }}>
    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
      <DialogHeader><DialogTitle>Alterar cadastro do paciente</DialogTitle><DialogDescription>As alterações serão salvas no cadastro do paciente. O recibo em preenchimento será preservado e o CPF continua opcional.</DialogDescription></DialogHeader>
      {loading && <p role="status" className="text-sm text-slate-500">Carregando cadastro...</p>}
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {!loading && !form && <Button variant="outline" onClick={() => setRetry(value => value + 1)}>Tentar novamente</Button>}
      {form && <form onSubmit={save} className="space-y-5">
        <fieldset disabled={saving} className="grid gap-4 sm:grid-cols-2">
          {fields.map(field => <div key={field.key} className="space-y-2"><Label htmlFor={`receipt-edit-${field.key}`}>{field.label}</Label><Input id={`receipt-edit-${field.key}`} type={field.type ?? 'text'} maxLength={field.maxLength} required={field.key === 'nome'} value={form[field.key] ?? ''} onChange={event => { const value = field.key === 'estado' ? event.target.value.toUpperCase() : event.target.value; setForm(current => current ? { ...current, [field.key]: value || (field.key === 'nome' ? '' : null) } : current); }} /></div>)}
          <div className="space-y-2"><Label htmlFor="receipt-edit-status">Status</Label><select id="receipt-edit-status" className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm" value={form.status ?? 'pendente'} onChange={event => setForm(current => current ? { ...current, status: event.target.value } : current)}><option value="pendente">Pendente</option><option value="ativo">Ativo</option><option value="inativo">Inativo</option></select></div>
        </fieldset>
        <DialogFooter><Button type="button" variant="outline" disabled={saving} onClick={onClose}>Cancelar</Button><Button type="submit" disabled={saving} className="bg-[#2f8f82] hover:bg-[#26796e]">{saving ? 'Salvando...' : 'Salvar alterações'}</Button></DialogFooter>
      </form>}
    </DialogContent>
  </Dialog>;
}
