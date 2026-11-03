import {AccountDashboard} from '@/pages/dashboards';
import {createLazyFileRoute} from '@tanstack/react-router';

export const Route = createLazyFileRoute('/_app/account')({
  component: () => <AccountDashboard title="My account" />,
});
