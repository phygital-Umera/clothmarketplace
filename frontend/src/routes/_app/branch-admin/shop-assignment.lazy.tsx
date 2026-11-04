import BranchShopAssignmentPage from '@/pages/branch/BranchShopAssignmentPage';
import {createLazyFileRoute} from '@tanstack/react-router';

export const Route = createLazyFileRoute('/_app/branch-admin/shop-assignment')({
  component: BranchShopAssignmentPage,
});
