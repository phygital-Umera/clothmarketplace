import BranchMyProfilePage from '@/pages/branch/BranchMyProfilePage';
import {createLazyFileRoute} from '@tanstack/react-router';

export const Route = createLazyFileRoute('/_app/branch-admin/my-profile')({
  component: BranchMyProfilePage,
});
