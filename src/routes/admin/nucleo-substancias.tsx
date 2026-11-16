import { createFileRoute } from '@tanstack/react-router';
import { SubstanceScreeningsPage } from '@/components/admin/substance-screenings-page';

export const Route = createFileRoute('/admin/nucleo-substancias')({ component: SubstanceScreeningsPage });
