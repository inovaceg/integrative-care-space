import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { displayDate } from '@/lib/admin/documents';
import { receiptMoney, type Receipt } from '@/lib/admin/receipts';

export function ReceiptHistory({ receipts, busy, onView, onFinalize }: { receipts: Receipt[]; busy: boolean; onView: (receipt: Receipt) => void; onFinalize: (receipt: Receipt) => void }) {
  if (!receipts.length) return <p className="py-6 text-center text-sm text-slate-500">Nenhum recibo encontrado.</p>;
  return <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b text-slate-500"><tr>{['Recibo / paciente', 'Pagamento', 'Área', 'Valor', 'Situação', 'Ações'].map(title => <th key={title} className="p-3 font-medium">{title}</th>)}</tr></thead><tbody>{receipts.map(receipt => <tr key={receipt.id} className="border-b border-slate-100">
    <td className="p-3"><p className="font-medium">{receipt.receipt_number}</p><p>{receipt.patient_name}</p><p className="text-xs text-slate-500">Emitido em {displayDate(receipt.issue_date)}</p></td>
    <td className="p-3"><p>{displayDate(receipt.payment_date ?? '') || 'Não informada'}</p><p className="text-xs text-slate-500">{receipt.payment_method}</p></td>
    <td className="p-3">{receipt.professional_area}</td><td className="whitespace-nowrap p-3">{receiptMoney(receipt.amount)}</td>
    <td className="p-3"><Badge variant="secondary">{receipt.status === 'FINALIZADO' ? 'Finalizado' : receipt.status === 'CANCELADO' ? 'Cancelado' : 'Rascunho'}</Badge></td>
    <td className="p-3"><div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" disabled={busy} onClick={() => onView(receipt)}>Visualizar / PDF / Imprimir</Button>{receipt.status === 'RASCUNHO' && <Button size="sm" disabled={busy} onClick={() => onFinalize(receipt)}>Finalizar</Button>}</div></td>
  </tr>)}</tbody></table></div>;
}
