import {ChangePassword} from '@/pages';
import {createLazyFileRoute} from '@tanstack/react-router';

export const Route = createLazyFileRoute('/_app/change-password')({
  component: ChangePassword,
});
