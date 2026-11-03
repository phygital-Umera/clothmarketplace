import {SuperAdminDashboard} from '@/pages/dashboards';
import {createLazyFileRoute} from '@tanstack/react-router';

export const Route = createLazyFileRoute('/_app/super-admin/dashboard')({
  component: SuperAdminDashboard,
});
