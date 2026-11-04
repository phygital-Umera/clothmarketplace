import BranchSuppliersPage from '@/pages/branch/BranchSuppliersPage';
import {createLazyFileRoute} from '@tanstack/react-router';

export const Route = createLazyFileRoute('/_app/branch-admin/suppliers')({
  component: BranchSuppliersPage,
});
