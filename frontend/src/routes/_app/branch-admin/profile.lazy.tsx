import BranchProfile from '@/pages/org/BranchProfile';
import {createLazyFileRoute} from '@tanstack/react-router';

export const Route = createLazyFileRoute('/_app/branch-admin/profile')({
  component: BranchProfile,
});
