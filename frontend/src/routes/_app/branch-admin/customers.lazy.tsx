import BranchCustomerDuesPage from '@/pages/branch/BranchCustomerDuesPage';
import {createLazyFileRoute} from '@tanstack/react-router';

export const Route = createLazyFileRoute('/_app/branch-admin/customers')({
  component: BranchCustomerDuesPage,
});
