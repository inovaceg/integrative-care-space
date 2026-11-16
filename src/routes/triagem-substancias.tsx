import { createFileRoute } from '@tanstack/react-router';
import { SubstanceScreeningForm } from '@/components/substance-screening-form';

export const Route = createFileRoute('/triagem-substancias')({
  head: () => ({ meta: [{ title: 'Triagem inicial sobre uso de substâncias | Dr. Frederick Parreira' }, { name: 'robots', content: 'noindex, nofollow' }] }),
  component: SubstanceScreeningForm,
});
