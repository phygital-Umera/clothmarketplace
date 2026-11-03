import {ResetPassword} from '@/pages';
import {createFileRoute} from '@tanstack/react-router';

export const Route = createFileRoute('/_auth/reset-password')({
  validateSearch: (search: Record<string, unknown>): {token?: string} => ({
    token: typeof search.token === 'string' ? search.token : undefined,
  }),
  component: ResetPassword,
});
