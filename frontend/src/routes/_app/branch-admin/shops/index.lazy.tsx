import BranchShopsPage from '@/pages/branch/BranchShopsPage';
import {createLazyFileRoute} from '@tanstack/react-router';

export const Route = createLazyFileRoute('/_app/branch-admin/shops/')({
  component: BranchShopsPage,
});
