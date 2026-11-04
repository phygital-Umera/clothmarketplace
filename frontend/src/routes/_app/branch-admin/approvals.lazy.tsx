import BranchApprovalsPage from '@/pages/branch/BranchApprovalsPage';
import {createLazyFileRoute} from '@tanstack/react-router';

export const Route = createLazyFileRoute('/_app/branch-admin/approvals')({
  component: BranchApprovalsPage,
});
