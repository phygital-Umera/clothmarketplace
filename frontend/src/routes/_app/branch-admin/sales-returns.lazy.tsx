import BranchSalesReturnsPage from '@/pages/branch/BranchSalesReturnsPage';
import {createLazyFileRoute} from '@tanstack/react-router';

export const Route = createLazyFileRoute('/_app/branch-admin/sales-returns')({
  component: BranchSalesReturnsPage,
});
