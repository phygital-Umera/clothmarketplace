import {ForgotPassword} from '@/pages';
import {createFileRoute} from '@tanstack/react-router';

export const Route = createFileRoute('/_auth/forgot-password')({
  component: ForgotPassword,
});
