import AdminList from '@/pages/org/AdminList';
import {createLazyFileRoute} from '@tanstack/react-router';

export const Route = createLazyFileRoute('/_app/super-admin/admins/')({
  component: AdminList,
});
