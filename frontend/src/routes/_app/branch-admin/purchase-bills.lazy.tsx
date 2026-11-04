import BranchPurchaseBillsPage from '@/pages/branch/BranchPurchaseBillsPage';
import {createLazyFileRoute} from '@tanstack/react-router';

export const Route = createLazyFileRoute('/_app/branch-admin/purchase-bills')({
  component: BranchPurchaseBillsPage,
});
