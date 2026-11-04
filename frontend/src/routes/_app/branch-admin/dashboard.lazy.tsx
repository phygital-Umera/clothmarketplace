import BranchDashboardPage from '@/pages/branch/BranchDashboardPage';
import {createLazyFileRoute} from '@tanstack/react-router';

export const Route = createLazyFileRoute('/_app/branch-admin/dashboard')({
  component: BranchDashboardPage,
});
