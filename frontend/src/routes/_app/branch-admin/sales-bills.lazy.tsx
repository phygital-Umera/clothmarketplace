import BranchSalesBillsPage from '@/pages/branch/BranchSalesBillsPage';
import {createLazyFileRoute} from '@tanstack/react-router';

export const Route = createLazyFileRoute('/_app/branch-admin/sales-bills')({
  component: BranchSalesBillsPage,
});
