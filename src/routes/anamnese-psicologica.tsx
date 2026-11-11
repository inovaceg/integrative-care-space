import { createFileRoute } from '@tanstack/react-router';
import { PsychologicalAnamnesisForm } from '@/components/psychological-anamnesis-form';

export const Route = createFileRoute('/anamnese-psicologica')({
  head: () => ({ meta: [{ title: 'Anamnese Psicológica Digital | Dr. Frederick Parreira' }, { name: 'robots', content: 'noindex, nofollow' }] }),
  component: PsychologicalAnamnesisForm,
});
