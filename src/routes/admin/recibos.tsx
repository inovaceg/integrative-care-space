import { createFileRoute } from '@tanstack/react-router';
import ReceiptsPage from '@/components/admin/receipts/receipts-page';

export const Route = createFileRoute('/admin/recibos')({
  head: () => ({ meta: [{ title: 'Recibos | Área Administrativa' }, { name: 'robots', content: 'noindex, nofollow' }] }),
  component: ReceiptsPage,
});
