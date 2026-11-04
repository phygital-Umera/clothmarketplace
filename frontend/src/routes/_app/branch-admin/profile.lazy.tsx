import BranchProfileSetupPage from '@/pages/branch/BranchProfileSetupPage';
import {createLazyFileRoute} from '@tanstack/react-router';

export const Route = createLazyFileRoute('/_app/branch-admin/profile')({
  component: BranchProfileSetupPage,
});
