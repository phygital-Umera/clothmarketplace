import ScopedDashboard from '@/pages/dashboards/ScopedDashboard';
import {createLazyFileRoute} from '@tanstack/react-router';

export const Route = createLazyFileRoute('/_app/company-admin/dashboard')({
  component: () => <ScopedDashboard panel="company-admin" />,
});
