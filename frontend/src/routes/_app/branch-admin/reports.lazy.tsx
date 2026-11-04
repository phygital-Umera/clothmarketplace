import BranchReportsPage from '@/pages/branch/BranchReportsPage';
import {createLazyFileRoute} from '@tanstack/react-router';

export const Route = createLazyFileRoute('/_app/branch-admin/reports')({
  component: BranchReportsPage,
});
