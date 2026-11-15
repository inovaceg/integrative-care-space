import { createFileRoute } from '@tanstack/react-router';
import NeuropsychReportsPage from '@/components/admin/neuropsych-reports-page';

export const Route = createFileRoute('/admin/laudos-neuropsicologicos')({
  head: () => ({ meta: [{ title: 'Laudos Neuropsicológicos | Área Administrativa' }, { name: 'robots', content: 'noindex, nofollow' }] }),
  component: NeuropsychReportsPage,
});
