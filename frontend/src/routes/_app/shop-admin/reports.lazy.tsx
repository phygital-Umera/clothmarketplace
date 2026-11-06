import BranchReportsPage from '@/pages/branch/BranchReportsPage';
import {createLazyFileRoute} from '@tanstack/react-router';

export const Route = createLazyFileRoute('/_app/shop-admin/reports')({
  component: () => <BranchReportsPage panel="shop-admin" />,
});

