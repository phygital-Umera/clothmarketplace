import UserList from '@/pages/org/UserList';
import {createLazyFileRoute} from '@tanstack/react-router';

export const Route = createLazyFileRoute('/_app/super-admin/users')({
  component: UserList,
});
