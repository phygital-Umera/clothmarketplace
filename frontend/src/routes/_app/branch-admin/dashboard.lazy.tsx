import ScopedDashboard from '@/pages/dashboards/ScopedDashboard';
import {createLazyFileRoute} from '@tanstack/react-router';

export const Route = createLazyFileRoute('/_app/branch-admin/dashboard')({
  component: () => <ScopedDashboard panel="branch-admin" />,
});
