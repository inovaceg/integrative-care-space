import { createFileRoute } from '@tanstack/react-router';
import ReceituarioPage from '@/components/admin/documents/receituario-page';

export const Route = createFileRoute('/admin/receituario')({
  head: () => ({ meta: [{ title: 'Receituário | Área Administrativa' }, { name: 'robots', content: 'noindex, nofollow' }] }),
  component: ReceituarioPage,
});
